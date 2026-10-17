import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShoppingBag, Search, Menu, X, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Navbar({
  currentView,
  setCurrentView,
  cartCount,
  onOpenCart,
  onOpenSearch,
  soldOutEnabled,
  isAdmin,
  setIsAdmin
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Nav items explicitly matching customer requirements
  const navItems = [
    { id: 'home', label: 'HOME' },
    { id: 'shop', label: 'SHOP ALL' },
    { id: 'new-drops', label: 'NEW DROPS' },
    { id: 'sold-out', label: 'SOLD OUT' },
    { id: 'about', label: 'ABOUT US' },
    { id: 'track-order', label: 'TRACK ORDER' },
    { id: 'contact', label: 'CONTACT' },
  ];

  // Prevent background scroll while mobile menu drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleNavClick = (id) => {
    setCurrentView(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        {/* Main Navigation Bar (79px) */}
        <div className="container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '79px'
        }}>
          {/* Left Side: Brand Logo in Left Corner + Mobile Hamburger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              style={{
                display: 'flex',
                background: 'transparent',
                padding: '8px',
                color: 'var(--text-primary)',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '4px'
              }}
              className="mobile-only"
            >
              {mobileMenuOpen ? <X size={26} color="#121212" /> : <Menu size={26} color="#121212" />}
            </button>

            {/* Brand Logo - In the Left Corner */}
            <div
              onClick={() => handleNavClick('home')}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(20px, 4.5vw, 24px)',
                fontWeight: 800,
                letterSpacing: '0.14em',
                color: '#121212',
                lineHeight: 1,
                textTransform: 'uppercase'
              }}>
                CURATED
              </span>
            </div>

            {/* Desktop Navigation Links */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: '22px' }} className="desktop-only">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '8px 0',
                    color: currentView === item.id ? '#121212' : '#52525B',
                    opacity: currentView === item.id ? 1 : 0.8,
                    fontSize: '12.5px',
                    fontFamily: 'var(--font-btn)',
                    fontWeight: currentView === item.id ? 800 : 600,
                    letterSpacing: '0.08em',
                    cursor: 'pointer',
                    borderBottom: currentView === item.id ? '2px solid #121212' : '2px solid transparent',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Right Side: Search + Admin (desktop) + Cart */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Search Trigger */}
            <button
              onClick={onOpenSearch}
              aria-label="Search Catalog"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#121212',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Search size={20} />
            </button>


            {/* Cart Trigger */}
            <button
              onClick={onOpenCart}
              aria-label="Shopping Cart"
              style={{
                position: 'relative',
                background: '#121212',
                border: '1px solid #121212',
                color: '#FFFFFF',
                borderRadius: 'var(--radius-sm)',
                padding: '7px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ShoppingBag size={15} color="#FFFFFF" />
              <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-btn)', color: '#FFFFFF' }}>
                {cartCount}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation Menu rendered via Portal outside header stacking context */}
      {mobileMenuOpen && typeof document !== 'undefined' && createPortal(
        <div
          id="curated-mobile-menu"
          className="safe-bottom"
          style={{
            position: 'fixed',
            top: '79px',
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: 'calc(100dvh - 79px)',
            backgroundColor: '#FFFFFF',
            padding: '20px 20px 40px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            zIndex: 999999,
            borderTop: '1px solid var(--border-subtle)',
            overflowY: 'auto',
            boxSizing: 'border-box'
          }}
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              style={{
                background: 'transparent',
                border: 'none',
                textAlign: 'left',
                fontSize: '17px',
                fontWeight: currentView === item.id ? 800 : 700,
                fontFamily: 'var(--font-heading)',
                letterSpacing: '0.06em',
                color: currentView === item.id ? '#121212' : '#3F3F46',
                padding: '14px 4px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              <span>{item.label}</span>
              <ArrowRight size={18} color={currentView === item.id ? '#121212' : '#A1A1AA'} />
            </button>
          ))}


          <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid var(--border-subtle)' }}>
            <p style={{ fontSize: '11px', color: '#121212', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>
              CURATED CONCIERGE
            </p>
            <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: 600 }}>hello.curatedindia@gmail.com</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Hours: 10:00 AM – 8:00 PM IST</p>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        @media (max-width: 900px) {
          .desktop-only { display: none !important; }
        }
        @media (min-width: 901px) {
          .mobile-only { display: none !important; }
        }
      `}</style>
    </>
  );
}
