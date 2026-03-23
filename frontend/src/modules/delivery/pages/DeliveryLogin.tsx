import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  sendOTP,
  verifyOTP,
} from "../../../services/api/auth/deliveryAuthService";
import OTPInput from "../../../components/OTPInput";
import { useAuth } from "../../../context/AuthContext";
import { removeAuthToken } from "../../../services/api/config";

export default function DeliveryLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mobileNumber, setMobileNumber] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [showOTP, setShowOTP] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isNotRegistered, setIsNotRegistered] = useState(false);

  useEffect(() => {
    removeAuthToken();
  }, []);

  const handleMobileLogin = async () => {
    if (mobileNumber.length !== 10) return;
    setLoading(true);
    setError("");
    setIsNotRegistered(false);

    try {
      const response = await sendOTP(mobileNumber);
      if (response.success && response.sessionId) {
        setSessionId(response.sessionId);
        setShowOTP(true);
      } else {
        setError(response.message || "Failed to initiate OTP");
      }
    } catch (err: any) {
      const status = err.response?.status;
      const message = err.response?.data?.message || "Failed to send OTP.";
      setError(message);
      if (status === 400 && (message.toLowerCase().includes("not found") || message.toLowerCase().includes("register"))) {
        setIsNotRegistered(true);
      }
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
        login(response.data.token, { ...response.data.user, userType: "Delivery" });
        navigate("/delivery");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/60 via-slate-50 to-teal-100/40 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Dynamic Background Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-emerald-200/20 rounded-full blur-3xl animate-pulse" />

      {/* Login Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[300px] sm:max-w-[320px] relative z-10"
      >
        <div className="bg-teal-50/70 backdrop-blur-lg rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-teal-100 overflow-hidden">
          {/* Header Section */}
          <div className="bg-white/40 backdrop-blur-xl p-5 flex flex-col items-center text-center relative border-b border-teal-100/50">
            {/* Subtle decorative elements */}
            <div className="absolute top-[-20px] left-[-20px] w-32 h-32 bg-blue-50/50 rounded-full blur-2xl" />
            <div className="absolute bottom-[-20px] right-[-20px] w-32 h-32 bg-yellow-50/50 rounded-full blur-2xl" />
            
            <div className="relative z-10 w-full flex flex-col items-center">
              <div className="mb-4 relative group">
                <img
                  src="/assets/login/KlydoCardLatest.png"
                  alt="KlydoCart"
                  className="h-10 sm:h-12 w-auto object-contain relative z-10"
                />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                Delivery Fleet
              </h1>
              <p className="text-slate-500 text-[10px] sm:text-xs font-semibold mt-1 tracking-wide uppercase">
                Partner Access Portal
              </p>
            </div>
          </div>

          {/* Form Content */}
          <div className="px-5 py-5">
            <AnimatePresence mode="wait">
              {!showOTP ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-teal-800/60 uppercase tracking-[0.1em] ml-1">
                      Mobile Number
                    </label>
                    <div className="relative flex items-center bg-slate-50 rounded-xl border border-transparent focus-within:border-teal-500 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(20,184,166,0.1)] transition-all overflow-hidden group">
                      <div className="pl-3 pr-2 py-2.5 flex items-center border-r border-slate-200 group-focus-within:border-teal-100 transition-colors">
                        <span className="text-teal-600 font-bold text-sm">+91</span>
                      </div>
                      <input
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="00000 00000"
                        maxLength={10}
                        className="w-full px-3 py-2.5 bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none text-sm font-bold"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} className="bg-rose-50 p-3 rounded-xl border border-rose-100">
                      <div className="flex flex-col gap-2">
                        <p className="text-[11px] font-bold text-rose-600 leading-snug">{error}</p>
                        {isNotRegistered && (
                          <button onClick={() => navigate("/delivery/signup")} className="bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest py-2 px-3 rounded-lg w-max hover:bg-rose-700 shadow-md shadow-rose-200 active:scale-95 transition-all">
                            Register Now
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}

                  <button
                    onClick={handleMobileLogin}
                    disabled={mobileNumber.length !== 10 || loading}
                    className={`w-full py-2.5 rounded-xl font-black text-[11px] tracking-widest uppercase transition-all shadow-md active:scale-95 ${
                      mobileNumber.length === 10 && !loading
                        ? "bg-teal-600 text-white shadow-teal-600/20 hover:bg-teal-700"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                    }`}>
                    {loading ? "Initializing..." : "Get Started"}
                  </button>

                  <p className="text-center text-[10px] sm:text-[11px] font-bold text-slate-400">
                    New to the fleet? 
                    <button onClick={() => navigate("/delivery/signup")} className="text-teal-600 ml-1 hover:underline">Apply Today</button>
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Verification Required</p>
                    <p className="text-base sm:text-lg font-black text-teal-900 tracking-tight">+91 {mobileNumber}</p>
                  </div>

                  <div className="py-1">
                    <OTPInput onComplete={handleOTPComplete} disabled={loading} />
                  </div>

                  {error && <p className="text-[10px] font-bold text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-100 text-center">{error}</p>}

                  <div className="flex gap-2">
                    <button onClick={() => setShowOTP(false)} className="flex-1 py-2.5 rounded-xl font-bold text-[10px] tracking-widest uppercase text-slate-500 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all">Back</button>
                    <button onClick={handleMobileLogin} className="flex-1 py-2.5 rounded-xl font-bold text-[10px] tracking-widest uppercase text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/20 transition-all">Resend</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Dynamic Footer */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Fleet System Active</span>
          </div>
          <p className="text-[9px] sm:text-[10px] text-slate-300 text-center max-w-[220px] font-medium leading-relaxed">
            By accessing this portal, you agree to the KlydoCart Logistics Terms & Safety Protocols.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
