import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="pb-24 md:pb-8 bg-neutral-50 min-h-screen font-sans">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 pb-6 pt-10 shadow-sm">
        <div className="px-4 md:px-6 lg:px-8 max-w-3xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-neutral-100 hover:bg-neutral-200 rounded-full transition-all active:scale-95"
            aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18L9 12L15 6" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-neutral-900 tracking-tight">Privacy Policy</h1>
            <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Your privacy is important to us</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-6 lg:px-8 py-6 max-w-3xl mx-auto">
        <div className="space-y-4">
          {[
            {
              title: "1. Information We Collect",
              content: "We collect information you provide directly to us when you create an account, place an order, or contact us. This may include your name, email address, phone number, delivery address, and payment information."
            },
            {
              title: "2. How We Use Your Information",
              content: "We use your information to process and deliver your orders, communicate with you about your account, and improve our services. We may also send you promotional communications if you opt-in."
            },
            {
              title: "3. Data Sharing and Security",
              content: "We do not sell your personal information. We share your data with trusted partners only as necessary to fulfill your orders (e.g., sharing your address with delivery partners). We implement security measures to protect your data."
            },
            {
              title: "4. Your Choices",
              content: "You can access and update your account information at any time. You can also opt-out of receiving marketing communications from us."
            },
            {
              title: "5. Cookies",
              content: "We use cookies to enhance your experience, remember your preferences, and analyze app traffic. You can manage cookie settings in your browser."
            },
            {
              title: "6. Updates to This Policy",
              content: "We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy on our app."
            }
          ].map((section, idx) => (
            <section key={idx} className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm transition-hover hover:shadow-md">
              <h2 className="text-sm font-bold text-orange-600 mb-2 uppercase tracking-widest">{section.title}</h2>
              <p className="text-neutral-700 text-sm leading-relaxed font-medium">
                {section.content}
              </p>
            </section>
          ))}

          <div className="pt-6 text-[10px] text-neutral-400 font-bold text-center uppercase tracking-[0.2em]">
            Last updated: May 2026 • © KlydoCart
          </div>
        </div>
      </div>
    </div>
  );
}
