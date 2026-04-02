import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  register,
  sendOTP,
  verifyOTP,
} from "../../../services/api/auth/deliveryAuthService";
import { uploadDocument } from "../../../services/api/uploadService";
import { validateDocumentFile } from "../../../utils/imageUpload";
import OTPInput from "../../../components/OTPInput";
import { useAuth } from "../../../context/AuthContext";

export default function DeliverySignUp() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    dateOfBirth: "",
    password: "",
    address: "",
    city: "",
    pincode: "",
    drivingLicenseUrl: "",
    nationalIdentityCardUrl: "",
    accountName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    bonusType: "",
  });

  const [drivingLicenseFile, setDrivingLicenseFile] = useState<File | null>(null);
  const [nationalIdentityCardFile, setNationalIdentityCardFile] = useState<File | null>(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isCityLoading, setIsCityLoading] = useState(false);

  const bonusTypes = [
    "Select Bonus Type",
    "Fixed or Salaried",
    "Fixed",
    "Salaried",
    "Commission Based",
  ];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "mobile") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.replace(/\D/g, "").slice(0, 10),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const fetchCityFromLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setIsCityLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
          );
          const data = await response.json();
          if (data.status === "OK") {
            const addressComponents = data.results[0].address_components;
            const cityComponent = addressComponents.find(
              (c: any) =>
                c.types.includes("locality") ||
                c.types.includes("administrative_area_level_2")
            );
            if (cityComponent) {
              setFormData((prev) => ({
                ...prev,
                city: cityComponent.long_name,
              }));
            }
          } else {
            setError("Could not fetch city from your location");
          }
        } catch (err) {
          setError("Failed to fetch city details");
        } finally {
          setIsCityLoading(false);
        }
      },
      (err) => {
        setError("Location access denied. Please type your city manually.");
        setIsCityLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (!files || !files[0]) return;

    const file = files[0];
    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      setError(validation.error || "Invalid document file");
      return;
    }

    if (name === "drivingLicense") {
      setDrivingLicenseFile(file);
    } else if (name === "nationalIdentityCard") {
      setNationalIdentityCardFile(file);
    }
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.mobile || !formData.email || !formData.password || !formData.address || !formData.city) {
      setError("Please fill all required fields");
      return;
    }

    if (formData.mobile.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let drivingLicenseUrl = formData.drivingLicenseUrl;
      let nationalIdentityCardUrl = formData.nationalIdentityCardUrl;

      if (drivingLicenseFile || nationalIdentityCardFile) {
        setUploadingDocs(true);
        if (drivingLicenseFile) {
          const res = await uploadDocument(drivingLicenseFile, "kosil/delivery/documents");
          drivingLicenseUrl = res.secureUrl;
        }
        if (nationalIdentityCardFile) {
          const res = await uploadDocument(nationalIdentityCardFile, "kosil/delivery/documents");
          nationalIdentityCardUrl = res.secureUrl;
        }
        setUploadingDocs(false);
      }

      const response = await register({
        name: formData.name,
        mobile: formData.mobile,
        email: formData.email,
        dateOfBirth: formData.dateOfBirth || undefined,
        password: formData.password,
        address: formData.address,
        city: formData.city,
        pincode: formData.pincode || undefined,
        drivingLicense: drivingLicenseUrl || undefined,
        nationalIdentityCard: nationalIdentityCardUrl || undefined,
        accountName: formData.accountName || undefined,
        bankName: formData.bankName || undefined,
        accountNumber: formData.accountNumber || undefined,
        ifscCode: formData.ifscCode || undefined,
        bonusType: formData.bonusType || undefined,
      });

      if (response.success) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userData");
        try {
          const otpRes = await sendOTP(formData.mobile);
          if (otpRes.sessionId) setSessionId(otpRes.sessionId);
          setShowOTP(true);
        } catch (otpErr: any) {
          setError(otpErr.message || "Registration successful but failed to send OTP.");
        }
      }
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOTPComplete = async (otp: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await verifyOTP(formData.mobile, otp, sessionId);
      if (response.success && response.data) {
        login(response.data.token, {
          ...response.data.user,
          userType: "Delivery",
        });
        navigate("/delivery");
      }
    } catch (err: any) {
      setError(err.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/60 via-slate-50 to-teal-100/40 flex flex-col items-center justify-center p-4 font-sans text-neutral-900 relative overflow-hidden">
      {/* Background Decorative Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-emerald-200/20 rounded-full blur-3xl" />


      {/* Sign Up Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[400px] sm:max-w-[420px] my-6 relative z-10"
      >
        <div className="bg-teal-50/70 backdrop-blur-lg rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-teal-100 overflow-hidden">
          {/* Header Section */}
          <div className="p-5 pb-6 flex flex-col items-center text-center relative">
            {/* Subtle decorative elements */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-50/50 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-yellow-50/50 rounded-full blur-2xl" />
            
            <div className="relative z-10 w-full flex flex-col items-center">
              <div className="mb-3">
                <img
                  src="/assets/login/KlydoCardLatest.png"
                  alt="KlydoCart"
                  className="h-10 sm:h-12 w-auto object-contain"
                />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                Partner Sign Up
              </h1>
              <p className="text-slate-500 text-[10px] sm:text-xs font-medium mt-1">
                Join our delivery fleet
              </p>
            </div>
          </div>

          {/* Form Section */}
          <div className="p-5">
            <AnimatePresence mode="wait">
              {!showOTP ? (
                <motion.form 
                  key="signup-form"
                  onSubmit={handleSubmit}
                  className="space-y-5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                    {/* Personal Information */}
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-1.5">
                        Personal Information
                      </h3>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-700 ml-1">Full Name *</label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Your legal name"
                          className="w-full px-3 py-2.5 bg-slate-50 border border-transparent rounded-xl text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-sm font-medium"
                          disabled={loading}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-700 ml-1">Mobile Number *</label>
                        <div className="relative flex items-center bg-slate-50 rounded-xl border border-transparent focus-within:border-teal-500 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(20,184,166,0.1)] transition-all overflow-hidden group">
                          <div className="pl-3 pr-2 py-2.5 flex items-center border-r border-slate-200 group-focus-within:border-teal-100 transition-colors">
                            <span className="text-slate-600 font-bold text-sm">+91</span>
                          </div>
                          <input
                            type="tel"
                            name="mobile"
                            value={formData.mobile}
                            onChange={handleInputChange}
                            placeholder="00000 00000"
                            maxLength={10}
                            className="w-full px-3 py-2.5 bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none text-sm font-bold"
                            disabled={loading}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-700 ml-1">Email *</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="Email"
                          className="w-full px-3 py-2.5 bg-slate-50 border border-transparent rounded-xl text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-sm font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-700 ml-1">Birth Date</label>
                        <input
                          type="date"
                          name="dateOfBirth"
                          value={formData.dateOfBirth}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-transparent rounded-xl text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-sm font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-700 ml-1">Secure Password *</label>
                        <input
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder="Min 6 characters"
                          className="w-full px-3 py-2.5 bg-slate-50 border border-transparent rounded-xl text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-sm font-medium"
                        />
                      </div>
                    </div>

                    {/* Location Information */}
                    <div className="space-y-3 pt-3">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-1.5">
                        Location Details
                      </h3>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-700 ml-1">Full Address *</label>
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          placeholder="House no, Street, Area"
                          className="w-full px-3 py-2.5 bg-slate-50 border border-transparent rounded-xl text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-sm font-medium"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1 relative">
                          <label className="text-[10px] font-bold text-slate-700 ml-1">City *</label>
                          <input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                            placeholder="City"
                            className="w-full px-3 py-2.5 bg-slate-50 border border-transparent rounded-xl text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-sm font-medium pr-10"
                            disabled={isCityLoading}
                          />
                          <button
                            type="button"
                            onClick={fetchCityFromLocation}
                            className="absolute right-2 bottom-1.5 p-1 text-teal-600 hover:bg-teal-50 rounded-md transition-all"
                          >
                            {isCityLoading ? (
                               <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                            )}
                          </button>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-700 ml-1">Pincode</label>
                          <input
                            type="text"
                            name="pincode"
                            value={formData.pincode}
                            onChange={handleInputChange}
                            placeholder="000000"
                            className="w-full px-3 py-2.5 bg-slate-50 border border-transparent rounded-xl text-slate-900 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-sm font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Banking Details */}
                    <div className="space-y-3 pt-3 flex flex-col items-start w-full">
                      <h3 className="text-[10px] w-full font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-1.5">
                        Banking (Optional)
                      </h3>
                      <div className="grid grid-cols-2 gap-2.5 w-full">
                        <input
                          name="accountName"
                          value={formData.accountName}
                          onChange={handleInputChange}
                          placeholder="Account Name"
                          className="w-full px-3 py-2.5 bg-slate-50 border border-transparent rounded-xl text-xs focus:bg-white focus:border-teal-500 outline-none transition-all placeholder:text-slate-300"
                        />
                        <input
                          name="bankName"
                          value={formData.bankName}
                          onChange={handleInputChange}
                          placeholder="Bank Name"
                          className="w-full px-3 py-2.5 bg-slate-50 border border-transparent rounded-xl text-xs focus:bg-white focus:border-teal-500 outline-none transition-all placeholder:text-slate-300"
                        />
                        <input
                          name="accountNumber"
                          value={formData.accountNumber}
                          onChange={handleInputChange}
                          placeholder="Account Number"
                          className="w-full px-3 py-2.5 bg-slate-50 border border-transparent rounded-xl text-xs focus:bg-white focus:border-teal-500 outline-none transition-all placeholder:text-slate-300"
                        />
                        <input
                          name="ifscCode"
                          value={formData.ifscCode}
                          onChange={handleInputChange}
                          placeholder="IFSC Code"
                          className="w-full px-3 py-2.5 bg-slate-50 border border-transparent rounded-xl text-xs focus:bg-white focus:border-teal-500 outline-none transition-all placeholder:text-slate-300"
                        />
                      </div>
                      <select
                        name="bonusType"
                        value={formData.bonusType}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2.5 mt-2 bg-slate-50 border border-transparent rounded-xl text-xs focus:bg-white focus:border-teal-500 outline-none transition-all"
                      >
                        {bonusTypes.map((type) => (
                          <option key={type} value={type === "Select Bonus Type" ? "" : type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Documents */}
                    <div className="space-y-3 pt-3">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-1.5">
                        Identity Verification
                      </h3>
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-700 ml-1">Driving License</label>
                          <input
                            type="file"
                            name="drivingLicense"
                            onChange={handleFileChange}
                            className="w-full p-2 text-[10px] bg-slate-50 rounded-xl border border-dashed border-slate-200"
                            disabled={uploadingDocs}
                          />
                          {drivingLicenseFile && <p className="text-[9px] text-teal-600 font-bold ml-1">✓ {drivingLicenseFile.name}</p>}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-700 ml-1">Identity (Aadhar/PAN)</label>
                          <input
                            type="file"
                            name="nationalIdentityCard"
                            onChange={handleFileChange}
                            className="w-full p-2 text-[10px] bg-slate-50 rounded-xl border border-dashed border-slate-200"
                            disabled={uploadingDocs}
                          />
                          {nationalIdentityCardFile && <p className="text-[9px] text-teal-600 font-bold ml-1">✓ {nationalIdentityCardFile.name}</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] font-medium text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-100 italic">
                      {error}
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || uploadingDocs}
                    className="w-full py-3 bg-teal-600 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest shadow-md shadow-teal-600/20 hover:bg-teal-700 hover:shadow-teal-600/30 active:scale-[0.98] transition-all disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                  >
                    {uploadingDocs ? "Uploading..." : loading ? "Setting up Profile..." : "Start Journey"}
                  </button>

                  <div className="text-center pt-1">
                    <p className="text-[10px] sm:text-[11px] text-slate-500 font-bold">
                      Already registered?{" "}
                      <button type="button" onClick={() => navigate("/delivery/login")} className="text-teal-600 font-bold ml-1 hover:underline">Login here</button>
                    </p>
                  </div>
                </motion.form>
              ) : (
                <motion.div 
                  key="otp-step"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-5"
                >
                  <div className="text-center space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Verification Required</p>
                    <p className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Enter OTP sent to +91 {formData.mobile}</p>
                  </div>
                  <OTPInput onComplete={handleOTPComplete} disabled={loading} />
                  {error && <div className="text-[10px] text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-100 text-center">{error}</div>}
                  <div className="flex gap-2">
                    <button onClick={() => setShowOTP(false)} className="flex-1 py-2.5 bg-slate-50 text-slate-500 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-200">Go Back</button>
                    <button onClick={async () => { setLoading(true); try { await sendOTP(formData.mobile); } finally { setLoading(false); } }} className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-teal-700 shadow-md shadow-teal-600/20 transition-all">Resend OTP</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center gap-3">
          <p className="text-[9px] text-slate-400 text-center font-bold tracking-widest uppercase italic">
            Powering Local Deliveries • KlydoCart Partner
          </p>
        </div>
      </motion.div>
    </div>
  );
}
