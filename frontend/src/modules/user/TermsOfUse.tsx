import { useNavigate } from "react-router-dom";

export default function TermsOfUse() {
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
            <h1 className="text-xl md:text-2xl font-black text-neutral-900 tracking-tight">Terms of Use</h1>
            <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Please read these terms carefully</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-6 lg:px-8 py-6 max-w-3xl mx-auto">
        <div className="space-y-4">
          {[
            {
              title: "1. Acceptance of Terms",
              content: "By accessing and using KlydoCart, you agree to be bound by these Terms of Use and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using the app."
            },
            {
              title: "2. Use License",
              content: "Permission is granted to temporarily use the app for personal, non-commercial purposes. This license does not include any resale or commercial use of our services or content."
            },
            {
              title: "3. Account Responsibilities",
              content: "You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account."
            },
            {
              title: "4. Limitations",
              content: "In no event shall KlydoCart or its sellers be liable for any damages arising out of the use or inability to use the services, even if we have been notified of the possibility of such damage."
            },
            {
              title: "5. Revisions",
              content: "The materials appearing on KlydoCart could include technical, typographical, or photographic errors. We do not warrant that any of the materials are accurate, complete, or current. We may make changes to the materials at any time without notice."
            },
            {
              title: "6. Governing Law",
              content: "These terms and conditions are governed by and construed in accordance with the laws of India and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location."
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
