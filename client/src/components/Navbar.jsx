import React, { useState } from 'react';
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

  const navItems = [
    { id: 'home', label: 'HOME' },
    { id: 'shop', label: 'SHOP ALL' },
    { id: 'new-drops', label: 'NEW DROPS' },
    ...(soldOutEnabled ? [{ id: 'sold-out', label: 'SOLD OUT' }] : []),
    { id: 'about', label: 'ABOUT US' },
    { id: 'track-order', label: 'TRACK ORDER' },
    { id: 'contact', label: 'CONTACT' },
  ];

  const handleNavClick = (id) => {
    setCurrentView(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
      transition: 'all 0.2s ease'
    }}>

      {/* 2. Main Navigation Bar */}
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '79px'
      }}>
        {/* Left Side: Brand Logo in Left Corner + Mobile Hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            style={{
              display: 'flex',
              background: 'transparent',
              padding: '6px',
              color: 'var(--text-primary)',
              border: 'none',
              cursor: 'pointer'
            }}
            className="mobile-only"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
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

        {/* Right Side: Search + Admin + Cart */}
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

          {/* Quick Admin Toggle (Desktop) */}
          <button
            onClick={() => handleNavClick(isAdmin ? 'shop' : 'admin')}
            className="desktop-only"
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              fontFamily: 'var(--font-btn)',
              fontWeight: 700,
              letterSpacing: '0.06em',
              borderRadius: 'var(--radius-sm)',
              background: isAdmin ? '#121212' : 'transparent',
              color: isAdmin ? '#FFFFFF' : '#121212',
              border: '1px solid #121212',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <ShieldCheck size={13} color={isAdmin ? '#FFFFFF' : '#121212'} />
            <span>ADMIN</span>
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

      {/* Mobile Drawer Navigation Menu */}
      {mobileMenuOpen && (
        <div
          className="safe-bottom"
          style={{
            position: 'fixed',
            top: '79px',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#FFFFFF',
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            zIndex: 99,
            borderTop: '1px solid var(--border-subtle)',
            overflowY: 'auto'
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
                fontSize: '15px',
                fontWeight: 700,
                fontFamily: 'var(--font-heading)',
                letterSpacing: '0.06em',
                color: currentView === item.id ? '#121212' : '#52525B',
                padding: '12px 0',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
            >
              <span>{item.label}</span>
              <ArrowRight size={16} color="#121212" />
            </button>
          ))}

          {/* Mobile Admin Portal Entry */}
          <button
            onClick={() => handleNavClick(isAdmin ? 'shop' : 'admin')}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              textAlign: 'left',
              fontSize: '13px',
              fontWeight: 700,
              fontFamily: 'var(--font-btn)',
              letterSpacing: '0.06em',
              color: '#121212',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              marginTop: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="#121212" />
              <span>ADMIN PORTAL</span>
            </div>
            <ArrowRight size={14} color="#121212" />
          </button>

          <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
            <p style={{ fontSize: '11px', color: '#121212', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>
              CURATED CONCIERGE
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-primary)' }}>hello.curatedindia@gmail.com</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Hours: 10:00 AM – 8:00 PM IST</p>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .desktop-only { display: none !important; }
        }
        @media (min-width: 901px) {
          .mobile-only { display: none !important; }
        }
      `}</style>
    </header>
  );
}
