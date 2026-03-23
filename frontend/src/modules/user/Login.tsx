import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  sendOTP,
  verifyOTP,
} from "../../services/api/auth/customerAuthService";
import { useAuth } from "../../context/AuthContext";
import OTPInput from "../../components/OTPInput";
import Lottie from "lottie-react";
import shoppingCartAnimation from "../../../assets/animation/shopping cart.json";

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
      className="min-h-screen bg-slate-50 relative overflow-hidden flex flex-col items-center justify-center font-sans p-4"
    >
      <button
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 z-20 w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-slate-50 transition-all active:scale-95"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18L9 12L15 6" />
        </svg>
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 w-full max-w-[340px]"
      >
        <div className="bg-teal-50 rounded-3xl p-6 pb-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-teal-100 flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="text-center mb-6 flex flex-col items-center"
          >
            <div className="w-24 h-24 mb-1">
              <Lottie animationData={shoppingCartAnimation} loop={true} />
            </div>
            <h1 className="text-2xl font-bold text-teal-900 mb-1">Log in</h1>
            <p className="text-xs text-teal-700/70 font-medium">Your Everyday Shopping Destination</p>
          </motion.div>

          <AnimatePresence mode="wait">
            {!showOTP ? (
              <motion.div
                key="phone-input"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-full space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-teal-800 ml-1">Phone Number</label>
                  <div className="relative flex items-center bg-white/60 rounded-xl border border-transparent focus-within:border-teal-400 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(20,184,166,0.1)] transition-all overflow-hidden group">
                    <div className="pl-4 pr-3 py-3 flex items-center border-r border-teal-100/50 group-focus-within:border-teal-200 transition-colors">
                       <span className="text-teal-700 font-bold text-sm">+91</span>
                    </div>
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) =>
                        setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                      placeholder="Enter mobile number"
                      className="w-full px-4 py-3 bg-transparent text-teal-900 placeholder:text-teal-400 focus:outline-none text-sm font-bold"
                      maxLength={10}
                      disabled={loading}
                    />
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="text-[10px] text-red-500 bg-red-50 p-2 rounded-lg border border-red-100"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="flex items-center justify-between px-1">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="w-3.5 h-3.5 rounded border border-teal-200 group-active:scale-95 transition-transform" />
                    <span className="text-[10px] text-teal-700 font-medium">Remember me</span>
                  </label>
                  <button className="text-[10px] text-teal-700 font-semibold hover:underline">Forgot password?</button>
                </div>

                <button
                  onClick={handleContinue}
                  disabled={mobileNumber.length !== 10 || loading}
                  className={`w-full py-3 rounded-xl font-bold text-white transition-all shadow-md active:scale-[0.98] ${
                    mobileNumber.length === 10 && !loading
                      ? "bg-teal-600 shadow-teal-600/20 hover:bg-teal-700 hover:shadow-teal-600/40"
                      : "bg-neutral-300 cursor-not-allowed opacity-70 shadow-none"
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
                className="w-full space-y-4"
              >
                <div className="text-center space-y-1 mb-2">
                  <p className="text-xs text-teal-700/70 font-medium">
                    Enter code sent to
                  </p>
                  <p className="text-sm font-bold text-teal-900">
                    +91 {mobileNumber}
                  </p>
                </div>

                <div className="py-2">
                  <OTPInput onComplete={handleOTPComplete} disabled={loading} />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="text-[10px] text-red-500 bg-red-50 p-2 rounded-lg border border-red-100 text-center"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowOTP(false);
                      setError("");
                    }}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-all border border-teal-100 text-xs"
                  >
                    Change
                  </button>
                  <button
                    onClick={handleContinue}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/20 transition-all text-xs"
                  >
                    {loading ? "Sending..." : "Resend"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 text-center">
            <p className="text-[10px] font-medium text-teal-700/60">
              New to KlydoCart? Proceed to log in, and we'll create an account for you!
            </p>
          </div>
        </div>
      </motion.div>

      {/* Brand Logo at Bottom */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 flex flex-col items-center gap-1"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-teal-600 flex items-center justify-center">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
             </svg>
          </div>
          <span className="text-lg font-black text-teal-800 tracking-tight">KlydoCart</span>
        </div>
      </motion.div>
    </div>
  );
}
