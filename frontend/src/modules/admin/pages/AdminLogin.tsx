import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  sendOTP,
  verifyOTP,
} from "../../../services/api/auth/adminAuthService";
import OTPInput from "../../../components/OTPInput";
import { useAuth } from "../../../context/AuthContext";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mobileNumber, setMobileNumber] = useState("");
  const [showOTP, setShowOTP] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleMobileLogin = async () => {
    if (mobileNumber.length !== 10) return;

    setLoading(true);
    setError("");

    try {
      await sendOTP(mobileNumber);
      setShowOTP(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to send OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOTPComplete = async (otp: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await verifyOTP(mobileNumber, otp);
      if (response.success && response.data) {
        login(response.data.token, {
          ...response.data.user,
          userType: "Admin",
        });
        navigate("/admin");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/60 via-slate-50 to-teal-100/40 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Background Decorative Blobs behind the card */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-emerald-200/20 rounded-full blur-3xl" />

      {/* Back Button REMOVED */}

      {/* Login Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[320px]"
      >
        <div className="bg-teal-50/70 backdrop-blur-lg rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-teal-100 overflow-hidden">
          {/* Header Section */}
          <div className="p-6 pb-8 flex flex-col items-center text-center relative">
            {/* Subtle decorative elements */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-50/50 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-yellow-50/50 rounded-full blur-2xl" />
            
            <div className="relative z-10 w-full flex flex-col items-center">
              <div className="mb-4">
                <img
                  src="/KlydoCardLatest.png"
                  alt="KlydoCart"
                  className="h-12 w-auto object-contain"
                />
              </div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">
                Admin Panel
              </h1>
              <p className="text-slate-500 text-[10px] font-medium mt-1">
                Management & Operations
              </p>
            </div>
          </div>

          {/* Login Form */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {!showOTP ? (
                <motion.div
                  key="login-form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider ml-1">
                      Mobile Number
                    </label>
                    <div className="relative flex items-center bg-slate-50 rounded-xl border border-transparent focus-within:border-teal-500 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(20,184,166,0.1)] transition-all overflow-hidden group">
                      <div className="pl-3 pr-2 py-2.5 flex items-center border-r border-slate-200 group-focus-within:border-teal-100 transition-colors">
                         <span className="text-slate-600 font-bold text-xs">+91</span>
                      </div>
                      <input
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) =>
                          setMobileNumber(
                            e.target.value.replace(/\D/g, "").slice(0, 10)
                          )
                        }
                        placeholder="00000 00000"
                        className="w-full px-3 py-2.5 bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none text-sm font-bold"
                        maxLength={10}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="text-[10px] font-medium text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-100"
                    >
                      {error}
                    </motion.div>
                  )}

                  <button
                    onClick={handleMobileLogin}
                    disabled={mobileNumber.length !== 10 || loading}
                    className={`w-full py-3 rounded-xl font-bold text-xs transition-all shadow-lg active:scale-[0.98] ${
                      mobileNumber.length === 10 && !loading
                        ? "bg-teal-600 text-white shadow-teal-600/20 hover:bg-teal-700 hover:shadow-teal-600/40"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                    }`}>
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-3 w-3 text-current" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Sending...
                      </span>
                    ) : "Verify & Continue"}
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="otp-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="text-center space-y-1">
                    <p className="text-[10px] text-slate-500 font-medium">
                      Enter the 4-digit OTP sent to
                    </p>
                    <p className="text-sm font-bold text-slate-900">
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
                      className="text-[10px] font-medium text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-100 text-center"
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
                      className="flex-1 py-2.5 rounded-xl font-bold text-[10px] text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all border border-slate-200">
                      Change
                    </button>
                    <button
                      onClick={handleMobileLogin}
                      disabled={loading}
                      className="flex-1 py-2.5 rounded-xl font-bold text-[10px] text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/20 transition-all">
                      {loading ? "Re-sending..." : "Resend"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer Text */}
        <p className="mt-8 text-[10px] text-slate-400 text-center font-medium leading-relaxed">
          SECURE ADMINISTRATOR ACCESS<br />
          By continuing, you agree to KlydoCart's Admin Terms of Service
        </p>
      </motion.div>
    </div>
  );
}
