import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Package,
  Truck,
  Trash2,
  LogOut,
  ChevronRight,
  ShieldCheck,
  X,
  AlertTriangle
} from 'lucide-react';

export default function ProfileMenu({
  user,
  onNavigateToOrders,
  onNavigateToTrack,
  onLogout,
  onDeleteAccount
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef(null);

  // Extract user details
  const meta = user?.user_metadata || {};
  const email = user?.email || meta.email || (() => {
    try {
      return (
        localStorage.getItem('curated_customer_email') ||
        JSON.parse(localStorage.getItem('curated_last_order') || '{}')?.customer_email ||
        ''
      );
    } catch {
      return '';
    }
  })();

  const displayName =
    meta.full_name ||
    meta.name ||
    (() => {
      try {
        return (
          localStorage.getItem('curated_customer_name') ||
          JSON.parse(localStorage.getItem('curated_last_order') || '{}')?.customer_name ||
          (email ? email.split('@')[0] : 'Patron')
        );
      } catch {
        return email ? email.split('@')[0] : 'Patron';
      }
    })();

  const avatarUrl = meta.avatar_url || meta.picture || '';
  const initialLetter = (displayName || email || 'C').charAt(0).toUpperCase();

  // Close when clicking outside on desktop
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleOrdersClick = () => {
    setIsOpen(false);
    if (onNavigateToOrders) onNavigateToOrders();
  };

  const handleTrackClick = () => {
    setIsOpen(false);
    if (onNavigateToTrack) onNavigateToTrack();
  };

  const handleLogoutClick = () => {
    setIsOpen(false);
    if (onLogout) onLogout();
  };

  const confirmDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      if (onDeleteAccount) {
        await onDeleteAccount();
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setIsOpen(false);
    }
  };

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      
      {/* PROFILE TRIGGER BUTTON (In the Top Right Corner of Header) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User Profile and Orders Menu"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          backgroundColor: '#121212',
          border: '1.5px solid #121212',
          cursor: 'pointer',
          padding: 0,
          position: 'relative',
          transition: 'all 0.15s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <span style={{
            fontSize: '14px',
            fontWeight: 800,
            fontFamily: 'var(--font-heading)',
            color: '#FFFFFF',
            lineHeight: 1
          }}>
            {initialLetter}
          </span>
        )}

        {/* Small Emerald Online/Verified Indicator Dot */}
        <span style={{
          position: 'absolute',
          bottom: '-1px',
          right: '-1px',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: '#16A34A',
          border: '2px solid #FFFFFF'
        }} />
      </button>

      {/* ========================================================
          DESKTOP / LAPTOP FLOATING DROPDOWN MENU
      ======================================================== */}
      {isOpen && (
        <div
          className="desktop-only"
          style={{
            position: 'absolute',
            top: 'calc(100% + 12px)',
            right: 0,
            width: '280px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E4E4E7',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
            zIndex: 1000,
            padding: '16px',
            boxSizing: 'border-box'
          }}
        >
          {/* User Info Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '14px', borderBottom: '1px solid #F4F4F5' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: '#121212',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '16px',
              flexShrink: 0
            }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                initialLetter
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#121212', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayName}
              </div>
              <div style={{ fontSize: '11px', color: '#71717A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>
                {email || 'Verified Buyer'}
              </div>
              <span style={{
                display: 'inline-block',
                fontSize: '9.5px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                color: '#15803D',
                backgroundColor: '#DCFCE7',
                padding: '2px 6px',
                borderRadius: '4px',
                marginTop: '4px'
              }}>
                ✦ VERIFIED PATRON
              </span>
            </div>
          </div>

          {/* Menu Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px' }}>
            
            {/* Orders */}
            <button
              onClick={handleOrdersClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '6px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F4F4F5')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Package size={17} color="#121212" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#121212' }}>ORDERS</div>
                  <div style={{ fontSize: '11px', color: '#71717A' }}>View delivery &amp; tracking status</div>
                </div>
              </div>
              <ChevronRight size={15} color="#A1A1AA" />
            </button>

            {/* Track Order */}
            <button
              onClick={handleTrackClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '6px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F4F4F5')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Truck size={17} color="#121212" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#121212' }}>TRACK SHIPMENT</div>
                  <div style={{ fontSize: '11px', color: '#71717A' }}>Courier air cargo lookup</div>
                </div>
              </div>
              <ChevronRight size={15} color="#A1A1AA" />
            </button>

            <hr style={{ border: 'none', borderTop: '1px solid #F4F4F5', margin: '6px 0' }} />

            {/* Delete Account */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '6px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                color: '#DC2626',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEE2E2')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Trash2 size={16} color="#DC2626" />
              <div style={{ fontSize: '12.5px', fontWeight: 700 }}>DELETE ACCOUNT</div>
            </button>

            {/* Log Out */}
            <button
              onClick={handleLogoutClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '6px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                color: '#52525B',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F4F4F5')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <LogOut size={16} color="#52525B" />
              <div style={{ fontSize: '12.5px', fontWeight: 700 }}>LOG OUT</div>
            </button>

          </div>
        </div>
      )}

      {/* ========================================================
          MOBILE / TABLET SLIDE-UP BOTTOM SHEET MENU
      ======================================================== */}
      {isOpen && (
        <div
          className="mobile-only"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(3px)',
            zIndex: 999999,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
              padding: '24px 20px calc(24px + env(safe-area-inset-bottom, 16px))',
              boxSizing: 'border-box',
              maxHeight: '85vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar with Handle & Close */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{
                width: '36px',
                height: '4px',
                backgroundColor: '#E4E4E7',
                borderRadius: '2px',
                margin: '0 auto'
              }} />
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '6px',
                  cursor: 'pointer',
                  color: '#71717A'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* User Profile Card */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px',
              backgroundColor: '#FAFAFA',
              border: '1px solid #E4E4E7',
              borderRadius: '10px',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundColor: '#121212',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 900,
                flexShrink: 0
              }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  initialLetter
                )}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#121212' }}>
                  {displayName}
                </div>
                <div style={{ fontSize: '12px', color: '#71717A', wordBreak: 'break-all', marginTop: '2px' }}>
                  {email || 'Verified Patron'}
                </div>
                <span style={{
                  display: 'inline-block',
                  fontSize: '10px',
                  fontWeight: 800,
                  color: '#15803D',
                  backgroundColor: '#DCFCE7',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  marginTop: '4px'
                }}>
                  ✦ VERIFIED PATRON
                </span>
              </div>
            </div>

            {/* Mobile Actions (Tall Touch-Friendly Rows, Min 52px) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              
              {/* Orders */}
              <button
                onClick={handleOrdersClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: '52px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#F4F4F5',
                  border: '1px solid #E4E4E7',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Package size={20} color="#121212" />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#121212' }}>ORDERS</div>
                    <div style={{ fontSize: '11.5px', color: '#71717A' }}>Delivery status &amp; piece details</div>
                  </div>
                </div>
                <ChevronRight size={18} color="#71717A" />
              </button>

              {/* Track Shipment */}
              <button
                onClick={handleTrackClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: '52px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Truck size={20} color="#121212" />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#121212' }}>TRACK SHIPMENT</div>
                    <div style={{ fontSize: '11.5px', color: '#71717A' }}>Live courier status lookup</div>
                  </div>
                </div>
                <ChevronRight size={18} color="#71717A" />
              </button>

              <hr style={{ border: 'none', borderTop: '1px solid #E4E4E7', margin: '8px 0' }} />

              {/* Delete Account */}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  minHeight: '48px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#DC2626',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <Trash2 size={18} color="#DC2626" />
                <span style={{ fontSize: '13.5px', fontWeight: 800 }}>DELETE ACCOUNT</span>
              </button>

              {/* Log Out */}
              <button
                onClick={handleLogoutClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  minHeight: '48px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  color: '#52525B',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <LogOut size={18} color="#52525B" />
                <span style={{ fontSize: '13.5px', fontWeight: 800 }}>LOG OUT</span>
              </button>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          DELETE ACCOUNT CONFIRMATION MODAL
      ======================================================== */}
      {showDeleteConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 9999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              maxWidth: '420px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              boxSizing: 'border-box'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <AlertTriangle size={24} />
            </div>

            <h3 style={{
              fontSize: '18px',
              fontWeight: 900,
              fontFamily: 'var(--font-heading)',
              color: '#121212',
              margin: '0 0 8px 0'
            }}>
              DELETE ACCOUNT DATA?
            </h3>

            <p style={{ fontSize: '13px', color: '#52525B', lineHeight: '1.5', margin: '0 0 20px 0' }}>
              This action will permanently wipe your session, saved shipping profile, and local authentication records from Curated. This action cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  minHeight: '44px',
                  backgroundColor: '#F4F4F5',
                  border: '1px solid #D4D4D8',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  color: '#121212'
                }}
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={confirmDeleteAccount}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  minHeight: '44px',
                  backgroundColor: '#DC2626',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  color: '#FFFFFF'
                }}
              >
                {isDeleting ? 'DELETING...' : 'YES, DELETE'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
