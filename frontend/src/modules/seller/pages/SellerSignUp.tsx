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
import { useJsApiLoader } from "@react-google-maps/api";

const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ["places"];

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

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: libraries,
  });

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
    } else if (name === "sellerName" || name === "city" || name === "accountName" || name === "bankName") {
      // Only alphabets and spaces
      setFormData((prev) => ({
        ...prev,
        [name]: value.replace(/[^a-zA-Z\s]/g, ""),
      }));
    } else if (name === "accountNumber") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.replace(/\D/g, "").slice(0, 15),
      }));
    } else if (name === "ifsc") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.toUpperCase().slice(0, 11),
      }));
    } else if (name === "panCard") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.toUpperCase().slice(0, 10),
      }));
    } else if (name === "taxNumber") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.toUpperCase().slice(0, 15),
      }));
    } else if (name === "serviceRadiusKm") {
      const cleanedValue = value.replace(/[^0-9.]/g, "");
      const finalValue = cleanedValue.split(".").length > 2 ? cleanedValue.substring(0, cleanedValue.lastIndexOf(".")) : cleanedValue;

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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address (e.g. name@example.com)");
      return;
    }

    if (formData.mobile.length !== 10) { setError("Please enter a valid 10-digit mobile number"); return; }

    setLoading(true);
    setError("");

    try {
      if (!formData.latitude || !formData.longitude) {
        setError("Please select your store location using the location search or map");
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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="fixed top-6 left-6 z-20 flex gap-2">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-slate-50 transition-all active:scale-95 border border-slate-100"
          aria-label="Back">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M15 18L9 12L15 6" />
          </svg>
        </button>
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-slate-50 transition-all active:scale-95 border border-slate-100"
          aria-label="Home"
          title="Go to Website Home">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </button>
      </div>

      {/* Sign Up Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-[420px] my-6 relative z-10"
      >
        <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(13,148,136,0.1)] border border-teal-100 overflow-hidden">
          {/* Header Section */}
          <div className="p-6 pb-4 flex flex-col items-center text-center relative">
            {/* Ambient glows */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-teal-200/20 rounded-full blur-3xl" />

            <div className="relative z-10 w-full flex flex-col items-center">
              <div className="mb-4">
                <img
                  src="/assets/login/KlydoCardLatest.png"
                  alt="KlydoCart"
                  className="h-10 w-auto object-contain"
                />
              </div>
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
                    {/* Basic Details */}
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
                          spellCheck={false}
                          autoComplete="off"
                          className={`w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-slate-900 placeholder:text-slate-500 focus:outline-none focus:bg-white transition-all text-sm font-medium ${formData.sellerName && !/^[a-zA-Z\s]*$/.test(formData.sellerName) ? 'border-red-500' : 'border-transparent focus:border-teal-500'}`}
                          disabled={loading}
                        />
                        {formData.sellerName && !/^[a-zA-Z\s]*$/.test(formData.sellerName) && (
                          <p className="text-[9px] text-red-500 font-bold ml-1 italic">Only alphabets allowed</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-teal-800/60 uppercase tracking-[0.1em] ml-1">Mobile Number *</label>
                        <div className="relative flex items-center bg-slate-50 rounded-xl border border-transparent focus-within:border-teal-500 focus-within:bg-white transition-all overflow-hidden group">
                          <div className="pl-3 pr-2 py-2 flex items-center border-r border-slate-200">
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
                        {formData.mobile && formData.mobile.length !== 10 && (
                          <p className="text-[9px] text-red-500 font-bold ml-1 italic">Must be exactly 10 digits</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-700 ml-1">Email Address *</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="email@example.com"
                          spellCheck={false}
                          className={`w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-slate-900 placeholder:text-slate-500 focus:outline-none focus:bg-white transition-all text-sm font-medium ${formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ? 'border-red-500' : 'border-transparent focus:border-teal-500'}`}
                          disabled={loading}
                        />
                        {formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
                          <p className="text-[9px] text-red-500 font-bold ml-1 italic">Invalid email format</p>
                        )}
                      </div>
                    </div>

                    {/* Store Information */}
                    <div className="space-y-4 pt-4">
                      <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-2">
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
                          className="w-full px-3 py-2.5 bg-slate-50 border border-transparent rounded-xl text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-sm font-medium"
                          disabled={loading}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 ml-1">Business Categories *</label>
                        <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-transparent">
                          {categories.map((cat) => (
                            <label key={cat._id} className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer hover:text-teal-600 transition-colors">
                              <input
                                type="checkbox"
                                checked={formData.categories.includes(cat.name)}
                                onChange={() => toggleCategory(cat.name)}
                                disabled={loading}
                                className="h-4 w-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                              />
                              <span>{cat.name}</span>
                            </label>
                          ))}
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
                                  async (pos) => {
                                    const { latitude, longitude } = pos.coords;
                                    
                                    let address = "Your Current Location";
                                    let city = formData.city;

                                    // Attempt reverse geocoding if Google Maps is loaded
                                    if (isLoaded && (window as any).google && (window as any).google.maps) {
                                      const geocoder = new (window as any).google.maps.Geocoder();
                                      try {
                                        const response = await geocoder.geocode({
                                          location: { lat: latitude, lng: longitude }
                                        });
                                        if (response.results && response.results[0]) {
                                          address = response.results[0].formatted_address;
                                          // Try to extract city from components
                                          for (const component of response.results[0].address_components) {
                                            if (component.types.includes('locality')) {
                                              city = component.long_name;
                                              break;
                                            } else if (component.types.includes('administrative_area_level_3') && !city) {
                                              city = component.long_name;
                                            }
                                          }
                                        }
                                      } catch (err) {
                                        console.error("Reverse geocoding error:", err);
                                      }
                                    }

                                    setFormData(p => ({
                                      ...p,
                                      latitude: latitude.toString(),
                                      longitude: longitude.toString(),
                                      searchLocation: address,
                                      address: address,
                                      city: city || p.city
                                    }));
                                    setLoading(false);
                                  },
                                  () => { setError("Location access denied"); setLoading(false); }
                                );
                              }
                            }}
                            className="p-3 bg-teal-50 text-teal-600 rounded-xl border border-teal-100 hover:bg-teal-100 transition-all shadow-sm">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="3" /><path d="M12 2v3m0 14v3m-7-10H2m20 0h-3" />
                            </svg>
                          </button>
                        </div>
                        
                        {/* Dedicated Full Address Field */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-700 ml-1">Full Address *</label>
                          <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            placeholder="Full address will appear here..."
                            rows={3}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-transparent rounded-xl text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-sm font-medium resize-none"
                            disabled={loading}
                          />
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
                          className="w-full px-3 py-2.5 bg-slate-50 border border-transparent rounded-xl text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-sm font-medium"
                          disabled={loading}
                          min="0.1"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-700 ml-1">City *</label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          placeholder="Your city"
                          className={`w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-slate-900 placeholder:text-slate-500 focus:outline-none focus:bg-white transition-all text-sm font-medium ${formData.city && !/^[a-zA-Z\s]*$/.test(formData.city) ? 'border-red-500' : 'border-transparent focus:border-teal-500'}`}
                          disabled={loading}
                        />
                        {formData.city && !/^[a-zA-Z\s]*$/.test(formData.city) && (
                          <p className="text-[9px] text-red-500 font-bold ml-1 italic">Only alphabets allowed</p>
                        )}
                      </div>
                    </div>

                    {/* Optional Details */}
                    <div className="space-y-4 pt-4">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-2">
                        Banking & Tax (Optional)
                      </h3>
                      <div className="space-y-4 mt-3">
                        {/* PAN and GST */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <input
                              name="panCard"
                              value={formData.panCard}
                              onChange={handleInputChange}
                              placeholder="PAN Card"
                              className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-medium focus:bg-white transition-all outline-none placeholder:text-slate-500 ${formData.panCard && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panCard) ? 'border-red-500' : 'border-transparent focus:border-teal-500'}`}
                            />
                            {formData.panCard && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panCard) && (
                              <p className="text-[9px] text-red-500 font-bold ml-1">Invalid PAN format (e.g. ABCDE1234F)</p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <input
                              name="taxNumber"
                              value={formData.taxNumber}
                              onChange={handleInputChange}
                              placeholder="GST Number"
                              className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-medium focus:bg-white transition-all outline-none placeholder:text-slate-500 ${formData.taxNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/.test(formData.taxNumber) ? 'border-red-500' : 'border-transparent focus:border-teal-500'}`}
                            />
                            {formData.taxNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/.test(formData.taxNumber) && (
                              <p className="text-[9px] text-red-500 font-bold ml-1 text-right">Invalid GST (15 digits required)</p>
                            )}
                          </div>
                        </div>

                        {/* Account Name and Bank Name */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <input
                              name="accountName"
                              value={formData.accountName}
                              onChange={handleInputChange}
                              placeholder="Account Holder Name"
                              className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-medium focus:bg-white transition-all outline-none placeholder:text-slate-500 ${formData.accountName && !/^[a-zA-Z\s]*$/.test(formData.accountName) ? 'border-red-500' : 'border-transparent focus:border-teal-500'}`}
                            />
                            {formData.accountName && !/^[a-zA-Z\s]*$/.test(formData.accountName) && (
                              <p className="text-[9px] text-red-500 font-bold ml-1 italic">Only alphabets allowed</p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <input
                              name="bankName"
                              value={formData.bankName}
                              onChange={handleInputChange}
                              placeholder="Bank Name"
                              className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-medium focus:bg-white transition-all outline-none placeholder:text-slate-500 ${formData.bankName && !/^[a-zA-Z\s]*$/.test(formData.bankName) ? 'border-red-500' : 'border-transparent focus:border-teal-500'}`}
                            />
                            {formData.bankName && !/^[a-zA-Z\s]*$/.test(formData.bankName) && (
                              <p className="text-[9px] text-red-500 font-bold ml-1 italic text-right">Only alphabets allowed</p>
                            )}
                          </div>
                        </div>

                        {/* Account Number and IFSC */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <input
                              name="accountNumber"
                              value={formData.accountNumber}
                              onChange={handleInputChange}
                              placeholder="Account Number"
                              className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-medium focus:bg-white transition-all outline-none placeholder:text-slate-500 ${formData.accountNumber && (formData.accountNumber.length < 9 || formData.accountNumber.length > 15) ? 'border-red-500' : 'border-transparent focus:border-teal-500'}`}
                            />
                            {formData.accountNumber && (formData.accountNumber.length < 9 || formData.accountNumber.length > 15) && (
                              <p className="text-[9px] text-red-500 font-bold ml-1">Must be 9-15 digits</p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <input
                              name="ifsc"
                              value={formData.ifsc}
                              onChange={handleInputChange}
                              placeholder="IFSC Code"
                              className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-medium focus:bg-white transition-all outline-none placeholder:text-slate-500 ${formData.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc) ? 'border-red-500' : 'border-transparent focus:border-teal-500'}`}
                            />
                            {formData.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc) && (
                              <p className="text-[9px] text-red-500 font-bold ml-1 text-right">Invalid IFSC (e.g. SBIN0000456)</p>
                            )}
                          </div>
                        </div>
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
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Verify Mobile</p>
                    <p className="text-sm font-bold text-slate-900">+91 {formData.mobile}</p>
                  </div>
                  <OTPInput onComplete={handleOTPComplete} disabled={loading} />
                  {error && <div className="text-[10px] text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 text-center">{error}</div>}
                  <div className="flex gap-3">
                    <button onClick={() => setShowOTP(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all border border-slate-200 uppercase tracking-widest">Go Back</button>
                    <button onClick={async () => { setLoading(true); try { await sendOTP(formData.mobile); } finally { setLoading(false); } }} className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold text-xs hover:bg-teal-700 transition-all shadow-md shadow-teal-600/20 uppercase tracking-widest">Resend</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <p className="mt-8 text-[10px] text-slate-400 text-center font-bold tracking-widest uppercase opacity-70">
          KlydoCart Merchant Program
        </p>
      </motion.div>
    </div>
  );
}
