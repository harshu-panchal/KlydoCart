import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getProfile, CustomerProfile, creditWallet, getWalletTransactions, WalletTransaction } from "../../services/api/customerService";
import { useAuth } from "../../context/AuthContext";
import { useThemeContext } from "../../context/ThemeContext";

export default function Wallet() {
  const navigate = useNavigate();
  const { currentTheme } = useThemeContext();
  const { user } = useAuth();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileAndTransactions = async () => {
      try {
        const response = await getProfile();
        if (response.success) {
          setProfile(response.data);
        }
        const transRes = await getWalletTransactions();
        if (transRes.success) {
          setTransactions(transRes.data);
        }
      } catch (err) {
        console.error("Failed to load wallet data", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProfileAndTransactions();
    } else {
      setLoading(false);
      navigate("/login");
    }
  }, [user, navigate]);

  const handleAddFunds = async () => {
    const amountStr = prompt("Enter amount to add (₹):", "50");
    if (!amountStr) return;

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    try {
      const response = await creditWallet(amount);
      if (response.success) {
        setProfile(prev => prev ? { ...prev, walletAmount: response.data.walletAmount } : null);
        alert(`₹${amount.toFixed(2)} added successfully!`);
        // Refresh transactions list
        const transRes = await getWalletTransactions();
        if (transRes.success) {
          setTransactions(transRes.data);
        }
      }
    } catch (err) {
      console.error("Failed to add funds", err);
      alert("Failed to add funds. Please try again.");
    }
  };

  return (
    <div className="pb-24 md:pb-8 bg-neutral-50 min-h-screen">
      {/* Sleek Compact Header */}
      <div 
        className="pb-12 pt-4 shadow-sm"
        style={{
          background: `linear-gradient(135deg, ${currentTheme.primary[0]}, ${currentTheme.primary[1]})`,
        }}
      >
        <div className="px-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate(-1)}
              className="text-white/80 hover:text-white p-1 rounded-full transition-colors"
              aria-label="Back">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18L9 12L15 6"/></svg>
            </button>
            <h1 className="text-sm font-black text-white uppercase tracking-[0.2em]">Wallet</h1>
            <div className="w-8" /> {/* Spacer */}
          </div>

          <div className="flex flex-col items-center">
            <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em] mb-1">Available Balance</span>
            <div className="text-3xl font-black text-white tracking-tighter flex items-baseline gap-1">
              <span className="text-lg opacity-70">₹</span>
              {loading ? "..." : (profile?.walletAmount ?? 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Compact Action Bar */}
      <div className="px-4 -mt-6">
        <div className="bg-white rounded-2xl p-3 shadow-lg shadow-neutral-200/40 border border-neutral-100 flex gap-3">
          <button 
            onClick={handleAddFunds}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white transition-all active:scale-95"
            style={{ backgroundColor: currentTheme.primary[1] }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            <span className="text-[11px] font-black uppercase tracking-wider">Add Funds</span>
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-all active:scale-95">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span className="text-[11px] font-black uppercase tracking-wider">History</span>
          </button>
        </div>
      </div>

      {/* Transaction Feed */}
      <div className="px-4 mt-8">
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.3em]">Recent Activity</h2>
          <button className="text-[9px] font-black text-teal-600 uppercase tracking-widest hover:underline">View All</button>
        </div>
        
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden divide-y divide-neutral-50">
          {loading ? (
            <div className="p-10 text-center text-xs font-bold text-neutral-400">Loading activity...</div>
          ) : transactions.length === 0 ? (
            /* Empty State - Compact */
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
              </div>
              <p className="text-neutral-900 font-bold text-xs">No activity found</p>
              <p className="text-neutral-400 text-[10px] mt-1">Transactions will appear here</p>
            </div>
          ) : (
            transactions.map((tx) => (
              <div key={tx._id} className="p-4 flex items-center justify-between hover:bg-neutral-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div 
                    className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      tx.type === 'Credit' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                    }`}
                  >
                    {tx.type === 'Credit' ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-900 leading-normal">{tx.description}</p>
                    <p className="text-[9px] text-neutral-400 font-semibold uppercase tracking-wider mt-0.5">
                      {new Date(tx.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} • {tx.reference}
                    </p>
                  </div>
                </div>
                <div className={`text-sm font-black tracking-tight ${
                  tx.type === 'Credit' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {tx.type === 'Credit' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Offers / Info */}
      <div className="px-4 mt-6">
        <div className="bg-teal-50 rounded-2xl p-4 border border-teal-100 flex items-center gap-4">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-teal-600 shadow-sm shrink-0">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </div>
          <div>
            <p className="text-[11px] font-black text-teal-900 uppercase tracking-wide">Wallet Perks</p>
            <p className="text-[10px] text-teal-700 leading-tight">Get instant refunds and exclusive cashbacks on your wallet payments.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
