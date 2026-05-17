import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const navItems = [
  { label: '产品功能', href: '#features' },
  { label: '演示体验', href: '#demo' },
  { label: '坐席工作台', href: '/agent-login' },
  { label: 'API文档', href: '#api' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/90 backdrop-blur-md shadow-soft' : 'bg-transparent'
      }`}
    >
      <div className="flex items-center justify-between px-6 md:px-10 h-16">
        <a href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <i className="ri-chat-smile-3-line text-white text-lg" />
          </div>
          <span className="font-semibold text-slate-800 text-lg tracking-tight">ChatFlow</span>
        </a>

        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) =>
            item.href.startsWith('/') ? (
              <Link
                key={item.href}
                to={item.href}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.href}
                href={item.href}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors"
              >
                {item.label}
              </a>
            )
          )}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/chat-demo"
            className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors shadow-soft"
          >
            立即体验
          </Link>
        </div>

        <button
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <i className={`ri-${mobileOpen ? 'close' : 'menu'}-line text-xl`} />
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 px-6 py-4 shadow-elevated">
          {navItems.map((item) =>
            item.href.startsWith('/') ? (
              <Link
                key={item.href}
                to={item.href}
                className="block py-3 text-sm font-medium text-slate-600 border-b border-slate-50 last:border-0"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.href}
                href={item.href}
                className="block py-3 text-sm font-medium text-slate-600 border-b border-slate-50 last:border-0"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </a>
            )
          )}
          <Link
            to="/chat-demo"
            className="block mt-3 text-center px-5 py-2.5 bg-brand-500 text-white text-sm font-medium rounded-lg"
            onClick={() => setMobileOpen(false)}
          >
            立即体验
          </Link>
        </div>
      )}
    </nav>
  );
}