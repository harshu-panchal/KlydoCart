import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getProfile,
  CustomerProfile,
} from "../../services/api/customerService";
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

  const handleGstSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowGstModal(false);
  };

  if (!user) {
    return (
      <div className="pb-24 md:pb-8 bg-white min-h-screen">
        <div className="bg-gradient-to-b from-green-200 via-green-100 to-white pb-6 md:pb-8 pt-12 md:pt-16">
          <div className="px-4 md:px-6 lg:px-8 text-center flex flex-col items-center">
            <button
              onClick={() => navigate(-1)}
              className="mb-4 text-neutral-900 self-start"
              aria-label="Back">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="w-20 h-20 rounded-full bg-neutral-200 flex items-center justify-center mb-4 border-2 border-white shadow-sm">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-neutral-500">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
            <h1 className="text-xl font-bold text-neutral-900 mb-2">Welcome!</h1>
            <p className="text-sm text-neutral-600 mb-6">Login to access your profile and orders</p>
            <button
              onClick={() => navigate("/login")}
              className="px-10 py-2.5 rounded-lg font-bold text-xs bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-lg shadow-teal-500/10 uppercase tracking-widest">
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="pb-24 bg-white min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const displayName = profile?.name || user?.name || "User";
  const displayPhone = profile?.phone || user?.phone || "";

  return (
    <div className="pb-24 md:pb-8 bg-white min-h-screen">
      <div 
        className="pb-4 pt-4 shadow-md"
        style={{
          background: `linear-gradient(to right, ${currentTheme.primary[0]}, ${currentTheme.primary[1]})`,
        }}
      >
        <div className="px-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/20 p-1.5 rounded-full transition-colors flex-shrink-0"
              aria-label="Back">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-white">Account</h1>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/50 shadow-sm flex-shrink-0">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white truncate">{displayName}</h1>
              <div className="flex flex-col gap-0.5 text-xs text-white/90">
                {displayPhone && (
                  <div className="flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{displayPhone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate("/orders")} className="bg-white rounded-lg border border-neutral-200 p-4 hover:shadow-md transition-shadow text-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mx-auto mb-2 text-neutral-700">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div className="text-xs font-semibold text-neutral-900">Your orders</div>
          </button>
          <button onClick={() => navigate("/faq")} className="bg-white rounded-lg border border-neutral-200 p-4 hover:shadow-md transition-shadow text-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mx-auto mb-2 text-neutral-700">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="text-xs font-semibold text-neutral-900">Need help?</div>
          </button>
        </div>
      </div>

      <div className="px-4 py-2">
        <h2 className="text-[10px] font-black text-neutral-400 mb-3 uppercase tracking-widest">Settings</h2>
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden divide-y divide-neutral-50 shadow-sm">
          {[
            { label: "Address Book", icon: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z", path: "/address-book" },
            { label: "Your Wishlist", icon: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z", path: "/wishlist" },
            { label: "GST Details", icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2 14 8 20 8", action: () => setShowGstModal(true) },
            { label: "About Us", icon: "M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM12 16V12ZM12 8H12.01", path: "/about-us" },
          ].map((item, idx) => (
            <button key={idx} onClick={() => item.path ? navigate(item.path) : item.action?.()} className="w-full flex items-center justify-between px-4 py-4 hover:bg-neutral-50 transition-colors">
              <div className="flex items-center gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400">
                  <path d={item.icon} />
                </svg>
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-300">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ))}
          <button onClick={handleLogout} className="w-full flex items-center justify-between px-4 py-4 hover:bg-rose-50/50 transition-colors">
            <div className="flex items-center gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17 21 12 16 7 M21 12H9" />
              </svg>
              <span className="text-sm font-bold text-rose-500">Log Out</span>
            </div>
          </button>
        </div>
      </div>

      {showGstModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowGstModal(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg mx-auto p-8 relative">
              <h3 className="text-xl font-bold text-neutral-900 mb-2">Add GST Details</h3>
              <p className="text-sm text-neutral-500 mb-6">Enter your business GST for tax invoicing.</p>
              <form onSubmit={handleGstSubmit} className="space-y-4">
                <input type="text" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} placeholder="GST Number" className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-teal-500" />
                <button type="submit" disabled={!gstNumber.trim()} className="w-full rounded-xl bg-teal-600 text-white font-bold py-3.5 hover:bg-teal-700 transition-all uppercase tracking-widest text-xs">Save</button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
