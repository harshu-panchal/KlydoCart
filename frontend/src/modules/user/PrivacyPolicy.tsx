import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="pb-24 md:pb-8 bg-white min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-b from-blue-100 to-white pb-6 pt-12">
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
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-2">Privacy Policy</h1>
            <p className="text-sm text-neutral-600">Your privacy is important to us</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-6 lg:px-8 py-8 max-w-4xl mx-auto">
        <div className="prose prose-sm md:prose-base text-neutral-700 space-y-6">
          <section>
            <h2 className="text-xl font-bold text-neutral-900 mb-3">1. Information We Collect</h2>
            <p>
              We collect information you provide directly to us when you create an account, place an order, or contact us. This may include your name, email address, phone number, delivery address, and payment information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900 mb-3">2. How We Use Your Information</h2>
            <p>
              We use your information to process and deliver your orders, communicate with you about your account, and improve our services. We may also send you promotional communications if you opt-in.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900 mb-3">3. Data Sharing and Security</h2>
            <p>
              We do not sell your personal information. We share your data with trusted partners only as necessary to fulfill your orders (e.g., sharing your address with delivery partners). We implement security measures to protect your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900 mb-3">4. Your Choices</h2>
            <p>
              You can access and update your account information at any time. You can also opt-out of receiving marketing communications from us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900 mb-3">5. Cookies</h2>
            <p>
              We use cookies to enhance your experience, remember your preferences, and analyze app traffic. You can manage cookie settings in your browser.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900 mb-3">6. Updates to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy on our app.
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
