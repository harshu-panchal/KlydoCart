import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getProfile,
  updateProfile,
  CustomerProfile,
} from "../../services/api/customerService";
import { useToast } from "../../context/ToastContext";
import { useThemeContext } from "../../context/ThemeContext";

export default function Account() {
  const navigate = useNavigate();
  const { currentTheme } = useThemeContext();
  const { user, logout: authLogout } = useAuth();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showGstModal, setShowGstModal] = useState(false);
  const [gstNumber, setGstNumber] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDOB, setEditDOB] = useState("");
  const [editErrors, setEditErrors] = useState<{ name?: string; email?: string }>({});
  const { showToast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await getProfile();
        if (response.success) {
          setProfile(response.data);
        } else {
          setError("Failed to load profile");
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load profile");
        if (err.response?.status === 401) {
          authLogout();
        }
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [user, navigate, authLogout]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const handleLogout = () => {
    authLogout();
    navigate("/login");
  };
  
  const handleEditProfile = () => {
    if (profile) {
      setEditName(profile.name || "");
      setEditEmail(profile.email || "");
      setEditDOB(profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : "");
      setEditErrors({});
      setShowEditModal(true);
    }
  };

  const onUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const newErrors: { name?: string; email?: string } = {};
    if (!editName.trim()) {
      newErrors.name = 'Full name is required';
    } else if (!/^[a-zA-Z\s]+$/.test(editName.trim())) {
      newErrors.name = 'Name must contain only alphabets';
    }
    if (editEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail.trim())) {
      newErrors.email = 'Enter a valid email  e.g. example@gmail.com';
    }
    if (Object.keys(newErrors).length > 0) {
      setEditErrors(newErrors);
      return;
    }
    setEditErrors({});

    try {
      setLoading(true);
      const res = await updateProfile({
        name: editName,
        email: editEmail,
        dateOfBirth: editDOB
      });
      if (res.success) {
        setProfile(res.data);
        setShowEditModal(false);
        showToast("Profile updated successfully");
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to update profile", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGstSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowGstModal(false);
  };

  // Show login/signup prompt for unregistered users
  if (!user) {
    return (
      <div className="pb-24 md:pb-8 bg-white min-h-screen">
        <div className="bg-gradient-to-b from-green-200 via-green-100 to-white pb-6 md:pb-8 pt-12 md:pt-16">
          <div className="px-4 md:px-6 lg:px-8">
            <button
              onClick={() => navigate(-1)}
              className="mb-4 text-neutral-900"
              aria-label="Back">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 18L9 12L15 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div className="flex flex-col items-center mb-4 md:mb-6">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-neutral-200 flex items-center justify-center mb-3 md:mb-4 border-2 border-white shadow-sm">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-neutral-500 md:w-12 md:h-12">
                  <path
                    d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="7"
                    r="4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-neutral-900 mb-2">
                Welcome!
              </h1>
              <p className="text-sm md:text-base text-neutral-600 text-center px-4">
                Login to access your profile, orders, and more
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 md:px-6 lg:px-8 mt-6">
          <div className="max-w-md mx-auto flex justify-center">
            <button
              onClick={() => navigate("/login")}
              className="px-10 py-2.5 rounded-lg font-bold text-sm bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-lg shadow-teal-500/10 uppercase tracking-wide">
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="pb-24 md:pb-8 bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="pb-24 md:pb-8 bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-teal-600 text-white rounded">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const displayName = profile?.name || user?.name || "User";
  const displayPhone = profile?.phone || user?.phone || "";
  const displayDateOfBirth = profile?.dateOfBirth;

  return (
    <div className="pb-24 md:pb-20 bg-stone-50/30 md:bg-neutral-50 min-h-screen">
      {/* Desktop Dashboard Header */}
      <div className="hidden md:block bg-white border-b border-neutral-200 px-12 py-6 mb-8 sticky top-0 z-40 transition-all duration-300">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
           <div className="flex items-center gap-6">
             <button onClick={() => navigate(-1)} className="p-2.5 rounded-xl hover:bg-neutral-100 transition-colors text-neutral-400">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
             </button>
             <div>
               <h1 className="text-2xl font-black text-green-600 tracking-tight uppercase">Your Profile</h1>
               <p className="text-sm font-medium text-neutral-400">Manage your profile and regional settings</p>
             </div>
           </div>
           <div className="flex items-center gap-4">
             <div className="h-10 w-px bg-neutral-100 mx-2" />
             <button
               onClick={handleLogout}
               className="px-6 py-2.5 bg-red-50 text-red-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all duration-300 border border-red-100"
             >
               Sign Out
             </button>
           </div>
        </div>
      </div>

      {/* Mobile-Only Section: Guaranteed 100% Fidelity */}
      <div className="md:hidden">
        <div 
          className="pb-4 pt-4 shadow-md"
          style={{
            background: `linear-gradient(to right, ${currentTheme.primary[0]}, ${currentTheme.primary[1]})`,
          }}
        >
          <div className="px-4">
            <div className="flex items-center relative">
              <button
                onClick={() => navigate(-1)}
                className="absolute left-0 text-white hover:bg-white/20 p-1.5 rounded-full transition-colors z-10"
                aria-label="Back">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <h1 className="w-full text-center text-lg font-bold text-white">Account</h1>
              <button 
                onClick={handleEditProfile}
                className="absolute right-0 w-9 h-9 flex items-center justify-center bg-white/20 backdrop-blur-md rounded-full text-white shadow-sm border border-white/20 active:scale-95 z-10"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            </div>
            <div className="flex flex-col items-center gap-3 mt-4 mb-2">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/50 shadow-sm flex-shrink-0">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-white"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div className="flex flex-col items-center min-w-0">
                <h1 className="text-2xl font-bold text-white truncate mb-1">{displayName}</h1>
                <div className="flex flex-col items-center gap-1.5 text-xs text-white/90">
                  {displayPhone && (
                    <div className="flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <span>{displayPhone}</span>
                    </div>
                  )}
                  {displayDateOfBirth && (
                    <div className="flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                      <span>{formatDate(displayDateOfBirth)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 mt-4 mb-4">
          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={() => navigate("/orders")} className="bg-white rounded-lg border border-neutral-200 p-3 text-center outline-none">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mx-auto mb-1.5 text-neutral-700"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <div className="text-[10px] font-semibold text-neutral-900">Your orders</div>
            </button>
            <button onClick={() => navigate("/faq")} className="bg-white rounded-lg border border-neutral-200 p-3 text-center outline-none">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mx-auto mb-1.5 text-neutral-700"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <div className="text-[10px] font-semibold text-neutral-900">Need help?</div>
            </button>
          </div>
        </div>

        <div className="px-4 py-2.5 pb-12">
          <h2 className="text-xs font-bold text-neutral-900 mb-2 uppercase tracking-wide">Your information</h2>
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden divide-y divide-neutral-100">
            {[
              { label: 'Address Book', path: '/address-book', icon: <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /> },
              { label: 'Your Wishlist', path: '/wishlist', icon: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /> },
              { label: 'GST Details', action: () => setShowGstModal(true), icon: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2L14 8L20 8" /> },
              { label: 'About Us', path: '/about-us', icon: <><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></> },
              { label: 'Log Out', action: handleLogout, icon: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17L21 12L16 7 M21 12H9" />, color: 'text-red-500' },
            ].map((item, i) => (
              <button key={i} onClick={item.action || (() => navigate(item.path!))} className={`w-full flex items-center justify-between px-3 py-3 hover:bg-neutral-50 ${item.color || ''}`}>
                <div className="flex items-center gap-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={item.color || 'text-neutral-500'}>{item.icon}</svg>
                  <span className="text-[13px] font-medium">{item.label}</span>
                </div>
                <span className="text-neutral-400 text-lg">›</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop-Only Section: Premium Dashboard Layout */}
      <div className="hidden md:block px-12">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row gap-10">
            
            {/* Desktop Left Sidebar: Profile Overview */}
            <div className="hidden md:flex flex-col gap-6 w-full md:w-[320px] shrink-0">
              <div className="bg-white rounded-[32px] p-8 border border-neutral-100 shadow-xl shadow-neutral-200/50 flex flex-col items-center">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full bg-neutral-100 flex items-center justify-center border-4 border-white shadow-inner mb-6 transition-transform duration-500 group-hover:scale-110">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-neutral-400">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <button 
                    onClick={handleEditProfile}
                    className="absolute bottom-6 right-0 w-9 h-9 bg-neutral-900 text-white rounded-full flex items-center justify-center border-2 border-white shadow-lg hover:scale-110 transition-transform"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                  </button>
                </div>
                
                <h2 className="text-xl font-black text-neutral-900 tracking-tight text-center truncate w-full mb-1">{displayName}</h2>
                <span className="px-3 py-1 bg-green-50 text-green-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-green-100 mb-6">Verified Customer</span>
                
                <div className="w-full space-y-4 pt-6 border-t border-neutral-50 text-sm font-bold">
                  <div className="flex items-center justify-between text-neutral-400 uppercase tracking-widest text-[9px]">
                    <span>Mobile</span>
                    <span className="text-neutral-900 tracking-normal">{displayPhone || '--'}</span>
                  </div>
                  <div className="flex items-center justify-between text-neutral-400 uppercase tracking-widest text-[9px]">
                    <span>Birth Date</span>
                    <span className="text-neutral-900 tracking-normal">{displayDateOfBirth ? formatDate(displayDateOfBirth) : '--'}</span>
                  </div>
                </div>
              </div>
              
              {/* Account Security Banner */}
              <div className="bg-green-600 rounded-[32px] p-6 text-white overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-white/20 transition-colors" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 mb-4 text-center">Security Status</h3>
                <div className="flex flex-col items-center gap-2">
                   <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-1">
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                   </div>
                   <span className="text-xl font-black tracking-tight">PROTECTED</span>
                   <span className="text-[9px] font-bold text-white/60 uppercase tracking-[0.2em]">Session is active</span>
                </div>
              </div>
            </div>

            {/* Desktop Right Content: Action Hub */}
            <div className="flex-1 min-w-0">
              {/* Desktop Quick Nav Tiles */}
              <div className="hidden md:grid grid-cols-3 gap-4 mb-6">
                 {[
                   { label: 'Orders', icon: <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0" />, path: '/orders', color: 'bg-indigo-50 text-indigo-600', sub: 'Past & Present' },
                   { label: 'Support', icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />, path: '/faq', color: 'bg-emerald-50 text-emerald-600', sub: 'Help Center' },
                   { label: 'Wishlist', icon: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />, path: '/wishlist', color: 'bg-rose-50 text-rose-600', sub: 'Saved Items' },
                 ].map((item, i) => (
                   <button 
                     key={i}
                     onClick={() => navigate(item.path)}
                     className="bg-white p-4 rounded-[24px] border border-neutral-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 text-left group"
                   >
                     <div className={`w-10 h-10 ${item.color} rounded-xl flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-105 shadow-sm`}>
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg>
                     </div>
                     <span className="block font-black text-neutral-900 uppercase tracking-widest text-[9px] mb-0.5">{item.label}</span>
                     <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">{item.sub}</span>
                   </button>
                 ))}
              </div>

              {/* Information Sections Grid */}
              <div className="space-y-6 md:space-y-0 md:grid md:grid-cols-2 md:gap-10">
                <div className="group">
                  <h2 className="px-1 md:px-4 text-[10px] font-black text-green-600 mb-3 md:mb-4 uppercase tracking-[0.4em] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-600" /> Identity
                  </h2>
                  <div className="bg-white rounded-[24px] shadow-md shadow-neutral-200/40 overflow-hidden divide-y divide-neutral-100 border border-neutral-50">
                    {[
                      { label: 'Address Book', sub: 'Saved delivery locations', path: '/address-book', icon: <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /> },
                      { label: 'GST Details', sub: 'Business invoicing', action: () => setShowGstModal(true), icon: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2L14 8L20 8" /> },
                    ].map((row, i) => (
                      <button
                        key={i}
                        onClick={row.action || (() => navigate(row.path!))}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-stone-50 transition-all duration-300 group/row"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-neutral-50 rounded-lg hidden md:flex items-center justify-center text-neutral-400 group-hover/row:bg-white group-hover/row:text-green-600 transition-colors">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{row.icon}</svg>
                          </div>
                          <div className="text-left">
                            <span className="block text-[11px] font-black text-neutral-900 uppercase tracking-wide">{row.label}</span>
                            <span className="block text-[8px] text-neutral-400 font-bold uppercase tracking-widest">{row.sub}</span>
                          </div>
                        </div>
                        <span className="text-neutral-300 group-hover/row:translate-x-1 group-hover/row:text-green-600 transition-all">
                           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="group">
                  <h2 className="px-1 md:px-4 text-[10px] font-black text-green-600 mb-3 md:mb-4 uppercase tracking-[0.4em] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-600" /> Security
                  </h2>
                  <div className="bg-white rounded-[24px] shadow-md shadow-neutral-200/40 overflow-hidden divide-y divide-neutral-100 border border-neutral-50">
                     {[
                      { label: 'About Us', sub: 'Legal & Vision', path: '/about-us', icon: <><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></> },
                      { label: 'Logout', sub: 'Terminate session', action: handleLogout, icon: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17L21 12L16 7 M21 12H9" />, color: 'text-red-500' },
                    ].map((row, i) => (
                      <button
                        key={i}
                        onClick={row.action || (() => navigate(row.path!))}
                        className={`w-full flex items-center justify-between px-5 py-4 hover:bg-stone-50 transition-all duration-300 group/row ${row.color || ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-neutral-50 rounded-lg hidden md:flex items-center justify-center transition-colors">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={row.color || 'text-neutral-400 group-hover/row:text-green-600'}>{row.icon}</svg>
                          </div>
                          <div className="text-left">
                            <span className={`block text-[11px] font-black uppercase tracking-wide ${row.color || 'text-neutral-900'}`}>{row.label}</span>
                            <span className="block text-[8px] text-neutral-400 font-bold uppercase tracking-widest">{row.sub}</span>
                          </div>
                        </div>
                        <span className={`text-neutral-300 group-hover/row:translate-x-1 transition-all ${row.color || 'group-hover/row:text-green-600'}`}>
                           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showGstModal && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setShowGstModal(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-500 ease-out">
            <div className="bg-white rounded-t-[32px] shadow-2xl max-w-lg mx-auto p-6 pt-10 relative">
              <button
                onClick={() => setShowGstModal(false)}
                className="absolute -top-12 right-4 w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div className="text-center">
                <div className="mx-auto mb-6 w-20 h-20 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-10 h-10 text-neutral-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5">
                    <rect x="5" y="3" width="14" height="18" rx="2" ry="2" />
                    <line x1="9" y1="7" x2="15" y2="7" />
                    <line x1="9" y1="11" x2="15" y2="11" />
                    <line x1="9" y1="15" x2="13" y2="15" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">
                  Add GST Details
                </h3>
                <p className="text-[13px] text-neutral-500 mb-8 px-4">
                  Identify your business to get a GST invoice on your business
                  purchases.
                </p>
                <form onSubmit={handleGstSubmit} className="space-y-4">
                  <input
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    placeholder="Enter GST Number"
                    className="w-full rounded-xl border border-neutral-200 px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!gstNumber.trim()}
                    className="w-full rounded-xl bg-teal-600 text-white font-bold py-4 hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-lg shadow-teal-500/20 uppercase tracking-wider text-sm">
                    Save Details
                  </button>
                </form>
                <p className="mt-6 text-[11px] text-neutral-400">
                  By continuing, you agree to our{" "}
                  <span className="underline">Terms & Conditions</span>
                </p>
              </div>
            </div>
          </div>
        </>
      )}
      {showEditModal && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setShowEditModal(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-[70] animate-in slide-in-from-bottom duration-500 ease-out">
            <div className="bg-white rounded-t-[32px] shadow-2xl max-w-lg mx-auto p-6 pt-10 relative border-t border-neutral-100">
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-neutral-200 rounded-full mb-4" />
              <button
                onClick={() => setShowEditModal(false)}
                className="absolute -top-12 right-4 w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div className="text-center">
                <h3 className="text-xl font-bold text-neutral-900 mb-6">
                  Edit Profile
                </h3>
                <form onSubmit={onUpdateProfile} className="space-y-4">
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase ml-1">Full Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => {
                        // Strip numbers and special characters live
                        const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                        setEditName(val);
                        if (editErrors.name) setEditErrors((prev) => ({ ...prev, name: undefined }));
                      }}
                      placeholder="Enter your full name"
                      className={`w-full rounded-xl border px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium ${
                        editErrors.name ? 'border-red-400 bg-red-50' : 'border-neutral-200'
                      }`}
                      required
                    />
                    {editErrors.name && (
                      <p className="text-[11px] text-red-500 mt-0.5 ml-1 flex items-center gap-1">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                        {editErrors.name}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase ml-1">Email Address</label>
                    <input
                      type="text"
                      value={editEmail}
                      onChange={(e) => {
                        setEditEmail(e.target.value);
                        if (editErrors.email) setEditErrors((prev) => ({ ...prev, email: undefined }));
                      }}
                      placeholder="e.g. example@gmail.com"
                      className={`w-full rounded-xl border px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium ${
                        editErrors.email ? 'border-red-400 bg-red-50' : 'border-neutral-200'
                      }`}
                    />
                    <p className={`text-[11px] mt-0.5 ml-1 flex items-center gap-1 ${editErrors.email ? 'text-red-500' : 'text-red-400'}`}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                      {editErrors.email || 'Correct format: example@gmail.com'}
                    </p>
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase ml-1">Date of Birth</label>
                    <input
                      type="date"
                      value={editDOB}
                      onChange={(e) => setEditDOB(e.target.value)}
                      className="w-full rounded-xl border border-neutral-200 px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !editName.trim()}
                    className="w-full rounded-xl bg-teal-600 text-white font-bold py-4 hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-lg shadow-teal-500/20 uppercase tracking-wider text-sm mt-4">
                    {loading ? "Updating..." : "Update Profile"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
