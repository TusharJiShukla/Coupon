import { useState, useEffect, useCallback, useMemo } from "react"; // React hooks for state and lifecycle management
import axios from "axios"; // Axios for making HTTP requests
import { FiClock, FiRefreshCw } from "react-icons/fi"; // Icons for countdown and loading
import { MdOutlineLocalOffer, MdErrorOutline } from "react-icons/md"; // Icons for coupons and errors
import { BiCheck } from "react-icons/bi"; // Icon for claimed coupons

const App = () => {
  const [coupons, setCoupons] = useState([]); // State to store available coupons
  const [loading, setLoading] = useState(true); // Loading state for fetching coupons
  const [error, setError] = useState(null); // Error state for handling API errors
  const [claimingCoupon, setClaimingCoupon] = useState(null); // State to track which coupon is being claimed
  const [showResetModal, setShowResetModal] = useState(false); // State to control reset modal visibility
  const [darkMode, setDarkMode] = useState(false); // State to toggle dark mode
  const [countdown, setCountdown] = useState(null); // State for countdown timer after claiming a coupon

  // Fetch coupons with improved error handling
  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get("http://localhost:5000/coupons"); // Fetch coupons from the backend
      if (Array.isArray(data)) {
        setCoupons(data); // Update state with fetched coupons
      } else {
        throw new Error("Invalid data format"); // Handle unexpected data format
      }
    } catch (err) {
      setError("Failed to fetch coupons. Please try again."); // Set error message on failure
    } finally {
      setLoading(false); // Stop loading regardless of success or failure
    }
  }, []);

  // Fetch coupons on component mount
  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  // Handle coupon claim with error handling
  const handleClaim = useCallback(async (couponId) => {
    setClaimingCoupon(couponId); // Set the coupon being claimed
    try {
      await axios.post(`http://localhost:5000/claim-coupon`); // Send claim request to the backend
      setCoupons((prev) =>
        prev.map((coupon) =>
          coupon.id === couponId ? { ...coupon, claimed: true } : coupon // Update the claimed coupon status
        )
      );
      setCountdown(3600); // Start a 1-hour countdown
    } catch (err) {
      setError(err.response?.data?.message || "Failed to claim coupon"); // Handle claim failure
    } finally {
      setClaimingCoupon(null); // Reset claiming state
    }
  }, []);

  // Reset system with improved async handling
  const handleReset = useCallback(async () => {
    try {
      await Promise.all([
        axios.post("http://localhost:5000/reset-claims"), // Reset claims
        axios.post("http://localhost:5000/reset-coupons"), // Reset coupons
      ]);
      fetchCoupons(); // Refetch coupons after reset
      setShowResetModal(false); // Close the reset modal
      setCountdown(null); // Clear the countdown
    } catch {
      setError("Reset failed. Please try again."); // Handle reset failure
    }
  }, [fetchCoupons]);

  // Countdown Timer
  useEffect(() => {
    if (countdown && countdown > 0) {
      const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000); // Update countdown every second
      return () => clearInterval(timer); // Cleanup timer on unmount
    }
  }, [countdown]);

  // Format countdown timer
  const formattedTime = useMemo(() => {
    if (countdown !== null) {
      const minutes = Math.floor(countdown / 60); // Calculate minutes
      const seconds = countdown % 60; // Calculate seconds
      return `${minutes}:${seconds.toString().padStart(2, "0")}`; // Format as MM:SS
    }
    return null; // Return null if no countdown is active
  }, [countdown]);

  return (
    <div className={`min-h-screen ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MdOutlineLocalOffer className="text-indigo-500" />
            Round-Robin Coupon Claiming System
          </h1>
          <div className="flex items-center gap-4">
            {/* Dark Mode Toggle Button */}
            <button onClick={() => setDarkMode(!darkMode)}
              className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition-colors">
              {darkMode ? "Light Mode" : "Dark Mode"}
            </button>
            {/* Reset System Button */}
            <button onClick={() => setShowResetModal(true)}
              className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors">
              Reset System
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg flex items-center gap-2">
            <MdErrorOutline className="text-xl" />
            {error}
          </div>
        )}

        {/* Countdown Timer */}
        {formattedTime && (
          <div className="mb-6 p-4 bg-indigo-100 text-indigo-700 rounded-lg flex items-center gap-2">
            <FiClock className="text-xl" />
            Next claim available in: {formattedTime}
          </div>
        )}

        {/* Coupons List */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <FiRefreshCw className="animate-spin text-4xl text-indigo-500" /> {/* Loading Spinner */}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coupons.map(({ id, title, description, discount, claimed }) => (
              <div key={id} className={`p-6 rounded-xl shadow-lg transition-transform hover:scale-105 ${darkMode ? "bg-gray-800" : "bg-white"}`}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold">{title}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm ${claimed ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                    {claimed ? "Claimed" : "Available"} {/* Coupon Status */}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-indigo-500">{id}</span>
                  {/* Claim Button */}
                  <button onClick={() => handleClaim(id)}
                    disabled={claimed || claimingCoupon === id || countdown}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 ${claimed ? "bg-gray-300 cursor-not-allowed" : "bg-indigo-500 hover:bg-indigo-600 text-white"}`}>
                    {claimingCoupon === id ? <FiRefreshCw className="animate-spin" /> : claimed ? <BiCheck className="text-xl" /> : "Claim Now"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reset Modal */}
        {showResetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className={`p-6 rounded-xl ${darkMode ? "bg-gray-800" : "bg-white"} max-w-md w-full mx-4`}>
              <h2 className="text-xl font-bold mb-4">Confirm Reset</h2>
              <p className="mb-6">Are you sure you want to reset all claims and coupons?</p>
              <div className="flex justify-end gap-4">
                <button onClick={() => setShowResetModal(false)} className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400 transition-colors">
                  Cancel
                </button>
                <button onClick={handleReset} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors">
                  Confirm Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
