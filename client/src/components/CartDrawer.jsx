import React, { useEffect, useState } from 'react';
import { X, Trash2, ArrowRight, ShoppingBag, AlertTriangle, ShieldCheck } from 'lucide-react';
import supabase from '../supabaseClient';

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onRemoveItem,
  onProceedToCheckout,
  settings
}) {
  const [unavailableItemIds, setUnavailableItemIds] = useState([]);
  const [checkingStock, setCheckingStock] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState('');

  // CK-02: Re-check stock availability whenever cart opens
  useEffect(() => {
    if (isOpen && cartItems.length > 0) {
      checkCartStock();
    }
  }, [isOpen, cartItems]);

  const checkCartStock = async () => {
    setCheckingStock(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) {
        const unavailable = [];
        cartItems.forEach((item) => {
          const matchedProd = data.products.find((p) => p.id === item.product_id);
          const matchedVar = matchedProd?.variants?.find((v) => v.id === item.variant_id);
          if (!matchedVar || matchedVar.available <= 0) {
            unavailable.push(item.variant_id);
          }
        });
        setUnavailableItemIds(unavailable);
      }
    } catch (err) {
      console.error('Stock verification failed:', err);
    } finally {
      setCheckingStock(false);
    }
  };

  if (!isOpen) return null;

  const subtotal = cartItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const freeShippingThreshold = settings?.shipping_free_threshold || 1499;
  const flatShippingRate = settings?.shipping_flat_rate || 99;
  const isFreeShipping = subtotal >= freeShippingThreshold;
  const shippingFee = isFreeShipping ? 0 : flatShippingRate;
  const total = subtotal + shippingFee;

  const hasUnavailableItems = unavailableItemIds.length > 0;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(8px)',
      zIndex: 250,
      display: 'flex',
      justifyContent: 'flex-end'
    }}>
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '460px',
          height: '100%',
          backgroundColor: '#FFFFFF',
          borderLeft: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
          animation: 'fadeIn 0.25s ease'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={20} color="var(--text-primary)" />
            <h2 style={{ fontSize: '15px', fontFamily: 'var(--font-heading)', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>YOUR BAG ({cartItems.length})</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close cart"
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Free Shipping Progress bar in Future Saints Matte Black */}
        <div style={{ padding: '14px 20px', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
          {isFreeShipping ? (
            <p style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-subheading)', letterSpacing: '0.04em' }}>
              <ShieldCheck size={14} /> You've unlocked Free Domestic Shipping!
            </p>
          ) : (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontFamily: 'var(--font-body)' }}>
                Add <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>₹{(freeShippingThreshold - subtotal).toLocaleString('en-IN')}</span> more for free express shipping
              </p>
              <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--border-subtle)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, (subtotal / freeShippingThreshold) * 100)}%`,
                  height: '100%',
                  backgroundColor: 'var(--text-primary)',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Line Items List */}
        <div style={{ flexGrow: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {cartItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <ShoppingBag size={48} strokeWidth={1} style={{ margin: '0 auto 16px', opacity: 0.3, color: 'var(--text-primary)' }} />
              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Your bag is empty.</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>Explore the latest curated drops before pieces sell out.</p>
              <button onClick={onClose} className="btn btn-secondary">
                EXPLORE SHOP
              </button>
            </div>
          ) : (
            cartItems.map((item) => {
              const isUnavailable = unavailableItemIds.includes(item.variant_id);
              return (
                <div
                  key={item.variant_id}
                  style={{
                    display: 'flex',
                    gap: '14px',
                    padding: '12px',
                    backgroundColor: isUnavailable ? 'rgba(224, 122, 95, 0.08)' : 'var(--bg-secondary)',
                    border: `1px solid ${isUnavailable ? 'rgba(224, 122, 95, 0.3)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{ width: '70px', height: '88px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
                  />
                  <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                        {item.name}
                      </h4>
                      <button
                        onClick={() => onRemoveItem(item.variant_id)}
                        aria-label="Remove item"
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '4px' }}>
                      Size: {item.size} • 1-of-1 Piece
                    </div>

                    {isUnavailable ? (
                      <div style={{ fontSize: '11px', color: 'var(--accent-red)', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertTriangle size={13} />
                        This piece is no longer available.
                      </div>
                    ) : (
                      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Qty: {item.quantity}</span>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          ₹{item.unit_price.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Summary & Checkout */}
        {cartItems.length > 0 && (
          <div className="safe-bottom" style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Estimated Express Shipping</span>
                <span>{isFreeShipping ? <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>FREE</span> : `₹${flatShippingRate}`}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: 'var(--text-primary)',
                fontSize: '16px',
                fontWeight: 700,
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '8px',
                marginTop: '4px'
              }}>
                <span>Total Amount</span>
                <span style={{ color: 'var(--text-primary)' }}>₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {hasUnavailableItems && (
              <p style={{ fontSize: '11.5px', color: 'var(--accent-red)', marginBottom: '10px', textAlign: 'center' }}>
                Please remove sold/unavailable pieces to proceed to checkout.
              </p>
            )}

            {authError && (
              <p style={{ fontSize: '11.5px', color: 'var(--accent-red)', marginBottom: '10px', textAlign: 'center' }}>
                {authError}
              </p>
            )}

            <button
              onClick={async () => {
                if (hasUnavailableItems || checkingStock) return;

                // Ensure cart is saved in localStorage so it remains intact across OAuth redirect
                try {
                  localStorage.setItem('curated_cart', JSON.stringify(cartItems));
                } catch (e) {
                  console.error('Failed to sync cart:', e);
                }

                setIsSigningIn(true);
                setAuthError('');

                try {
                  // Trigger Supabase Google OAuth with redirect to /checkout
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: window.location.origin + '/checkout'
                    }
                  });

                  if (error) {
                    console.error('Supabase Google OAuth error:', error);
                    setAuthError(error.message || 'Google authentication failed.');
                    setIsSigningIn(false);
                  }
                } catch (err) {
                  console.error('Unexpected Google OAuth error:', err);
                  setAuthError('Authentication initialization failed.');
                  setIsSigningIn(false);
                }
              }}
              disabled={hasUnavailableItems || checkingStock || isSigningIn}
              className="btn btn-primary"
              style={{
                width: '100%',
                height: '48px',
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              {isSigningIn ? (
                <span>REDIRECTING TO GOOGLE...</span>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>CHECKOUT WITH GOOGLE</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onProceedToCheckout();
              }}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '11px',
                marginTop: '10px',
                cursor: 'pointer',
                textDecoration: 'underline',
                letterSpacing: '0.04em'
              }}
            >
              or continue as guest without Google
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
