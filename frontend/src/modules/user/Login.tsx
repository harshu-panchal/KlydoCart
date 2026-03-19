import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  sendOTP,
  verifyOTP,
} from "../../services/api/auth/customerAuthService";
import { useAuth } from "../../context/AuthContext";
import OTPInput from "../../components/OTPInput";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mobileNumber, setMobileNumber] = useState("");
  const [showOTP, setShowOTP] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleContinue = async () => {
    if (mobileNumber.length !== 10) return;

    setLoading(true);
    setError("");

    try {
      const response = await sendOTP(mobileNumber);
      if (response.sessionId) {
        setSessionId(response.sessionId);
      }
      setShowOTP(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        "Failed to initiate call. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOTPComplete = async (otp: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await verifyOTP(mobileNumber, otp, sessionId);
      if (response.success && response.data) {
        login(response.data.token, {
          id: response.data.user.id,
          name: response.data.user.name,
          phone: response.data.user.phone,
          email: response.data.user.email,
          walletAmount: response.data.user.walletAmount,
          refCode: response.data.user.refCode,
          status: response.data.user.status,
        });
        navigate("/");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#d1fae5] relative overflow-hidden flex flex-col items-center justify-center font-sans"
      style={{
        backgroundImage: "url('/assets/login/loginbg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Background Pattern Decorations */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <svg className="absolute top-10 left-10 text-teal-600" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
        <svg className="absolute bottom-20 right-10 text-teal-600" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8V12L14 14" />
        </svg>
        <svg className="absolute top-1/2 left-[-20px] text-teal-600" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" style={{ transform: "rotate(45deg)" }}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      </div>

      <button
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 z-20 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow-sm flex items-center justify-center hover:bg-white transition-all active:scale-95"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18L9 12L15 6" />
        </svg>
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 w-full max-w-[400px] px-6"
      >
        <div className="bg-white rounded-[2.5rem] p-8 pb-12 shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl font-bold text-teal-900 mb-1">Log in</h1>
            <p className="text-sm text-teal-700/70 font-medium">Your Everyday Shopping Destination</p>
          </motion.div>

          <AnimatePresence mode="wait">
            {!showOTP ? (
              <motion.div
                key="phone-input"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-full space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-teal-800 ml-1">Phone Number</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-1 flex items-center bg-[#f0fdf4] rounded-l-2xl border-r border-teal-100 pr-2">
                       <span className="text-teal-700 font-bold text-sm ml-2">+91</span>
                    </div>
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) =>
                        setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                      placeholder="Enter mobile number"
                      className="w-full pl-16 pr-4 py-4 bg-[#f0fdf4] border border-transparent rounded-2xl text-teal-900 placeholder:text-teal-300 focus:outline-none focus:border-teal-300 focus:bg-white transition-all text-base"
                      maxLength={10}
                      disabled={loading}
                    />
                    <div className="absolute right-4 inset-y-0 flex items-center text-teal-600/30 group-focus-within:text-teal-600 transition-colors">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="text-xs text-red-500 bg-red-50 p-3 rounded-xl border border-red-100"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="flex items-center justify-between px-1">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="w-4 h-4 rounded border-2 border-teal-200 group-active:scale-95 transition-transform" />
                    <span className="text-xs text-teal-700 font-medium">Remember me</span>
                  </label>
                  <button className="text-xs text-teal-700 font-semibold hover:underline">Forgot password?</button>
                </div>

                <button
                  onClick={handleContinue}
                  disabled={mobileNumber.length !== 10 || loading}
                  className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg active:scale-[0.98] ${
                    mobileNumber.length === 10 && !loading
                      ? "bg-[#14532d] shadow-teal-900/20 hover:bg-[#114224]"
                      : "bg-neutral-300 shadow-none cursor-not-allowed opacity-70 hover:bg-[#14532d]"
                  }`}
                >
                  {loading ? "Processing..." : "Log in"}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="otp-input"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full space-y-6"
              >
                <div className="text-center space-y-2 mb-2">
                  <p className="text-sm text-teal-700/70 font-medium">
                    Enter the 4-digit code sent to
                  </p>
                  <p className="text-base font-bold text-teal-900">
                    +91 {mobileNumber}
                  </p>
                </div>

                <div className="py-4">
                  <OTPInput onComplete={handleOTPComplete} disabled={loading} />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="text-xs text-red-500 bg-red-50 p-3 rounded-xl border border-red-100 text-center"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowOTP(false);
                      setError("");
                    }}
                    disabled={loading}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-all border border-teal-100"
                  >
                    Change
                  </button>
                  <button
                    onClick={handleContinue}
                    disabled={loading}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-white bg-[#14532d] hover:bg-[#114224] transition-all shadow-md shadow-teal-900/10"
                  >
                    {loading ? "Sending..." : "Resend"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 text-center">
            <p className="text-xs font-medium text-teal-700/60">
              Don't have an account? <span className="text-teal-800 font-bold cursor-pointer hover:underline" onClick={() => navigate("/register")}>Register here!</span>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Brand Logo at Bottom */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 flex flex-col items-center gap-2"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#14532d] flex items-center justify-center">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
             </svg>
          </div>
          <span className="text-xl font-black text-[#14532d] tracking-tight">KlydoCart</span>
        </div>
      </motion.div>
    </div>
  );
}
