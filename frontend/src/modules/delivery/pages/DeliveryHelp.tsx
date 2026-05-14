import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DeliveryHeader from '../components/DeliveryHeader';
import DeliveryBottomNav from '../components/DeliveryBottomNav';
import { getHelpSupport } from '../../../services/api/delivery/deliveryService';

// Icon mapping helper
const getIcon = (iconName: string) => {
  if (iconName === 'phone') return (
    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
    </div>
  );
  if (iconName === 'email') return (
    <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center text-purple-600">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
    </div>
  );
  if (iconName === 'chat') return (
    <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center text-green-600">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-14h1a8.5 8.5 0 0 1 7.5 10.2z"/></svg>
    </div>
  );
  return 'ℹ️';
};

export default function DeliveryHelp() {
  const navigate = useNavigate();
  const [faqs, setFaqs] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHelp = async () => {
      try {
        const data = await getHelpSupport();
        setFaqs(data.faqs || []);
        setContacts((data.contact || []).filter((c: any) => c.icon !== 'chat'));
      } catch (error) {
        console.error("Failed to load help data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHelp();
  }, []);

  const handleContactAction = (option: any) => {
    if (option.icon === 'phone') {
      window.location.href = `tel:${option.value.replace(/\s/g, '')}`;
    } else if (option.icon === 'email') {
      window.location.href = `mailto:${option.value}`;
    } else if (option.icon === 'chat') {
      // Open WhatsApp or generic chat link
      window.open(`https://wa.me/917846940429?text=Hello%20Support,%20I%20am%20a%20delivery%20partner%20and%20need%20help.`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center pb-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-neutral-500 font-bold text-xs uppercase tracking-widest">Loading help content...</p>
        </div>
        <DeliveryBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 pb-20 font-sans">
      <DeliveryHeader />
      <div className="px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate(-1)}
            className="mr-3 p-2.5 bg-white shadow-sm border border-neutral-200 rounded-full hover:bg-neutral-50 transition-all active:scale-90"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h2 className="text-neutral-900 text-xl font-black tracking-tight">Help & Support</h2>
        </div>

        {/* Contact Options */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden mb-6">
          <div className="p-4 bg-neutral-50/50 border-b border-neutral-100">
            <h3 className="text-neutral-800 font-bold text-sm uppercase tracking-widest">Contact Channels</h3>
          </div>
          <div className="divide-y divide-neutral-100">
            {contacts.map((option, index) => (
              <button 
                key={index} 
                onClick={() => handleContactAction(option)}
                className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 active:bg-neutral-100 transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  {getIcon(option.icon)}
                  <div>
                    <p className="text-neutral-900 text-sm font-bold">{option.label}</p>
                    <p className="text-neutral-500 text-xs font-medium">{option.value}</p>
                  </div>
                </div>
                <svg className="text-neutral-300" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden mb-6">
          <div className="p-4 bg-neutral-50/50 border-b border-neutral-100">
            <h3 className="text-neutral-800 font-bold text-sm uppercase tracking-widest">Common Questions</h3>
          </div>
          <div className="divide-y divide-neutral-100">
            {faqs.map((item, index) => (
              <div key={index} className="p-5 hover:bg-slate-50/30 transition-colors">
                <p className="text-neutral-900 text-sm font-bold mb-2 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5 shrink-0" />
                  {item.question}
                </p>
                <p className="text-neutral-500 text-xs leading-relaxed font-medium pl-3.5 border-l-2 border-neutral-100 ml-0.5">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>

        <button 
          onClick={() => {
            const phone = contacts.find(c => c.icon === 'phone')?.value || '+917846940429';
            window.location.href = `tel:${phone.replace(/\s/g, '')}`;
          }}
          className="w-full bg-orange-600 text-white rounded-2xl py-4 font-black text-xs uppercase tracking-[0.2em] hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20 active:scale-[0.98] flex items-center justify-center gap-3"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          Direct Support Call
        </button>
      </div>
      <DeliveryBottomNav />
    </div>
  );
}

