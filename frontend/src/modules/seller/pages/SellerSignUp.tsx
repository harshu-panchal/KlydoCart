import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  register,
  sendOTP,
  verifyOTP,
} from "../../../services/api/auth/sellerAuthService";
import OTPInput from "../../../components/OTPInput";
import GoogleMapsAutocomplete from "../../../components/GoogleMapsAutocomplete";
import { useAuth } from "../../../context/AuthContext";
import {
  getHeaderCategoriesPublic,
  HeaderCategory,
} from "../../../services/api/headerCategoryService";
import LocationPickerMap from "../../../components/LocationPickerMap";

export default function SellerSignUp() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    sellerName: "",
    mobile: "",
    email: "",
    storeName: "",
    category: "",
    categories: [] as string[],
    address: "",
    city: "",
    panCard: "",
    taxName: "",
    taxNumber: "",
    searchLocation: "",
    latitude: "",
    longitude: "",
    serviceRadiusKm: "10", 
    accountName: "",
    bankName: "",
    branch: "",
    accountNumber: "",
    ifsc: "",
  });
  const [showOTP, setShowOTP] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<HeaderCategory[]>([]);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await getHeaderCategoriesPublic();
        if (Array.isArray(res)) {
          setCategories(res.filter((cat) => cat.status === "Published"));
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };
    fetchCats();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "mobile") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.replace(/\D/g, "").slice(0, 10),
      }));
    } else if (name === "serviceRadiusKm") {
      const cleanedValue = value.replace(/[^0-9.]/g, "");
      const parts = cleanedValue.split(".");
      const finalValue =
        parts.length > 2 ? `${parts[0]}.${parts[1]}` : cleanedValue;

      setFormData((prev) => ({
        ...prev,
        [name]: finalValue,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const toggleCategory = (cat: string) => {
    setFormData((prev) => {
      const exists = prev.categories.includes(cat);
      const nextCategories = exists
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat];
      return {
        ...prev,
        categories: nextCategories,
        category: nextCategories[0] || "",
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.sellerName) { setError("Please enter your name"); return; }
    if (!formData.mobile) { setError("Please enter your mobile number"); return; }
    if (!formData.email) { setError("Please enter your email address"); return; }
    if (!formData.storeName) { setError("Please enter your store name"); return; }
    if (formData.categories.length === 0) { setError("Please select at least one category"); return; }
    if (!formData.address && !formData.searchLocation) { setError("Please select your store location"); return; }
    if (!formData.city) { setError("Please enter your city"); return; }
    if (formData.mobile.length !== 10) { setError("Please enter a valid 10-digit mobile number"); return; }

    setLoading(true);
    setError("");

    try {
      if (!formData.searchLocation || !formData.latitude || !formData.longitude) {
        setError("Please select your store location using the location search");
        setLoading(false);
        return;
      }

      const radius = parseFloat(formData.serviceRadiusKm);
      if (isNaN(radius) || radius < 0.1 || radius > 100) {
        setError("Service radius must be between 0.1 and 100 kilometers");
        setLoading(false);
        return;
      }

      const response = await register({
        sellerName: formData.sellerName,
        mobile: formData.mobile,
        email: formData.email,
        storeName: formData.storeName,
        category: formData.categories[0], 
        categories: formData.categories,
        address: formData.address || formData.searchLocation,
        city: formData.city,
        searchLocation: formData.searchLocation,
        latitude: formData.latitude,
        longitude: formData.longitude,
        serviceRadiusKm: formData.serviceRadiusKm,
      });

      if (response.success) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userData");
        try {
          await sendOTP(formData.mobile);
          setShowOTP(true);
        } catch (otpErr: any) {
          setError(otpErr.response?.data?.message || "Registration successful but failed to send OTP.");
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOTPComplete = async (otp: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await verifyOTP(formData.mobile, otp);
      if (response.success && response.data) {
        login(response.data.token, {
          id: response.data.user.id,
          name: response.data.user.sellerName,
          email: response.data.user.email,
          phone: response.data.user.mobile,
          userType: "Seller",
          storeName: response.data.user.storeName,
          status: response.data.user.status,
          address: response.data.user.address,
          city: response.data.user.city,
        });
        navigate("/seller", { replace: true });
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
      <div className="absolute top-0 left-0 w-96 h-96 bg-teal-100/30 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-[40rem] h-[40rem] bg-emerald-100/30 rounded-full blur-3xl" />

      {/* Sign Up Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-[420px] my-6 relative z-10"
      >
        <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(13,148,136,0.1)] border border-teal-100 overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-b from-teal-50/50 to-transparent p-6 pb-4 flex flex-col items-center text-center relative border-b border-teal-50">
            {/* Ambient glows */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-teal-200/20 rounded-full blur-3xl" />
            
            <div className="relative z-10 w-full flex flex-col items-center">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="mb-4"
              >
                <img
                  src="/assets/login/KlydoCardLatest.png"
                  alt="KlydoCart"
                  className="h-10 w-auto object-contain"
                />
              </motion.div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">
                Join KlydoCart
              </h1>
              <p className="text-teal-600/70 text-[9px] font-black mt-0.5 tracking-[0.2em] uppercase">
                Merchant Onboarding Portal
              </p>
            </div>
          </div>

          {/* Form Section */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {!showOTP ? (
                <motion.form 
                  key="signup-form"
                  onSubmit={handleSubmit}
                  className="space-y-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-teal-100 scrollbar-track-transparent">
                    {/* Required Information */}
                    <div className="space-y-3">
                      <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-1.5">
                        Basic Details
                      </h3>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-700 ml-1">Seller Name *</label>
                        <input
                          type="text"
                          name="sellerName"
                          value={formData.sellerName}
                          onChange={handleInputChange}
                          placeholder="Your full name"
                          className="w-full px-3 py-2.5 bg-slate-50 border border-transparent rounded-xl text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-sm font-medium"
                          disabled={loading}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-teal-800/60 uppercase tracking-[0.1em] ml-1">Mobile Number *</label>
                        <div className="relative flex items-center bg-slate-50 rounded-xl border border-transparent focus-within:border-teal-500 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(20,184,166,0.1)] transition-all overflow-hidden group">
                          <div className="pl-3 pr-2 py-2 flex items-center border-r border-slate-200 group-focus-within:border-teal-100 transition-colors">
                            <span className="text-teal-600 font-bold text-xs">+91</span>
                          </div>
                          <input
                            type="tel"
                            name="mobile"
                            value={formData.mobile}
                            onChange={handleInputChange}
                            placeholder="00000 00000"
                            maxLength={10}
                            className="w-full px-3 py-2 bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none text-sm font-bold"
                            disabled={loading}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-700 ml-1">Email Address *</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="email@example.com"
                          className="w-full px-3 py-2.5 bg-slate-50 border border-transparent rounded-xl text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-sm font-medium"
                          disabled={loading}
                        />
                      </div>
                    </div>

                    {/* Store Information */}
                    <div className="space-y-4 pt-4">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-2">
                        Store Details
                      </h3>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-700 ml-1">Store Name *</label>
                        <input
                          type="text"
                          name="storeName"
                          value={formData.storeName}
                          onChange={handleInputChange}
                          placeholder="Your business name"
                          className="w-full px-3 py-2.5 bg-slate-50 border border-transparent rounded-xl text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-sm font-medium"
                          disabled={loading}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 ml-1">Business Categories *</label>
                        <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-transparent">
                          {categories.map((cat) => {
                            const checked = formData.categories.includes(cat.name);
                            return (
                              <label key={cat._id} className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer hover:text-teal-600 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleCategory(cat.name)}
                                  disabled={loading}
                                  className="h-4 w-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                                />
                                <span>{cat.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 ml-1">Store Location *</label>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <GoogleMapsAutocomplete
                              value={formData.searchLocation}
                              onChange={(address, lat, lng, placeName, components) => {
                                setFormData((prev) => ({
                                  ...prev,
                                  searchLocation: address,
                                  latitude: lat.toString(),
                                  longitude: lng.toString(),
                                  address: address,
                                  city: components?.city || prev.city,
                                }));
                              }}
                              placeholder="Search address..."
                              disabled={loading}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (navigator.geolocation) {
                                setLoading(true);
                                navigator.geolocation.getCurrentPosition(
                                  (pos) => {
                                    const { latitude, longitude } = pos.coords;
                                    setFormData(p => ({ 
                                      ...p, 
                                      latitude: latitude.toString(), 
                                      longitude: longitude.toString(),
                                      searchLocation: "Your Location",
                                      address: "Your Current Location"
                                    }));
                                    setLoading(false);
                                  },
                                  () => { setError("Location access denied"); setLoading(false); }
                                );
                              }
                            }}
                            className="p-3 bg-teal-50 text-teal-600 rounded-xl border border-teal-100 hover:bg-teal-100 transition-all shadow-sm">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3m-7-10H2m20 0h-3"/>
                            </svg>
                          </button>
                        </div>
                        {formData.latitude && (
                           <div className="mt-3 rounded-xl overflow-hidden border border-slate-100">
                             <LocationPickerMap
                               initialLat={parseFloat(formData.latitude)}
                               initialLng={parseFloat(formData.longitude)}
                               onLocationSelect={(lat, lng) => setFormData(p => ({ ...p, latitude: lat.toString(), longitude: lng.toString() }))}
                             />
                           </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-700 ml-1">Service Radius (KM) *</label>
                        <input
                          type="number"
                          name="serviceRadiusKm"
                          value={formData.serviceRadiusKm}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-transparent rounded-xl text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-sm font-medium"
                          disabled={loading}
                          min="0.1"
                        />
                        <p className="text-[9px] text-slate-400 ml-1">Only customers in this range can order</p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-700 ml-1">City *</label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          placeholder="Your city"
                          className="w-full px-3 py-2.5 bg-slate-50 border border-transparent rounded-xl text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-sm font-medium"
                          disabled={loading}
                        />
                      </div>
                    </div>

                    {/* Optional Details */}
                    <div className="space-y-4 pt-4">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-2">
                        Banking & Tax (Optional)
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          name="panCard"
                          value={formData.panCard}
                          onChange={handleInputChange}
                          placeholder="PAN Card"
                          className="px-4 py-3 bg-slate-50 border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:border-teal-500 outline-none transition-all placeholder:text-slate-300"
                        />
                        <input
                          name="taxNumber"
                          value={formData.taxNumber}
                          onChange={handleInputChange}
                          placeholder="GST Number"
                          className="px-4 py-3 bg-slate-50 border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:border-teal-500 outline-none transition-all placeholder:text-slate-300"
                        />
                        <input
                          name="ifsc"
                          value={formData.ifsc}
                          onChange={handleInputChange}
                          placeholder="IFSC Code"
                          className="col-span-2 px-4 py-3 bg-slate-50 border border-transparent rounded-xl text-sm font-medium focus:bg-white focus:border-teal-500 outline-none transition-all placeholder:text-slate-300"
                        />
                      </div>
                    </div>
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] font-medium text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 italic">
                      {error}
                    </motion.div>
                  )}

                  <div className="flex justify-center">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-8 py-2.5 bg-[#0d9488] text-white rounded-lg font-bold text-[10px] tracking-[0.1em] shadow-lg shadow-teal-900/5 hover:bg-[#0f766e] active:scale-[0.98] transition-all disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none uppercase"
                    >
                      {loading ? "PROCESSING..." : "REGISTER MERCHANT ACCOUNT"}
                    </button>
                  </div>

                  <div className="text-center pt-2">
                    <p className="text-xs text-slate-500 font-medium font-sans">
                      Already a partner?{" "}
                      <button type="button" onClick={() => navigate("/seller/login")} className="text-teal-600 font-bold ml-1 hover:underline">Login here</button>
                    </p>
                  </div>
                </motion.form>
              ) : (
                <motion.div 
                  key="otp-step"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-1">
                    <p className="text-xs text-slate-500 font-medium">Verify your mobile</p>
                    <p className="text-sm font-bold text-slate-900">+91 {formData.mobile}</p>
                  </div>
                  <OTPInput onComplete={handleOTPComplete} disabled={loading} />
                  {error && <div className="text-[10px] text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 text-center">{error}</div>}
                  <div className="flex gap-3">
                    <button onClick={() => setShowOTP(false)} className="flex-1 py-3 bg-slate-50 text-slate-500 rounded-xl font-bold text-xs hover:bg-slate-100 transition-all border border-slate-200 uppercase tracking-widest">Go Back</button>
                    <button onClick={async () => { setLoading(true); try { await sendOTP(formData.mobile); } finally { setLoading(false); } }} className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold text-xs hover:bg-teal-700 transition-all shadow-md shadow-teal-600/20 uppercase tracking-widest">Resend OTP</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <p className="mt-8 text-[10px] text-slate-400 text-center font-bold tracking-widest uppercase">
          KlydoCart Merchant Program • 2024
        </p>
      </motion.div>
    </div>
  );
}
