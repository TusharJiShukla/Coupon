require("dotenv").config(); // Load environment variables from .env file
const express = require("express");
const mysql = require("mysql"); // MySQL for database operations
const cors = require("cors"); // Enable CORS for cross-origin requests
const cookieParser = require("cookie-parser"); // Parse cookies from incoming requests

const app = express();
app.use(cors({ origin: "http://localhost:3000", credentials: true })); // Allow requests from frontend
app.use(express.json()); // Parse JSON request bodies
app.use(cookieParser()); // Use cookie-parser middleware

// MySQL Connection
const db = mysql.createConnection({
    host: "127.0.0.1", // Database host
    user: "root", // Database user
    password: "Tusharji@1", // Database password
    database: "coupon_system", // Database name
});

db.connect(err => {
    if (err) throw err;
    console.log("Connected to MySQL"); // Log successful database connection
});

// Round-Robin Distribution Variables
let couponIndex = 0; // Tracks the current index for round-robin coupon distribution

// Function to check if the user can claim a coupon
const canClaimCoupon = (ip, cookie, callback) => {
    // Check if the user has claimed a coupon in the last hour
    db.query(
        "SELECT * FROM claims WHERE (ip = ? OR cookie = ?) AND TIMESTAMPDIFF(HOUR, timestamp, NOW()) < 1",
        [ip, cookie],
        (err, results) => {
            if (err) return callback(err, null);
            callback(null, results.length === 0); // Allow claim if no recent claims found
        }
    );
};

// Claim Coupon API
app.post("/claim-coupon", (req, res) => {
    const ip = req.ip; // Get user's IP address
    const userCookie = req.cookies.user_id || `user_${Math.random().toString(36).substr(2, 9)}`; // Generate or retrieve user cookie

    // Check if the user is allowed to claim a coupon
    canClaimCoupon(ip, userCookie, (err, allowed) => {
        if (err) return res.status(500).json({ message: "Server error" });
        if (!allowed) return res.json({ message: "You can only claim a coupon once per hour." });

        // Fetch the next available coupon using round-robin logic
        db.query("SELECT * FROM coupons WHERE claimed = FALSE LIMIT 1 OFFSET ?", [couponIndex], (err, results) => {
            if (err || results.length === 0) return res.json({ message: "No coupons available" });

            const coupon = results[0]; // Get the first available coupon

            // Mark the coupon as claimed
            db.query("UPDATE coupons SET claimed = TRUE WHERE id = ?", [coupon.id], (updateErr) => {
                if (updateErr) return res.status(500).json({ message: "Error updating coupon status" });

                // Record the claim in the database
                db.query("INSERT INTO claims (ip, cookie, coupon_id, timestamp) VALUES (?, ?, ?, NOW())", 
                [ip, userCookie, coupon.id], (insertErr) => {
                    if (insertErr) return res.status(500).json({ message: "Error saving claim record" });

                    // Update the round-robin index for the next claim
                    db.query("SELECT COUNT(*) AS total FROM coupons WHERE claimed = FALSE", (countErr, countResults) => {
                        if (!countErr && countResults[0].total > 0) {
                            couponIndex = (couponIndex + 1) % countResults[0].total; // Cycle through available coupons
                        }

                        // Set a cookie for the user and respond with the claimed coupon
                        res.cookie("user_id", userCookie, { maxAge: 3600000, httpOnly: true });
                        res.json({ message: `Coupon claimed: ${coupon.code}` });
                    });
                });
            });
        });
    });
});

// Get Available Coupons
app.get("/coupons", (req, res) => {
    // Fetch all unclaimed coupons
    db.query("SELECT * FROM coupons WHERE claimed = FALSE", (err, results) => {
        if (err) return res.status(500).json({ message: "Server error" });
        res.json(results); // Return available coupons
    });
});

// Get All Claims
app.get("/claims", (req, res) => {
    // Fetch all claim records
    db.query("SELECT * FROM claims", (err, results) => {
        if (err) return res.status(500).json({ message: "Server error" });
        res.json(results); // Return all claims
    });
});

// Reset Claims (For Testing)
app.post("/reset-claims", (req, res) => {
    // Clear all claim records
    db.query("DELETE FROM claims", err => {
        if (err) return res.status(500).json({ message: "Server error" });
        res.json({ message: "All claims reset" }); // Confirm reset
    });
});

// Reset Coupons (For Testing)
app.post("/reset-coupons", (req, res) => {
    // Reset all coupons to unclaimed status
    db.query("UPDATE coupons SET claimed = FALSE", err => {
        if (err) return res.status(500).json({ message: "Server error" });
        res.json({ message: "All coupons reset" }); // Confirm reset
    });
});

// Start Server
app.listen(5000, () => console.log("Server running on port 5000")); // Start the server on port 5000
