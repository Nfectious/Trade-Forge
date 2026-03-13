'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/trade', label: 'Trade' },
  { href: '/contests', label: 'Contests' },
];

export default function Navigation() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/';

  useEffect(() => {
    if (isAuthPage) return;
    const token = typeof window !== 'undefined' && localStorage.getItem('access_token');
    if (!token) return;

    api.get('/auth/me')
      .then(res => setUser(res.data))
      .catch(() => {});
  }, [pathname, isAuthPage]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    window.location.href = '/login';
  };

  if (isAuthPage) {
    return (
      <header className="border-b border-crypto-dark-border">
        <nav className="container mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-xl font-bold text-crypto-dark-primary">TradeForge</span>
          <span className="text-sm text-crypto-dark-text/60 hidden sm:inline">Paper trade like a pro. Win real contests.</span>
        </nav>
      </header>
    );
  }

  return (
    <header className="border-b border-crypto-dark-border bg-crypto-dark-surface/80 backdrop-blur-sm sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: Logo + Nav Links */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-xl font-bold text-crypto-dark-primary">
            TradeForge
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-crypto-dark-primary/10 text-crypto-dark-primary'
                    : 'text-crypto-dark-text/70 hover:text-crypto-dark-text hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right: User info + Logout */}
        <div className="hidden md:flex items-center gap-3">
          {user && (
            <>
              <span className="text-sm text-crypto-dark-text/70">{user.email}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-crypto-dark-primary/20 text-crypto-dark-primary capitalize font-medium">
                {user.tier || 'free'}
              </span>
            </>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-crypto-dark-text/60 hover:text-red-400 transition-colors ml-2"
          >
            Logout
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-crypto-dark-text/70 hover:text-crypto-dark-text"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-crypto-dark-border bg-crypto-dark-surface px-4 py-3 space-y-2">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2 rounded-md text-sm font-medium ${
                pathname === link.href
                  ? 'bg-crypto-dark-primary/10 text-crypto-dark-primary'
                  : 'text-crypto-dark-text/70'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <div className="pt-2 border-t border-crypto-dark-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-crypto-dark-text/70">{user.email}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-crypto-dark-primary/20 text-crypto-dark-primary capitalize">
                  {user.tier || 'free'}
                </span>
              </div>
              <button onClick={handleLogout} className="text-sm text-red-400">
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
