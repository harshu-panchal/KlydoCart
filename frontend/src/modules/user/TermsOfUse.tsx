import { useNavigate } from "react-router-dom";

export default function TermsOfUse() {
  const navigate = useNavigate();

  return (
    <div className="pb-24 md:pb-8 bg-white min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-b from-amber-100 to-white pb-6 pt-12">
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
          <div className="flex flex-col items-center">
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-2">Terms of Use</h1>
            <p className="text-sm text-neutral-600">Please read these terms carefully</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-6 lg:px-8 py-8 max-w-4xl mx-auto">
        <div className="prose prose-sm md:prose-base text-neutral-700 space-y-6">
          <section>
            <h2 className="text-xl font-bold text-neutral-900 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing and using KlydoCart, you agree to be bound by these Terms of Use and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using the app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900 mb-3">2. Use License</h2>
            <p>
              Permission is granted to temporarily use the app for personal, non-commercial purposes. This license does not include any resale or commercial use of our services or content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900 mb-3">3. Account Responsibilities</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900 mb-3">4. Limitations</h2>
            <p>
              In no event shall KlydoCart or its sellers be liable for any damages arising out of the use or inability to use the services, even if we have been notified of the possibility of such damage.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900 mb-3">5. Revisions</h2>
            <p>
              The materials appearing on KlydoCart could include technical, typographical, or photographic errors. We do not warrant that any of the materials are accurate, complete, or current. We may make changes to the materials at any time without notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900 mb-3">6. Governing Law</h2>
            <p>
              These terms and conditions are governed by and construed in accordance with the laws of India and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.
            </p>
          </section>

          <div className="pt-8 border-t border-neutral-100 text-sm text-neutral-500 text-center">
            Last updated: December 2025
          </div>
        </div>
      </div>
    </div>
  );
}
