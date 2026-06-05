import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getSellerProfile, updateSellerProfile } from '../../../services/api/auth/sellerAuthService';
import { useAuth } from '../../../context/AuthContext';
import { getHeaderCategoriesPublic } from '../../../services/api/headerCategoryService';
import GoogleMapsAutocomplete from '../../../components/GoogleMapsAutocomplete';
import LocationPickerMap from '../../../components/LocationPickerMap';
import { useToast } from '../../../context/ToastContext';

const SellerAccountSettings = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Initial state with empty values
  const [sellerData, setSellerData] = useState({
    sellerName: '',
    email: '',
    mobile: '',
    storeName: '',
    category: '',
    address: '',
    city: '',
    searchLocation: '',
    latitude: '',
    longitude: '',
    serviceRadiusKm: '10',
    panCard: '',
    taxName: '',
    taxNumber: '',
    accountName: '',
    bankName: '',
    branch: '',
    accountNumber: '',
    ifsc: '',
    profile: '',
    logo: '',
    storeBanner: '',
    storeDescription: '',
    commission: 0,
    status: '',
    categories: [] as string[],
    newPassword: '',
    confirmPassword: ''
  });

  const [headerCategories, setHeaderCategories] = useState<any[]>([]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['profile', 'store', 'branding', 'bank'].includes(tab)) {
      setActiveTab(tab);
      // If redirected to bank tab, automatically enable editing mode
      if (tab === 'bank') {
        setIsEditing(true);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    fetchProfile();
    fetchHeaderCategories();
  }, []);

  const fetchHeaderCategories = async () => {
    try {
      const res = await getHeaderCategoriesPublic();
      if (Array.isArray(res)) {
        setHeaderCategories(res.filter((cat: any) => cat.status === 'Published'));
      }
    } catch (err) {
      console.error('Error fetching header categories:', err);
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await getSellerProfile();
      if (response.success) {
        const data = response.data;
        // Map location data to state
        const locationCoords = data.location?.coordinates || [];
        setSellerData({
          ...data,
          categories: data.categories || (data.category ? [data.category] : []),
          latitude: data.latitude || (locationCoords[1]?.toString() || ''),
          longitude: data.longitude || (locationCoords[0]?.toString() || ''),
          searchLocation: data.searchLocation || data.address || '',
          serviceRadiusKm: (data.serviceRadiusKm || 10).toString(),
        });
      } else {
        setError(response.message || 'Failed to fetch profile');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error loading profile');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (catName: string) => {
    if (!isEditing) return;
    setSellerData(prev => {
      const exists = prev.categories.includes(catName);
      const nextCategories = exists
        ? prev.categories.filter(c => c !== catName)
        : [...prev.categories, catName];
      return {
        ...prev,
        categories: nextCategories,
        category: nextCategories[0] || ''
      };
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Immediate validation
    let error = "";
    if (name === 'sellerName') {
      if (!/^[a-zA-Z\s]*$/.test(value)) {
        error = "Name should only contain alphabets";
      }
    } else if (name === 'accountName' || name === 'bankName') {
      if (value.length > 0 && !/^[a-zA-Z\s]*$/.test(value)) {
        error = `${name === 'accountName' ? 'Account Holder' : 'Bank'} Name should only contain alphabets`;
      }
    } else if (name === 'accountNumber') {
      if (value.length > 0) {
        if (!/^\d*$/.test(value)) {
          error = "Only digits allowed";
        } else if (value.length < 9 || value.length > 18) {
          error = "Must be 9-18 digits";
        }
      }
    } else if (name === 'ifsc') {
      const val = value.toUpperCase();
      if (val.length > 0 && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(val)) {
        error = "Format: ABCD0123456 (4 letters, 0, 6 alpha-numeric)";
      }
    } else if (name === 'taxNumber') {
      const trimmedValue = value.trim().toUpperCase();
      if (trimmedValue.length > 0 && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/.test(trimmedValue)) {
        error = "Format: 22AAAAA0000A1Z5";
      }
    } else if (name === 'panCard') {
      const trimmedValue = value.trim().toUpperCase();
      if (trimmedValue.length > 0 && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(trimmedValue)) {
        error = "Format: ABCDE1234F";
      }
    } else if (name === 'email') {
      if (value.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        error = "Please enter a valid email address";
      }
    } else if (name === 'mobile') {
      if (value.length > 0 && !/^\d{0,10}$/.test(value)) {
        return; // Don't allow non-digits or more than 10 chars
      }
    }

    setFormErrors(prev => ({ ...prev, [name]: error }));
    setSellerData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'logo' | 'storeBanner') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSellerData(prev => ({
          ...prev,
          [type]: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaveLoading(true);
      setError('');

      const errors: Record<string, string> = {};
      
      if (!sellerData.sellerName.trim()) {
        errors.sellerName = "Full Name is required";
      } else if (!/^[a-zA-Z\s]+$/.test(sellerData.sellerName)) {
        errors.sellerName = "Name must only contain letters";
      }

      if (sellerData.mobile.length !== 10) {
        errors.mobile = "Mobile number must be exactly 10 digits";
      }

      if (sellerData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sellerData.email)) {
        errors.email = "Please enter a valid email format";
      }

      // Bank & Tax Validations
      if (sellerData.accountName && !/^[a-zA-Z\s]+$/.test(sellerData.accountName)) {
        errors.accountName = "Name must only contain letters";
      }
      if (sellerData.bankName && !/^[a-zA-Z\s]+$/.test(sellerData.bankName)) {
        errors.bankName = "Bank Name must only contain letters";
      }
      if (sellerData.accountNumber) {
        if (!/^\d+$/.test(sellerData.accountNumber)) {
          errors.accountNumber = "Account Number must be digits only";
        } else if (sellerData.accountNumber.length < 9 || sellerData.accountNumber.length > 18) {
          errors.accountNumber = "Account Number must be 9-18 digits";
        }
      }
      if (sellerData.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(sellerData.ifsc.toUpperCase())) {
        errors.ifsc = "Invalid IFSC. Format: ABCD0123456";
      }
      if (sellerData.panCard && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(sellerData.panCard.trim().toUpperCase())) {
        errors.panCard = "Invalid PAN. Format: ABCDE1234F";
      }
      if (sellerData.taxNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/.test(sellerData.taxNumber.trim().toUpperCase())) {
        errors.taxNumber = "Invalid GST. Format: 22AAAAA0000A1Z5";
      }

      if (sellerData.newPassword || sellerData.confirmPassword) {
        if (sellerData.newPassword !== sellerData.confirmPassword) {
          errors.confirmPassword = "Passwords do not match";
        } else if (sellerData.newPassword.length < 6) {
          errors.newPassword = "Password must be at least 6 characters";
        }
      }

      if (!sellerData.storeName.trim()) {
        errors.storeName = "Store Name is required";
      }
      
      if (sellerData.categories.length === 0) {
        errors.category = "Please select at least one category";
      }

      if (!sellerData.address?.trim() && !sellerData.searchLocation?.trim()) {
        errors.address = "Store Location is required";
      }

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        showToast('Please fix the validation errors before saving', 'error');
        console.error('Validation errors:', errors);
        setSaveLoading(false);

        // Auto-switch to the first tab that has an error
        if (errors.sellerName || errors.email || errors.mobile || errors.newPassword || errors.confirmPassword) {
          setActiveTab('profile');
        } else if (errors.storeName || errors.category || errors.address) {
          setActiveTab('store');
        } else if (errors.accountName || errors.bankName || errors.accountNumber || errors.ifsc || errors.panCard || errors.taxNumber) {
          setActiveTab('bank');
        }

        return;
      }

      // Validate location if address is being updated
      if (sellerData.searchLocation && (!sellerData.latitude || !sellerData.longitude)) {
        setError('Please select a valid location using the map picker');
        setSaveLoading(false);
        return;
      }

      // Validate service radius
      const radius = parseFloat(sellerData.serviceRadiusKm);
      if (isNaN(radius) || radius < 0.1 || radius > 100) {
        setError('Service radius must be between 0.1 and 100 kilometers');
        setSaveLoading(false);
        return;
      }

      const updateData = {
        ...sellerData,
        serviceRadiusKm: radius,
      };

      const response = await updateSellerProfile(updateData);
      if (response.success) {
        setIsEditing(false);
        const data = response.data;
        const locationCoords = data.location?.coordinates || [];
        setSellerData({
          ...data,
          latitude: data.latitude || (locationCoords[1]?.toString() || ''),
          longitude: data.longitude || (locationCoords[0]?.toString() || ''),
          searchLocation: data.searchLocation || data.address || '',
          serviceRadiusKm: (data.serviceRadiusKm || 10).toString(),
        });
        if (updateUser) {
          updateUser({
            ...user,
            ...data,
            id: data._id || user?.id
          });
        }
        setError('');
        showToast('Profile updated successfully!', 'success');
      } else {
        const msg = response.message || 'Failed to update profile';
        setError(msg);
        showToast(msg, 'error');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error updating profile';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading && !sellerData.sellerName) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'profile',
      label: 'Profile Info',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      id: 'store',
      label: 'Store Details',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      id: 'branding',
      label: 'Store Branding',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'bank',
      label: 'Bank & Tax',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Account Settings</h1>
              <div className="flex items-center gap-2 text-sm mt-1">
                <span 
                  onClick={() => navigate('/seller')} 
                  className="cursor-pointer text-blue-600 hover:text-blue-700 hover:underline font-medium"
                >
                  Home
                </span>
                <span className="text-gray-400">/</span>
                <span className="text-gray-600">Settings</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">Manage your store preferences and profile details</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsEditing(!isEditing)}
              className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm flex items-center gap-2 ${isEditing
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                : 'bg-teal-600 text-white hover:bg-teal-700 hover:shadow-md'
                }`}
            >
              {isEditing ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  Cancel Editing
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  Edit Profile
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <nav className="w-full lg:w-64 flex-shrink-0 space-y-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === tab.id
                    ? 'bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-200'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`${activeTab === tab.id ? 'text-teal-600' : 'text-gray-400'}`}>
                      {tab.icon}
                    </span>
                    {tab.label}
                  </div>
                  {/* Error indicator dot */}
                  {((tab.id === 'profile' && (formErrors.sellerName || formErrors.email || formErrors.mobile || formErrors.newPassword || formErrors.confirmPassword)) ||
                    (tab.id === 'store' && (formErrors.storeName || formErrors.category || formErrors.address)) ||
                    (tab.id === 'bank' && (formErrors.accountName || formErrors.bankName || formErrors.accountNumber || formErrors.ifsc || formErrors.panCard || formErrors.taxNumber))) && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  )}
                </button>
              ))}
            </div>

            {/* Status Card */}
            <div className="mt-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
                  Account Status
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
                  {sellerData.sellerName?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{sellerData.sellerName}</p>
                  <p className="text-xs text-indigo-100 uppercase">{sellerData.status || 'Active'}</p>
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content Area */}
          <div className="flex-1">
            {/* Inline Error removed in favor of Toast as per user request */}

            <form onSubmit={handleSubmit}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  <div className="p-6 md:p-8">
                    {activeTab === 'profile' && (
                      <div className="space-y-8">
                        <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-gray-100">
                          <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-tr from-teal-500 to-emerald-500 rounded-full blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
                            <img
                              src={sellerData.profile || 'https://placehold.co/150'}
                              alt="Profile"
                              className="relative w-32 h-32 rounded-full object-cover border-4 border-white shadow-md bg-white"
                            />
                            {isEditing && (
                              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-sm z-10">
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => handleFileChange(e, 'profile')}
                                />
                                <span className="text-white text-xs font-bold uppercase tracking-wider flex flex-col items-center gap-1">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                  Change
                                </span>
                              </label>
                            )}
                          </div>
                          <div className="text-center sm:text-left">
                            <h3 className="text-2xl font-bold text-gray-900">{sellerData.sellerName || 'Seller Name'}</h3>
                            <p className="text-gray-500 font-medium">{sellerData.email}</p>
                            <p className="text-xs text-gray-400 mt-1">Member since {new Date().getFullYear()}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <InputGroup label="Full Name" name="sellerName" value={sellerData.sellerName} onChange={handleInputChange} disabled={!isEditing} autoComplete="name" error={formErrors.sellerName} />
                          <InputGroup label="Email Address" name="email" value={sellerData.email} onChange={handleInputChange} disabled={!isEditing} type="email" autoComplete="email" error={formErrors.email} />
                          <InputGroup label="Mobile Number" name="mobile" value={sellerData.mobile} onChange={handleInputChange} disabled={!isEditing} type="tel" autoComplete="tel" error={formErrors.mobile} />

                          <InputGroup 
                            label="New Password" 
                            name="newPassword" 
                            value={sellerData.newPassword} 
                            onChange={handleInputChange} 
                            disabled={!isEditing} 
                            type="password" 
                            autoComplete="new-password" 
                            placeholder="Leave blank to keep current"
                            error={formErrors.newPassword}
                          />
                          <InputGroup 
                            label="Confirm Password" 
                            name="confirmPassword" 
                            value={sellerData.confirmPassword} 
                            onChange={handleInputChange} 
                            disabled={!isEditing} 
                            type="password" 
                            autoComplete="new-password" 
                            placeholder="Confirm your new password"
                            error={formErrors.confirmPassword}
                          />
                        </div>
                      </div>
                    )}

                    {activeTab === 'store' && (
                      <div className="space-y-8">
                        <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-gray-100">
                          <div className="relative group flex-shrink-0">
                            <div className="w-24 h-24 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden">
                              <img
                                src={sellerData.logo || 'https://placehold.co/100'}
                                alt="Store Logo"
                                className="w-full h-full object-contain"
                              />
                            </div>
                            {isEditing && (
                              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-sm">
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => handleFileChange(e, 'logo')}
                                />
                                <span className="text-white text-xs font-bold">UPLOAD</span>
                              </label>
                            )}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">{sellerData.storeName || 'Store Name'}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-700 uppercase tracking-wide">
                                {sellerData.category || 'Category'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <InputGroup label="Store Name" name="storeName" value={sellerData.storeName} onChange={handleInputChange} disabled={!isEditing} />

                          <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Store Categories (Multiple selection allowed)</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                              {headerCategories.map((cat) => (
                                <label 
                                  key={cat._id} 
                                  className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                                    sellerData.categories.includes(cat.name)
                                      ? 'bg-teal-50 border-teal-200 text-teal-700'
                                      : 'bg-white border-gray-100 text-gray-600 hover:border-gray-200'
                                  } ${!isEditing ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={sellerData.categories.includes(cat.name)}
                                    onChange={() => toggleCategory(cat.name)}
                                    disabled={!isEditing}
                                    className="hidden"
                                  />
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                    sellerData.categories.includes(cat.name) ? 'bg-teal-600 border-teal-600' : 'bg-white border-gray-300'
                                  }`}>
                                    {sellerData.categories.includes(cat.name) && (
                                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                    )}
                                  </div>
                                  <span className="text-xs font-medium truncate">{cat.name}</span>
                                </label>
                              ))}
                            </div>
                            {!isEditing && sellerData.categories.length === 0 && (
                              <p className="text-xs text-gray-400 italic ml-1">No categories selected</p>
                            )}
                            {formErrors.category && isEditing && (
                              <p className="mt-1 text-[10px] text-red-500 font-bold ml-1">{formErrors.category}</p>
                            )}
                          </div>

                          <div className="md:col-span-2 space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">
                              Store Location <span className="text-red-500">*</span>
                            </label>
                            {isEditing ? (
                              <>
                                <GoogleMapsAutocomplete
                                  value={sellerData.searchLocation || sellerData.address || ''}
                                  onChange={(address: string, lat: number, lng: number, placeName: string, components?: { city?: string; state?: string }) => {
                                    setSellerData(prev => ({
                                      ...prev,
                                      searchLocation: address,
                                      latitude: lat.toString(),
                                      longitude: lng.toString(),
                                      address: address,
                                      city: components?.city || prev.city,
                                    }));
                                    if (formErrors.address) {
                                      setFormErrors(prev => {
                                        const next = { ...prev };
                                        delete next.address;
                                        return next;
                                      });
                                    }
                                  }}
                                  placeholder="Search and select your store location..."
                                  disabled={!isEditing}
                                  required
                                  className={formErrors.address ? 'border-red-400 focus:border-red-500' : ''}
                                />
                                {formErrors.address && (
                                  <p className="mt-1 text-[10px] text-red-500 font-bold ml-1">{formErrors.address}</p>
                                )}
                                  <div className="mt-4 animate-fadeIn">
                                    <p className="text-sm font-medium text-neutral-700 mb-2">
                                      Exact Location
                                    </p>

                                    <button
                                      type="button"
                                      disabled={sellerData.searchLocation === 'Fetching location...'}
                                      onClick={() => {
                                        if (navigator.geolocation) {
                                          setSellerData(prev => ({
                                            ...prev,
                                            searchLocation: 'Fetching location...'
                                          }));
                                          navigator.geolocation.getCurrentPosition(
                                            (position) => {
                                              const lat = position.coords.latitude;
                                              const lng = position.coords.longitude;
                                              
                                              setSellerData(prev => ({
                                                ...prev,
                                                latitude: lat.toString(),
                                                longitude: lng.toString()
                                              }));

                                              const fallbackToNominatim = (latitude: number, longitude: number) => {
                                                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
                                                  .then(res => res.json())
                                                  .then(data => {
                                                    if (data && data.address) {
                                                      const { city: nCity, town, village, state_district } = data.address;
                                                      const locCity = nCity || town || village || state_district || '';
                                                      
                                                      const customAddress = data.display_name;

                                                      setSellerData(prev => ({
                                                        ...prev,
                                                        searchLocation: customAddress,
                                                        address: customAddress,
                                                        ...(locCity ? { city: locCity } : {})
                                                      }));
                                                      showToast('Location fetched successfully.', 'success');
                                                    } else {
                                                      setSellerData(prev => ({ ...prev, searchLocation: '' }));
                                                      showToast('Coordinates fetched, but address not found', 'warning');
                                                    }
                                                  })
                                                  .catch(err => {
                                                    console.error("Geocoding failed", err);
                                                    setSellerData(prev => ({ ...prev, searchLocation: '' }));
                                                    showToast('Failed to get address from coordinates.', 'error');
                                                  });
                                              };

                                              const google = (window as any).google;
                                              if (google && google.maps && google.maps.Geocoder) {
                                                const geocoder = new google.maps.Geocoder();
                                                geocoder.geocode({ location: { lat, lng } }, (results: any, status: string) => {
                                                  if (status === 'OK' && results && results[0]) {
                                                    const components = results[0].address_components;
                                                    
                                                    const getComponent = (types: string[]) => {
                                                      for (const comp of components) {
                                                        if (types.some((t: string) => comp.types.includes(t))) {
                                                          return comp.long_name;
                                                        }
                                                      }
                                                      return '';
                                                    };

                                                    const locCity = getComponent(['locality', 'administrative_area_level_3']);
                                                    const customAddress = results[0].formatted_address;
                                                    
                                                    setSellerData(prev => ({
                                                      ...prev,
                                                      searchLocation: customAddress,
                                                      address: customAddress,
                                                      ...(locCity ? { city: locCity } : {})
                                                    }));
                                                    showToast('Location fetched successfully.', 'success');
                                                  } else {
                                                    fallbackToNominatim(lat, lng);
                                                  }
                                                });
                                              } else {
                                                fallbackToNominatim(lat, lng);
                                              }
                                            },
                                            (error) => {
                                              console.error("Error fetching location", error);
                                              setSellerData(prev => ({ ...prev, searchLocation: '' }));
                                              if (error.code === error.PERMISSION_DENIED) {
                                                showToast('Location access denied. Please enter your store location manually.', 'error');
                                              } else {
                                                showToast('Unable to fetch location. Please allow location access.', 'error');
                                              }
                                            }
                                          );
                                        } else {
                                          showToast('Geolocation is not supported by your browser', 'error');
                                        }
                                      }}
                                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                      {sellerData.searchLocation === 'Fetching location...' ? (
                                        <>
                                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                          </svg>
                                          Fetching...
                                        </>
                                      ) : (
                                        <>
                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                          </svg>
                                          Fetch Location Automatically
                                        </>
                                      )}
                                    </button>
                                    <p className="mt-2 text-xs text-neutral-500 text-center">
                                      Selected Coordinates: {sellerData.latitude || 'Not selected'}, {sellerData.longitude || 'Not selected'}
                                    </p>
                                  </div>
                              </>
                            ) : (
                              <textarea
                                name="address"
                                value={sellerData.address || sellerData.searchLocation || ''}
                                disabled={true}
                                rows={3}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-gray-50/50 text-gray-500 resize-none"
                              />
                            )}
                          </div>

                          <InputGroup label="City" name="city" value={sellerData.city} onChange={handleInputChange} disabled={!isEditing} />

                          <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">
                              Service Radius (KM) <span className="text-red-500">*</span>
                            </label>
                            <select
                              name="serviceRadiusKm"
                              value={sellerData.serviceRadiusKm}
                              onChange={handleInputChange}
                              disabled={!isEditing}
                              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none disabled:bg-gray-50/50 disabled:text-gray-500 transition-all appearance-none bg-white"
                            >
                              <option value="1">1 km</option>
                              <option value="2">2 km</option>
                              <option value="5">5 km</option>
                              <option value="10">10 km</option>
                              <option value="20">20 km</option>
                              <option value="50">50 km</option>
                            </select>
                            {isEditing && (
                              <p className="mt-1 text-xs text-gray-500">
                                Products will be shown to users within this radius from your store location
                              </p>
                            )}
                          </div>

                        </div>
                      </div>
                    )}

                    {activeTab === 'branding' && (
                      <div className="space-y-8">
                        <div className="space-y-3">
                          <label className="text-sm font-semibold text-gray-700 ml-1">Store Banner</label>
                          <div className="relative group rounded-xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 aspect-[21/9] transition-all hover:border-teal-300">
                            <img
                              src={sellerData.storeBanner || 'https://placehold.co/1200x400?text=Store+Banner'}
                              alt="Store Banner"
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            {isEditing && (
                              <label className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm">
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => handleFileChange(e, 'storeBanner')}
                                />
                                <div className="bg-white/20 p-4 rounded-full border border-white/30 backdrop-blur-md">
                                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                </div>
                              </label>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 ml-1">Recommended size: 1200x400px. Supports JPG, PNG.</p>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-end">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Store Description</label>
                            <span className="text-xs text-gray-400">Displayed on your store page</span>
                          </div>
                          <textarea
                            name="storeDescription"
                            value={sellerData.storeDescription || ''}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            rows={6}
                            placeholder="Tell customers about your store, specialty, and heritage..."
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none disabled:bg-gray-50/50 disabled:text-gray-500 transition-all resize-none leading-relaxed"
                          />
                        </div>
                      </div>
                    )}

                    {activeTab === 'bank' && (
                      <div className="space-y-10">
                        <section>
                          <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                            </div>
                            <h4 className="text-lg font-bold text-gray-900">Bank Details</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                            <InputGroup label="Account Holder Name" name="accountName" value={sellerData.accountName} onChange={handleInputChange} disabled={!isEditing} error={formErrors.accountName} />
                            <InputGroup label="Bank Name" name="bankName" value={sellerData.bankName} onChange={handleInputChange} disabled={!isEditing} error={formErrors.bankName} />
                            <InputGroup label="Account Number" name="accountNumber" value={sellerData.accountNumber} onChange={handleInputChange} disabled={!isEditing} error={formErrors.accountNumber} />
                            <InputGroup label="IFSC Code" name="ifsc" value={sellerData.ifsc} onChange={handleInputChange} disabled={!isEditing} placeholder="e.g. HDFC0001015" error={formErrors.ifsc} />
                          </div>
                        </section>

                        <section>
                          <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <h4 className="text-lg font-bold text-gray-900">Tax Information</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                            <InputGroup label="PAN Card Number" name="panCard" value={sellerData.panCard} onChange={handleInputChange} disabled={!isEditing} placeholder="e.g. ABCDE1234F" error={formErrors.panCard} />
                            <InputGroup label="Tax Number (GST)" name="taxNumber" value={sellerData.taxNumber} onChange={handleInputChange} disabled={!isEditing} placeholder="e.g. 07AAAAA0000A1Z5" error={formErrors.taxNumber} />
                          </div>
                        </section>
                      </div>
                    )}
                  </div>

                  {isEditing && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="px-8 py-5 bg-gray-50 border-t border-gray-200 flex justify-end gap-4"
                    >
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saveLoading}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 ${saveLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        {saveLoading ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Saving...
                          </span>
                        ) : 'Save Changes'}
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

const InputGroup = ({ label, name, value, onChange, disabled, type = "text", placeholder = "", autoComplete, error }: any) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center">
      <label className="text-sm font-semibold text-gray-700 ml-1">{label}</label>
      {error && <span className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-100">{error}</span>}
    </div>
    <input
      type={type}
      name={name}
      value={value || ''}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      autoComplete={autoComplete}
      className={`w-full px-4 py-2.5 rounded-lg border transition-all ${
        error ? 'border-red-400 focus:ring-red-500/20 focus:border-red-500' : 'border-gray-300 focus:ring-teal-500/20 focus:border-teal-500'
      } outline-none ${disabled ? 'bg-gray-50/50 text-gray-500 cursor-default' : 'bg-white'}`}
    />
  </div>
);

export default SellerAccountSettings;
