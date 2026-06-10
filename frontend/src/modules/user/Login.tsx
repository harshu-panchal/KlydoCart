import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  const location = useLocation();
  const { login } = useAuth();
  const [mobileNumber, setMobileNumber] = useState("");
  const [showOTP, setShowOTP] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(0);
  const [otpValue, setOtpValue] = useState("");
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showOTP && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showOTP, timer]);

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
      setTimer(20); // Set timer to 20 seconds
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
        // Navigate to redirectTo if provided (e.g., after adding to cart as guest)
        const redirectTo = (location.state as any)?.redirectTo || "/";
        navigate(redirectTo);
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

                <div className="h-2"></div>

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
                  <OTPInput 
                    onComplete={handleOTPComplete} 
                    onChange={setOtpValue}
                    disabled={loading} 
                  />
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

                <AnimatePresence>
                  {timer > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-center"
                    >
                      <p className="text-[11px] font-medium text-teal-700/60 mb-2">
                        Resend code in <span className="text-teal-600 font-bold">{timer}s</span>
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowOTP(false);
                      setError("");
                      setOtpValue("");
                      setTimer(0);
                    }}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-all border border-teal-100 text-xs"
                  >
                    Change Number
                  </button>
                  <button
                    onClick={timer === 0 ? handleContinue : () => otpValue.length === 4 && handleOTPComplete(otpValue)}
                    disabled={loading || (timer > 0 && otpValue.length !== 4)}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-white transition-all text-xs shadow-md ${
                      (timer === 0 || otpValue.length === 4) && !loading
                        ? "bg-teal-600 shadow-teal-600/20 hover:bg-teal-700 font-bold"
                        : "bg-neutral-300 shadow-none cursor-not-allowed opacity-70"
                    }`}
                  >
                    {loading ? "Sending..." : (timer > 0 ? "Continue" : "Resend")}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 text-center space-y-3">
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowTerms(true)}
                className="text-[10px] font-bold text-teal-600 hover:text-teal-700 transition-colors underline underline-offset-2"
              >
                Terms & Conditions
              </button>
              <span className="w-1 h-1 rounded-full bg-teal-200"></span>
              <button
                onClick={() => setShowPrivacy(true)}
                className="text-[10px] font-bold text-teal-600 hover:text-teal-700 transition-colors underline underline-offset-2"
              >
                Privacy Policy
              </button>
            </div>
            <p className="text-[10px] font-medium text-teal-700/60 leading-relaxed px-2">
              New to KlydoCart? Proceed to log in, and we'll create an account for you!
            </p>
          </div>
        </div>
      </motion.div>
 
      {/* Terms and Conditions Modal */}
      <AnimatePresence>
        {showTerms && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowTerms(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-[400px] max-h-[80vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-5 bg-teal-50 border-b border-teal-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-teal-900">Terms & Conditions</h2>
                <button
                  onClick={() => setShowTerms(false)}
                  className="w-8 h-8 rounded-full bg-white border border-teal-100 flex items-center justify-center text-teal-600 hover:bg-teal-50 transition-all shadow-sm"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
 
              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
                <div className="space-y-6">
                  <section>
                    <h3 className="text-sm font-bold text-teal-800 mb-2">1. Acceptance of Terms</h3>
                    <p className="text-xs text-teal-700/70 leading-relaxed font-medium">
                      By accessing and using KlydoCart, you agree to be bound by these terms. If you do not agree, please do not use our services.
                    </p>
                  </section>
 
                  <section>
                    <h3 className="text-sm font-bold text-teal-800 mb-2">2. User Accounts</h3>
                    <ul className="text-xs text-teal-700/70 space-y-2 list-disc pl-4 font-medium">
                      <li>You must provide accurate and complete information during registration.</li>
                      <li>You are responsible for all activities that occur under your account.</li>
                      <li>One user is allowed to have only one active account.</li>
                    </ul>
                  </section>
 
                  <section>
                    <h3 className="text-sm font-bold text-teal-800 mb-2">3. Privacy Policy</h3>
                    <p className="text-xs text-teal-700/70 leading-relaxed font-medium">
                      Your privacy is important to us. We collect and use your data as described in our Privacy Policy to provide and improve our services.
                    </p>
                  </section>
 
                  <section>
                    <h3 className="text-sm font-bold text-teal-800 mb-2">4. Ordering & Payments</h3>
                    <ul className="text-xs text-teal-700/70 space-y-2 list-disc pl-4 font-medium">
                      <li>Prices are inclusive of applicable taxes unless stated otherwise.</li>
                      <li>Orders are subject to availability and acceptance by sellers.</li>
                      <li>Payment must be made through the provided secure payment gateways.</li>
                    </ul>
                  </section>
 
                  <section>
                    <h3 className="text-sm font-bold text-teal-800 mb-2">5. Delivery Policy</h3>
                    <p className="text-xs text-teal-700/70 leading-relaxed font-medium">
                      Delivery times are estimates and may vary based on location, traffic, and weather conditions. Customers must be present to receive orders.
                    </p>
                  </section>
 
                  <section>
                    <h3 className="text-sm font-bold text-teal-800 mb-2">6. Cancellation & Refunds</h3>
                    <p className="text-xs text-teal-700/70 leading-relaxed font-medium">
                      Refunds are processed according to our internal policy and may take 5-7 business days to reflect in your account.
                    </p>
                  </section>
                </div>
              </div>
 
              {/* Modal Footer */}
              <div className="px-6 py-5 bg-teal-50 border-t border-teal-100">
                <button
                  onClick={() => setShowTerms(false)}
                  className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold shadow-lg shadow-teal-600/20 hover:bg-teal-700 transition-all"
                >
                  Got it, Thanks!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
 
      {/* Privacy Policy Modal */}
      <AnimatePresence>
        {showPrivacy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowPrivacy(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-[400px] max-h-[80vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-5 bg-teal-50 border-b border-teal-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-teal-900">Privacy Policy</h2>
                <button
                  onClick={() => setShowPrivacy(false)}
                  className="w-8 h-8 rounded-full bg-white border border-teal-100 flex items-center justify-center text-teal-600 hover:bg-teal-50 transition-all shadow-sm"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
 
              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
                <div className="space-y-6">
                  <section>
                    <h3 className="text-sm font-bold text-teal-800 mb-2">1. Information Collection</h3>
                    <p className="text-xs text-teal-700/70 leading-relaxed font-medium">
                      We collect information you provide directly to us, such as your phone number, name, and address, to facilitate your orders and improve our service.
                    </p>
                  </section>
 
                  <section>
                    <h3 className="text-sm font-bold text-teal-800 mb-2">2. How We Use Information</h3>
                    <ul className="text-xs text-teal-700/70 space-y-2 list-disc pl-4 font-medium">
                      <li>To process and deliver your orders.</li>
                      <li>To send you transactional messages and updates.</li>
                      <li>To personalize your shopping experience.</li>
                      <li>To detect and prevent fraudulent activities.</li>
                    </ul>
                  </section>
 
                  <section>
                    <h3 className="text-sm font-bold text-teal-800 mb-2">3. Information Sharing</h3>
                    <p className="text-xs text-teal-700/70 leading-relaxed font-medium">
                      We share your information with sellers and delivery partners only to the extent necessary to complete your transactions. We do not sell your personal data to third parties.
                    </p>
                  </section>
 
                  <section>
                    <h3 className="text-sm font-bold text-teal-800 mb-2">4. Data Security</h3>
                    <p className="text-xs text-teal-700/70 leading-relaxed font-medium">
                      We implement industry-standard security measures to protect your information from unauthorized access, alteration, or disclosure.
                    </p>
                  </section>
 
                  <section>
                    <h3 className="text-sm font-bold text-teal-800 mb-2">5. Your Rights</h3>
                    <p className="text-xs text-teal-700/70 leading-relaxed font-medium">
                      You have the right to access, correct, or delete your personal information through your account settings or by contacting our support team.
                    </p>
                  </section>
                </div>
              </div>
 
              {/* Modal Footer */}
              <div className="px-6 py-5 bg-teal-50 border-t border-teal-100">
                <button
                  onClick={() => setShowPrivacy(false)}
                  className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold shadow-lg shadow-teal-600/20 hover:bg-teal-700 transition-all"
                >
                  Understood
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
          <span className="text-lg font-black text-teal-800 tracking-tight uppercase">KLYDO CART</span>
        </div>
      </motion.div>
    </div>
  );
}
