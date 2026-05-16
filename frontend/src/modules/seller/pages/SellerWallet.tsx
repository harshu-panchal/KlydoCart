import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { updateSellerProfile } from '../../../services/api/auth/sellerAuthService';
import {
  getSellerWalletBalance,
  getSellerWalletTransactions,
  requestSellerWithdrawal,
  getSellerWithdrawals,
  getSellerCommissions,
} from '../../../services/api/sellerWalletService';

type Tab = 'transactions' | 'withdrawals' | 'commissions';

export default function SellerWallet() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('transactions');
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any>({ commissions: [], total: 0, paid: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Bank Transfer' | 'UPI'>('Bank Transfer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Bank details state for inline filling
  const [bankData, setBankData] = useState({
    accountName: user?.accountName || '',
    bankName: user?.bankName || '',
    accountNumber: user?.accountNumber || '',
    ifsc: user?.ifsc || user?.ifscCode || ''
  });

  useEffect(() => {
    fetchWalletData();
  }, []);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (showWithdrawModal) {
      document.documentElement.classList.add('no-scroll');
    } else {
      document.documentElement.classList.remove('no-scroll');
    }
    return () => {
      document.documentElement.classList.remove('no-scroll');
    };
  }, [showWithdrawModal]);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const [balanceRes, transactionsRes, withdrawalsRes, commissionsRes] = await Promise.all([
        getSellerWalletBalance(),
        getSellerWalletTransactions(),
        getSellerWithdrawals(),
        getSellerCommissions(),
      ]);

      if (balanceRes.success) setBalance(balanceRes.data.balance);
      if (transactionsRes.success) setTransactions(transactionsRes.data.transactions || []);
      if (withdrawalsRes.success) setWithdrawals(withdrawalsRes.data || []);
      if (commissionsRes.success) setCommissions(commissionsRes.data);
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to load wallet data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const hasBankDetails = user?.accountNumber && (user?.ifsc || user?.ifscCode) && user?.bankName;

  const handleRequestWithdrawal = () => {
    setBankData({
      accountName: user?.accountName || '',
      bankName: user?.bankName || '',
      accountNumber: user?.accountNumber || '',
      ifsc: user?.ifsc || user?.ifscCode || ''
    });
    setShowWithdrawModal(true);
  };

  const handleWithdrawalSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // 1. If bank details are missing, update them first
      if (!hasBankDetails) {
        if (!bankData.accountName || !bankData.bankName || !bankData.accountNumber || !bankData.ifsc) {
          showToast('Please fill all bank details', 'error');
          setIsSubmitting(false);
          return;
        }
        const profileRes = await updateSellerProfile({
          accountName: bankData.accountName,
          bankName: bankData.bankName,
          accountNumber: bankData.accountNumber,
          ifsc: bankData.ifsc
        });
        if (profileRes.success) {
          updateUser(profileRes.data);
        }
      }

      const amount = parseFloat(withdrawAmount);
      if (isNaN(amount) || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
      }

      if (amount > balance) {
        showToast('Insufficient balance', 'error');
        return;
      }

      setIsSubmitting(true);
      const response = await requestSellerWithdrawal(amount, paymentMethod);
      if (response.success) {
        showToast('Withdrawal request submitted successfully', 'success');
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        fetchWalletData();
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to request withdrawal', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Wallet</h1>
          <div className="flex items-center gap-2 text-sm mt-1">
            <span 
              onClick={() => navigate('/seller')} 
              className="cursor-pointer text-blue-600 hover:text-blue-700 hover:underline font-medium"
            >
              Home
            </span>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600">Wallet</span>
          </div>
        </div>
        </div>
      </div>

      {!hasBankDetails && (
        <div className="mx-4 mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-orange-900">Bank Details Missing</p>
              <p className="text-xs text-orange-700">Please update bank details to enable withdrawals.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/seller/account-settings?tab=bank')}
            className="text-sm font-bold text-orange-600 hover:text-orange-700 px-3 py-1.5 bg-white rounded-lg shadow-sm border border-orange-100 transition-all active:scale-95 whitespace-nowrap"
          >
            Update Now
          </button>
        </div>
      )}

      {/* Balance Card - Sticky */}
      <div className="sticky top-[52px] z-20 px-4 sm:px-6 py-3 bg-neutral-50/95 backdrop-blur-md -mx-3 sm:-mx-4 md:-mx-6 border-b border-gray-200/50 mb-4 shadow-sm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg"
        >
          <p className="text-sm opacity-90 mb-1">Wallet Balance</p>
          <h1 className="text-4xl font-bold mb-4">₹{balance.toFixed(2)}</h1>
          <button
            onClick={handleRequestWithdrawal}
            className="bg-white text-blue-600 px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-50 transition-all shadow-md active:scale-95"
          >
            Request Withdrawal
          </button>
        </motion.div>
      </div>


      {/* Tabs */}
      <div className="bg-white mx-4 rounded-xl shadow-sm overflow-hidden">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'transactions'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600'
              }`}
          >
            Transactions
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'withdrawals'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600'
              }`}
          >
            Withdrawals
          </button>
          <button
            onClick={() => setActiveTab('commissions')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'commissions'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600'
              }`}
          >
            Commissions
          </button>
        </div>

        <div className="p-4">
          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="space-y-3">
              {(() => {
                // Combine transactions and pending commissions
                const allItems = [
                  ...transactions.map((t: any) => ({ ...t, source: 'transaction' })),
                  ...(commissions.commissions || [])
                    .filter((c: any) => c.status === 'Pending')
                    .map((c: any) => ({
                      _id: c.id || c._id,
                      description: `Order #${c.orderId?.substring(0, 8) || 'Unknown'} (Pending)`,
                      amount: c.orderAmount - c.amount, // Calculate Net Earning: Order Amount - Commission Fee
                      type: 'Credit',
                      createdAt: c.createdAt,
                      status: 'Pending',
                      source: 'commission'
                    }))
                ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                if (allItems.length === 0) {
                  return <p className="text-center text-gray-500 py-8">No transactions yet</p>;
                }

                return allItems.map((item: any) => (
                  <div key={item._id} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{item.description}</p>
                        {item.status === 'Pending' && (
                          <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium">
                            Pending
                          </span>
                        )}
                        {item.status === 'Completed' && (
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                            Success
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(item.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <p className={`font-bold text-lg ${item.type === 'Credit' ? 'text-green-600' : 'text-red-600'} ${item.status === 'Pending' ? 'opacity-60' : ''}`}>
                      {item.type === 'Credit' ? '+' : '-'}₹{item.amount.toFixed(2)}
                    </p>
                  </div>
                ));
              })()}
            </div>
          )}

          {/* Withdrawals Tab */}
          {activeTab === 'withdrawals' && (
            <div className="space-y-3">
              {withdrawals.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No withdrawal requests yet</p>
              ) : (
                withdrawals.map((withdrawal: any) => (
                  <div key={withdrawal._id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-gray-900">₹{withdrawal.amount.toFixed(2)}</p>
                        <p className="text-xs text-gray-600">{withdrawal.paymentMethod}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${withdrawal.status === 'Completed'
                          ? 'bg-green-100 text-green-700'
                          : withdrawal.status === 'Approved'
                            ? 'bg-blue-100 text-blue-700'
                            : withdrawal.status === 'Rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                      >
                        {withdrawal.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(withdrawal.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    {withdrawal.remarks && (
                      <p className="text-xs text-gray-600 mt-2 italic">{withdrawal.remarks}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Commissions Tab */}
          {activeTab === 'commissions' && (
            <div className="space-y-3">
              {commissions.commissions?.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No commissions yet</p>
              ) : (
                commissions.commissions?.map((comm: any) => (
                  <div key={comm.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-900">Order Commission</p>
                        <p className="text-xs text-gray-600">Rate: {comm.rate}%</p>
                      </div>
                      <p className="font-bold text-green-600">₹{comm.amount.toFixed(2)}</p>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Order Amount: ₹{comm.orderAmount.toFixed(2)}</span>
                      <span>{new Date(comm.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Withdrawal Modal */}
      {
        showWithdrawModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Request Withdrawal</h2>
                <button onClick={() => setShowWithdrawModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {!hasBankDetails && (
                <div className="mb-8 space-y-4">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-xs text-amber-800 font-medium leading-relaxed">
                      Please provide your bank details to receive payments. These will be saved to your profile.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Account Holder Name</label>
                      <input
                        type="text"
                        value={bankData.accountName}
                        onChange={(e) => setBankData({ ...bankData, accountName: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        placeholder="Name as per bank records"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Bank Name</label>
                      <input
                        type="text"
                        value={bankData.bankName}
                        onChange={(e) => setBankData({ ...bankData, bankName: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        placeholder="e.g. HDFC Bank"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Account Number</label>
                      <input
                        type="text"
                        value={bankData.accountNumber}
                        onChange={(e) => setBankData({ ...bankData, accountNumber: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        placeholder="Enter account number"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">IFSC Code</label>
                      <input
                        type="text"
                        value={bankData.ifsc}
                        onChange={(e) => setBankData({ ...bankData, ifsc: e.target.value.toUpperCase() })}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        placeholder="e.g. HDFC0001234"
                      />
                    </div>
                  </div>
                  <div className="border-b border-gray-100 my-6"></div>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Withdrawal Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-lg font-semibold"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="flex justify-between mt-1 px-1">
                    <p className="text-[10px] text-gray-400">Available Balance: ₹{balance.toFixed(2)}</p>
                    <button 
                      onClick={() => setWithdrawAmount(balance.toString())}
                      className="text-[10px] text-blue-600 font-bold hover:underline"
                    >
                      WITHDRAW ALL
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Payment Method</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPaymentMethod('Bank Transfer')}
                      className={`py-2.5 rounded-xl border-2 transition-all font-medium text-sm ${paymentMethod === 'Bank Transfer' 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : 'border-gray-100 hover:border-gray-200 text-gray-600'}`}
                    >
                      Bank Transfer
                    </button>
                    <button
                      onClick={() => setPaymentMethod('UPI')}
                      className={`py-2.5 rounded-xl border-2 transition-all font-medium text-sm ${paymentMethod === 'UPI' 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : 'border-gray-100 hover:border-gray-200 text-gray-600'}`}
                    >
                      UPI
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawAmount('');
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-3 font-bold hover:bg-gray-200 transition active:scale-95"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdrawalSubmit}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl py-3 font-bold hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-200 transition active:scale-95 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Processing...
                    </div>
                  ) : 'Confirm Request'}
                </button>
              </div>
            </motion.div>
          </div>
        )
      }
    </div >
  );
}
