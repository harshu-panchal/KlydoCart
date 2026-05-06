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
    password: "klydocart_partner", // Default internal password
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
      let val = value.replace(/\D/g, "");
      // If user types 91xxxxxxxxxx (12 digits), strip the 91
      if (val.startsWith("91") && val.length === 12) {
        val = val.slice(2);
      } else if (val.startsWith("0") && val.length === 11) {
        val = val.slice(1);
      }

      // Allow typing up to 12 digits if it starts with 91, 11 if 0, else 10
      const limit = val.startsWith("91") ? 12 : val.startsWith("0") ? 11 : 10;

      setFormData((prev) => ({
        ...prev,
        [name]: val.slice(0, limit),
      }));
    } else if (name === "name" || name === "city" || name === "accountName" || name === "bankName") {
      // Only alphabets and spaces
      setFormData((prev) => ({
        ...prev,
        [name]: value.replace(/[^a-zA-Z\s]/g, ""),
      }));
    } else if (name === "pincode") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.replace(/\D/g, "").slice(0, 6),
      }));
    } else if (name === "accountNumber") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.replace(/\D/g, "").slice(0, 18),
      }));
    } else if (name === "ifscCode") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.toUpperCase().slice(0, 11),
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

    if (!formData.name || !formData.mobile || !formData.email || !formData.address || !formData.city || 
        !formData.accountName || !formData.bankName || !formData.accountNumber || !formData.ifscCode || !formData.bonusType) {
      setError("Please fill all required personal and banking fields");
      return;
    }

    if (!drivingLicenseFile || !nationalIdentityCardFile) {
      setError("Please upload both Driving License and Identity Card");
      return;
    }

    if (formData.mobile.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address (e.g. name@example.com)");
      return;
    }

    // DOB Validation (18+)
    if (formData.dateOfBirth) {
      const dob = new Date(formData.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      if (age < 18) {
        setError("You must be at least 18 years old to join");
        return;
      }
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (formData.pincode && formData.pincode.length !== 6) {
      setError("Pincode must be 6 digits");
      return;
    }

    if (formData.accountNumber && (formData.accountNumber.length < 8 || formData.accountNumber.length > 18)) {
      setError("Account number must be 8-18 digits");
      return;
    }

    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (formData.ifscCode && !ifscRegex.test(formData.ifscCode)) {
      setError("Please enter a valid IFSC code (e.g. SBIN0000456)");
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
          const res = await uploadDocument(drivingLicenseFile, "klydocart/delivery/documents");
          drivingLicenseUrl = res.secureUrl;
        }
        if (nationalIdentityCardFile) {
          const res = await uploadDocument(nationalIdentityCardFile, "klydocart/delivery/documents");
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
                        <label className="text-[10px] font-bold text-slate-700 ml-1">Full Name <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Your legal name"
                          spellCheck={false}
                          autoComplete="off"
                          className={`w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-slate-900 placeholder:text-slate-500 focus:outline-none focus:bg-white transition-all text-sm font-medium ${formData.name && !/^[a-zA-Z\s]*$/.test(formData.name) ? 'border-red-500' : 'border-transparent focus:border-teal-500'}`}
                          disabled={loading}
                        />
                        {formData.name && !/^[a-zA-Z\s]*$/.test(formData.name) && (
                          <p className="text-[9px] text-red-500 font-bold ml-1 italic">Only alphabets allowed</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-700 ml-1">Mobile Number <span className="text-red-500">*</span></label>
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
                            maxLength={12}
                            className="w-full px-3 py-2 bg-transparent text-slate-900 placeholder:text-slate-500 focus:outline-none text-sm font-bold placeholder:font-normal"
                            disabled={loading}
                          />
                        </div>
                        {formData.mobile && formData.mobile.length !== 10 && !formData.mobile.startsWith("91") && !formData.mobile.startsWith("0") && (
                          <p className="text-[9px] text-red-500 font-bold ml-1 italic">Must be exactly 10 digits</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-700 ml-1">Email <span className="text-red-500">*</span></label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="Email"
                          spellCheck={false}
                          className={`w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-slate-900 focus:outline-none focus:bg-white transition-all text-sm font-medium ${formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ? 'border-red-500' : 'border-transparent focus:border-teal-500'}`}
                        />
                        {formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
                          <p className="text-[9px] text-red-500 font-bold ml-1">Invalid email format</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-700 ml-1">Birth Date (18+)</label>
                        <input
                          type="date"
                          name="dateOfBirth"
                          max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                          value={formData.dateOfBirth}
                          onChange={handleInputChange}
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
                        <label className="text-[10px] font-bold text-slate-700 ml-1">Full Address <span className="text-red-500">*</span></label>
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
                          <label className="text-[10px] font-bold text-slate-700 ml-1">City <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                            placeholder="City"
                            className={`w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-slate-900 placeholder:text-slate-500 focus:outline-none focus:bg-white transition-all text-sm font-medium ${formData.city && !/^[a-zA-Z\s]*$/.test(formData.city) ? 'border-red-500' : 'border-transparent focus:border-teal-500'}`}
                            disabled={isCityLoading}
                          />
                          {formData.city && !/^[a-zA-Z\s]*$/.test(formData.city) && (
                            <p className="text-[9px] text-red-500 font-bold ml-1 italic">Only alphabets allowed</p>
                          )}
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
                            className={`w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-slate-900 focus:outline-none focus:bg-white transition-all text-sm font-medium ${formData.pincode && formData.pincode.length !== 6 ? 'border-red-500' : 'border-transparent focus:border-teal-500'}`}
                          />
                          {formData.pincode && formData.pincode.length !== 6 && (
                            <p className="text-[9px] text-red-500 font-bold ml-1">Must be 6 digits</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Banking Details */}
                    <div className="space-y-3 pt-3 flex flex-col items-start w-full">
                      <h3 className="text-[10px] w-full font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-1.5">
                        Banking Details
                      </h3>
                      <div className="grid grid-cols-2 gap-2.5 w-full">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-700 ml-1">Account Holder <span className="text-red-500">*</span></label>
                          <input
                            name="accountName"
                            value={formData.accountName}
                            onChange={handleInputChange}
                            placeholder="Account Holder Name"
                            className={`w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-xs focus:bg-white transition-all outline-none placeholder:text-slate-500 ${formData.accountName && !/^[a-zA-Z\s]*$/.test(formData.accountName) ? 'border-red-500' : 'border-transparent focus:border-teal-500'}`}
                          />
                          {formData.accountName && !/^[a-zA-Z\s]*$/.test(formData.accountName) && (
                            <p className="text-[9px] text-red-500 font-bold ml-1 italic">Only alphabets allowed</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-700 ml-1">Bank Name <span className="text-red-500">*</span></label>
                          <input
                            name="bankName"
                            value={formData.bankName}
                            onChange={handleInputChange}
                            placeholder="Bank Name"
                            className={`w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-xs focus:bg-white transition-all outline-none placeholder:text-slate-500 ${formData.bankName && !/^[a-zA-Z\s]*$/.test(formData.bankName) ? 'border-red-500' : 'border-transparent focus:border-teal-500'}`}
                          />
                          {formData.bankName && !/^[a-zA-Z\s]*$/.test(formData.bankName) && (
                            <p className="text-[9px] text-red-500 font-bold ml-1 italic text-right">Only alphabets allowed</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-700 ml-1">Account Number <span className="text-red-500">*</span></label>
                          <input
                            name="accountNumber"
                            value={formData.accountNumber}
                            onChange={handleInputChange}
                            placeholder="Account Number"
                            className={`w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-xs focus:bg-white transition-all outline-none placeholder:text-slate-500 ${formData.accountNumber && (formData.accountNumber.length < 8 || formData.accountNumber.length > 18) ? 'border-red-500' : 'border-transparent focus:border-teal-500'}`}
                          />
                          {formData.accountNumber && (formData.accountNumber.length < 8 || formData.accountNumber.length > 18) && (
                            <p className="text-[9px] text-red-500 font-bold ml-1">Must be 8-18 digits</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-700 ml-1">IFSC Code <span className="text-red-500">*</span></label>
                          <input
                            name="ifscCode"
                            value={formData.ifscCode}
                            onChange={handleInputChange}
                            placeholder="IFSC Code"
                            className={`w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-xs focus:bg-white transition-all outline-none placeholder:text-slate-500 ${formData.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode) ? 'border-red-500' : 'border-transparent focus:border-teal-500'}`}
                          />
                          {formData.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode) && (
                            <p className="text-[9px] text-red-500 font-bold ml-1">Invalid IFSC (e.g. SBIN0000456)</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1 w-full">
                        <label className="text-[9px] font-bold text-slate-700 ml-1">Bonus Type <span className="text-red-500">*</span></label>
                        <select
                          name="bonusType"
                          value={formData.bonusType}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-transparent rounded-xl text-xs focus:bg-white focus:border-teal-500 outline-none transition-all"
                        >
                          {bonusTypes.map((type) => (
                            <option key={type} value={type === "Select Bonus Type" ? "" : type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Documents */}
                    <div className="space-y-3 pt-3">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-1.5">
                        Identity Verification
                      </h3>
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-700 ml-1">Driving License <span className="text-red-500">*</span></label>
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
                          <label className="text-[10px] font-bold text-slate-700 ml-1">Identity (Aadhar/PAN) <span className="text-red-500">*</span></label>
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
