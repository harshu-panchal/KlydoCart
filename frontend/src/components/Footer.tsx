import { Link } from 'react-router-dom';
import { useThemeContext } from '../context/ThemeContext';

export default function Footer() {
  const { currentTheme } = useThemeContext();

  return (
    <footer 
      className="hidden md:block pt-16 pb-8 mt-12 md:mt-24"
      style={{
        background: `linear-gradient(to right, ${currentTheme.primary[0]}, ${currentTheme.primary[1]})`,
      }}
    >
      <div className="max-w-[1600px] mx-auto px-8 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16 text-white">
          {/* Logo & About Section */}
          <div className="flex flex-col gap-6">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm overflow-hidden border border-white/20">
                <img 
                  src="/KlydoCardLatest.png" 
                  alt="KlydoCart" 
                  className="w-10 h-10 object-contain"
                />
              </div>
              <span className="text-2xl font-black tracking-tighter text-white uppercase">
                KLYDO CART
              </span>
            </Link>
            <p className="text-white/70 text-sm leading-relaxed max-w-xs">
              Experience the future of grocery shopping with Klydo Cart. Freshness delivered to your doorstep in minutes.
            </p>
            <div className="flex gap-4">
              {[
                { name: 'facebook', url: 'https://www.facebook.com/share/1GzQwTUgQr/' },
                { name: 'instagram', url: 'https://www.instagram.com/klydocart?igsh=d3prM2Y3eno0dms2' }
              ].map((social) => (
                <a 
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-white hover:text-neutral-900 transition-all duration-300 shadow-sm border border-white/10"
                >
                  <span className="sr-only">{social.name}</span>
                  {social.name === 'facebook' && (
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  )}
                  {social.name === 'instagram' && (
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  )}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white">Information</h3>
            <ul className="flex flex-col gap-3">
              {[
                { label: 'Home', path: '/' },
                { label: 'Categories', path: '/categories' },
                { label: 'Order History', path: '/order-again' },
                { label: 'My Account', path: '/account' }
              ].map((link) => (
                <li key={link.label}>
                  <Link to={link.path} className="text-white/70 hover:text-white transition-colors text-sm font-medium">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service */}
          <div className="flex flex-col gap-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white">Support</h3>
            <ul className="flex flex-col gap-3">
              {[
                { label: 'Help Center', path: '/faq' },
                { label: 'Track Order', path: '/order-again' },
                { label: 'Privacy Policy', path: '/privacy-policy' },
                { label: 'Terms of Use', path: '/terms-of-use' }
              ].map((link) => (
                <li key={link.label}>
                  <Link to={link.path} className="text-white/70 hover:text-white transition-colors text-sm font-medium">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Section */}
          <div className="flex flex-col gap-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white">Contact Us</h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 text-sm text-white/70 font-medium">
                <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60">📍</span>
                <span>Vidya Nagar, Harmu, Ranchi 834002</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-white/70 font-medium cursor-pointer hover:text-white transition-colors">
                <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60">📞</span>
                <span>+91 90312 75861</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-white/70 font-medium cursor-pointer hover:text-white transition-colors">
                <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60">✉️</span>
                <span>klydocart@gmail.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/50 text-xs font-medium">
            © 2026 Klydo Cart. All rights reserved.
          </p>
          <div className="flex items-center gap-6 opacity-40">
          </div>
        </div>
      </div>
    </footer>
  );
}
