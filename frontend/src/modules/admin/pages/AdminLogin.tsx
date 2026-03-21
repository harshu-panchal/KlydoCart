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
      {/* Background Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-emerald-200/20 rounded-full blur-3xl animate-pulse" />

      {/* Admin Login Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[320px] relative z-10"
      >
        <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-teal-100 overflow-hidden">
          {/* Header Section */}
          <div className="bg-white/40 backdrop-blur-xl p-5 pb-6 flex flex-col items-center text-center relative border-b border-teal-100/50">
            <div className="absolute top-[-20px] left-[-20px] w-32 h-32 bg-teal-50/50 rounded-full blur-2xl" />
            <div className="absolute bottom-[-20px] right-[-20px] w-32 h-32 bg-emerald-50/50 rounded-full blur-2xl" />
            
            <div className="relative z-10 w-full flex flex-col items-center">
              <div className="mb-3">
                <img
                  src="/assets/login/KlydoCardLatest.png"
                  alt="KlydoCart"
                  className="h-10 w-auto object-contain"
                />
              </div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">
                Admin Panel
              </h1>
              <p className="text-teal-600/70 text-[9px] font-black mt-1 tracking-[0.2em] uppercase">
                System Controls Center
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
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">
                      Mobile Number
                    </label>
                    <div className="relative flex items-center bg-slate-50 rounded-xl border border-transparent focus-within:border-teal-500 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(20,184,166,0.1)] transition-all overflow-hidden">
                      <div className="pl-3 pr-2 py-2 flex items-center border-r border-slate-100">
                         <span className="text-teal-600 font-bold text-xs">+91</span>
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
                        className="w-full px-3 py-2 bg-transparent text-slate-900 placeholder:text-slate-300 focus:outline-none text-sm font-bold"
                        maxLength={10}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="text-[10px] font-medium text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-100 italic"
                    >
                      {error}
                    </motion.div>
                  )}

                  <button
                    onClick={handleMobileLogin}
                    disabled={mobileNumber.length !== 10 || loading}
                    className={`w-full py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-[0.98] ${
                      mobileNumber.length === 10 && !loading
                        ? "bg-teal-600 text-white shadow-teal-600/20 hover:bg-teal-700"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                    }`}>
                    {loading ? "FETCHING OTP..." : "VERIFY & CONTINUE"}
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="otp-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                      Verify Administrator
                    </p>
                    <p className="text-base font-black text-teal-900 tracking-tight">
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
                      className="text-[10px] font-bold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-100 text-center"
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
                      className="flex-1 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest text-slate-500 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all">
                      Back
                    </button>
                    <button
                      onClick={handleMobileLogin}
                      disabled={loading}
                      className="flex-1 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/20 transition-all text-center">
                      Resend
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer Text */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Administrator Mode</span>
          </div>
          <p className="text-[9px] text-slate-300 text-center max-w-[200px] font-medium leading-relaxed uppercase tracking-widest">
            Internal Access Only. IP Registered.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
