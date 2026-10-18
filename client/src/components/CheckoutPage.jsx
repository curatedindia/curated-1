import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CreditCard,
  QrCode,
  Smartphone,
  Lock,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';
import supabase from '../supabaseClient';
import { useCheckoutAuth } from '../hooks/useCheckoutAuth';

export default function CheckoutPage({ onBackToShop, onOrderPlaced, settings }) {
  const {
    user,
    profile,
    cartItems,
    subtotal,
    shippingFee,
    isFreeShipping,
    total,
    loading: authLoading,
    authError,
    clearCart
  } = useCheckoutAuth();

  const [step, setStep] = useState('FORM'); // 'FORM' | 'GATEWAY' | 'CONFIRMED' | 'FAILED'
  const [formData, setFormData] = useState({
    name: '',
    mobile: '9820123456',
    email: '',
    address: '402, Sunset Boulevard, Bandra West',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400050'
  });

  const [policyAck, setPolicyAck] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentOrder, setCurrentOrder] = useState(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState(null);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState(600);
  const [selectedPaymentTab, setSelectedPaymentTab] = useState('UPI');

  // When the page mounts or when a Supabase Auth session is detected:
  useEffect(() => {
    let isMounted = true;

    // Helper to safely populate Name and Email in state if they are empty
    const populateFromUser = (currentUser) => {
      if (!currentUser) return;
      const extractedEmail = currentUser.email || '';
      const meta = currentUser.user_metadata || {};
      const extractedName = meta.full_name || meta.name || '';

      setFormData((prev) => ({
        ...prev,
        // Populate if empty, keep existing user edits intact
        name: prev.name.trim() !== '' ? prev.name : extractedName,
        email: prev.email.trim() !== '' ? prev.email : extractedEmail
      }));
    };

    // 1. Get the current user session using supabase.auth.getSession() on mount
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error fetching Supabase session on mount:', error);
        return;
      }
      if (isMounted && session?.user) {
        populateFromUser(session.user);
      }
    });

    // 2. Listen for Supabase Auth session events (e.g. after Google OAuth redirect)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (isMounted && session?.user) {
        populateFromUser(session.user);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // 10-Minute Hold Reservation countdown timer
  useEffect(() => {
    let timer;
    if (step === 'GATEWAY' && holdExpiresAt) {
      timer = setInterval(() => {
        const remaining = Math.max(0, Math.round((new Date(holdExpiresAt) - new Date()) / 1000));
        setHoldSecondsLeft(remaining);
        if (remaining <= 0) {
          clearInterval(timer);
          setErrorMessage('Hold reservation expired. This 1-of-1 piece has been released.');
          setStep('FAILED');
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, holdExpiresAt]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Step 1: Initiate Atomic Hold Reservation
  const handleProceedToPayment = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!policyAck) {
      setErrorMessage('Please acknowledge the 1-of-1 No Return Policy before proceeding.');
      return;
    }

    if (formData.mobile.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: formData,
          items: cartItems,
          no_return_ack: policyAck
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Unable to place reservation hold on this piece.');
        setSubmitting(false);
        return;
      }

      setCurrentOrder(data.order);
      setHoldExpiresAt(data.expires_at);
      setHoldSecondsLeft(600);
      setStep('GATEWAY');
    } catch (err) {
      setErrorMessage('Network error initiating payment hold. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: Confirm Payment through Simulator
  const handleConfirmPayment = async () => {
    if (!currentOrder) return;
    setSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch(`/api/orders/${currentOrder.id}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateway_payment_id: `pay_ind_${Date.now()}`,
          payment_mode: selectedPaymentTab,
          simulate_late: false
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Payment verification failed.');
        setStep('FAILED');
        setSubmitting(false);
        return;
      }

      // Payment Succeeded!
      setCurrentOrder(data.order);
      setStep('CONFIRMED');
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      clearCart();
      if (onOrderPlaced) onOrderPlaced(data.order);
    } catch (err) {
      setErrorMessage('Payment verification error.');
      setStep('FAILED');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (authLoading) {
    return (
      <div style={{ padding: '120px 20px', textAlign: 'center', backgroundColor: 'var(--bg-primary)', minHeight: '60vh' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #E5E7EB', borderTopColor: '#121212', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
          VERIFYING GOOGLE AUTHENTICATION SESSION...
        </p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', padding: '40px 16px 80px' }}>
      <div className="container" style={{ maxWidth: '860px', margin: '0 auto' }}>
        
        {/* Navigation Breadcrumb / Back button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <button
            onClick={onBackToShop || (() => window.history.back())}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-heading)',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              textTransform: 'uppercase'
            }}
          >
            <ArrowLeft size={16} /> RETURN TO STORE
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={14} color="#121212" />
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#121212' }}>
              ENCRYPTED 256-BIT CHECKOUT
            </span>
          </div>
        </div>

        {/* Google Authentication Status Banner */}
        {profile.email && (
          <div style={{
            marginBottom: '24px',
            padding: '14px 20px',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#121212' }}>
                  Authenticated via Google OAuth
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {profile.fullName ? `${profile.fullName} • ` : ''}{profile.email}
                </div>
              </div>
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              backgroundColor: 'rgba(52, 168, 83, 0.1)',
              border: '1px solid rgba(52, 168, 83, 0.3)',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#2E7D32'
            }}>
              <CheckCircle size={13} /> VERIFIED BUYER PROFILE
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div style={{
            marginBottom: '20px',
            padding: '14px 18px',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent-red)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertTriangle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main 2-Column Checkout Layout */}
        {step === 'FORM' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
            
            {/* Column 1: Preserved Cart Items (PIGMENT-DYED HOODIE) */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '24px',
              height: 'fit-content'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '16px',
                borderBottom: '1px solid var(--border-subtle)',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingBag size={18} color="#121212" />
                  <h2 style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    YOUR PRESERVED BAG ({cartItems.length})
                  </h2>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#121212', letterSpacing: '0.06em' }}>
                  1-OF-1 ARCHIVE
                </span>
              </div>

              {/* Preserved Line Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                {cartItems.map((item) => (
                  <div
                    key={item.variant_id || item.product_id}
                    style={{
                      display: 'flex',
                      gap: '16px',
                      padding: '12px',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <img
                      src={item.image || '/products/man_street_hoodie.jpg'}
                      alt={item.name}
                      style={{ width: '74px', height: '92px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexGrow: 1 }}>
                      <div>
                        <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#121212', lineHeight: 1.3 }}>
                          {item.name}
                        </h3>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '4px' }}>
                          Size: {item.size} • 1-of-1 Piece
                        </p>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Qty: {item.quantity || 1}</span>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: '#121212' }}>
                          ₹{(item.unit_price || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Subtotal</span>
                  <span style={{ fontWeight: 600, color: '#121212' }}>₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Express Domestic Shipping</span>
                  <span style={{ color: '#2E7D32', fontWeight: 700 }}>
                    {isFreeShipping ? 'FREE' : `₹${shippingFee}`}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '16px',
                  fontWeight: 800,
                  color: '#121212',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '12px',
                  marginTop: '4px'
                }}>
                  <span>Total Amount</span>
                  <span>₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Column 2: Delivery & Payment Details Form */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '24px'
            }}>
              <form onSubmit={handleProceedToPayment}>
                <div style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.08em', color: '#121212', textTransform: 'uppercase', marginBottom: '20px' }}>
                  1. DELIVERY ADDRESS
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      FULL NAME *
                    </label>
                    <input
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g. Tanmay Sharma"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        10-DIGIT MOBILE *
                      </label>
                      <input
                        name="mobile"
                        type="tel"
                        inputMode="tel"
                        required
                        maxLength={10}
                        value={formData.mobile}
                        onChange={handleInputChange}
                        placeholder="9820012345"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        EMAIL ADDRESS *
                      </label>
                      <input
                        name="email"
                        type="email"
                        inputMode="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      STREET ADDRESS *
                    </label>
                    <input
                      name="address"
                      type="text"
                      required
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Flat, Building, Street"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>CITY *</label>
                      <input name="city" type="text" required value={formData.city} onChange={handleInputChange} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>STATE *</label>
                      <input name="state" type="text" required value={formData.state} onChange={handleInputChange} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>PINCODE *</label>
                      <input name="pincode" type="text" required maxLength={6} value={formData.pincode} onChange={handleInputChange} />
                    </div>
                  </div>
                </div>

                {/* Mandatory No Return Policy Acknowledgement */}
                <div style={{
                  padding: '14px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '24px'
                }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={policyAck}
                      onChange={(e) => setPolicyAck(e.target.checked)}
                      style={{
                        width: '18px',
                        height: '18px',
                        minHeight: '18px',
                        maxHeight: '18px',
                        padding: 0,
                        marginTop: '2px',
                        accentColor: '#121212',
                        flexShrink: 0,
                        cursor: 'pointer'
                      }}
                    />
                    <span style={{ fontSize: '12px', lineHeight: 1.5, color: '#121212' }}>
                      I understand that CURATED pieces are <strong>1-of-1 archival garments</strong> with a strict <strong>No Return / No Refund Policy</strong>.
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting || !policyAck || cartItems.length === 0}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    height: '52px',
                    fontSize: '13px',
                    letterSpacing: '0.08em',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}
                >
                  <span>{submitting ? 'PLACING 10-MIN HOLD...' : `PROCEED TO PAYMENT (₹${total.toLocaleString('en-IN')})`}</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* STEP 2: SIMULATED PAYMENT GATEWAY (10-Minute Hold) */}
        {step === 'GATEWAY' && (
          <div style={{
            maxWidth: '560px',
            margin: '0 auto',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '28px',
            boxShadow: 'var(--shadow-lg)'
          }}>
            {/* 10-Minute Hold Timer Banner */}
            <div style={{
              backgroundColor: '#121212',
              color: '#FFFFFF',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} color="#FFFFFF" />
                <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em' }}>ATOMIC HOLD ACTIVE</span>
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'monospace' }}>
                {formatTimer(holdSecondsLeft)}
              </div>
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px', textAlign: 'center' }}>
              COMPLETE PAYMENT VIA UPI OR CARD
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '24px' }}>
              Your piece is reserved for {formatTimer(holdSecondsLeft)}. Scan UPI QR or tap to simulate bank authorization.
            </p>

            {/* Payment Mode Selector */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {['UPI', 'CARD', 'NETBANKING'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSelectedPaymentTab(mode)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    backgroundColor: selectedPaymentTab === mode ? '#121212' : 'var(--bg-secondary)',
                    color: selectedPaymentTab === mode ? '#FFFFFF' : 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer'
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Simulated UPI QR Mode */}
            {selectedPaymentTab === 'UPI' && (
              <div style={{
                textAlign: 'center',
                padding: '24px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '24px'
              }}>
                <QrCode size={130} style={{ margin: '0 auto 12px', color: '#121212' }} />
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#121212' }}>
                  UPI ID: curated@okhdfcbank
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Scan with Google Pay, PhonePe, Paytm, or BHIM
                </div>
              </div>
            )}

            {/* Payment Confirm Action */}
            <button
              onClick={handleConfirmPayment}
              disabled={submitting}
              className="btn btn-primary"
              style={{ width: '100%', height: '50px', fontSize: '14px', fontWeight: 800 }}
            >
              {submitting ? 'VERIFYING WITH BANK...' : `SIMULATE PAYMENT SUCCESS (₹${total.toLocaleString('en-IN')})`}
            </button>
          </div>
        )}

        {/* STEP 3: ORDER CONFIRMED */}
        {step === 'CONFIRMED' && (
          <div style={{
            maxWidth: '560px',
            margin: '0 auto',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '36px 28px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#121212',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <CheckCircle size={32} color="#FFFFFF" />
            </div>

            <h2 style={{ fontSize: '20px', fontFamily: 'var(--font-heading)', fontWeight: 800, marginBottom: '6px' }}>
              ORDER CONFIRMED
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Order #{currentOrder?.order_number || 'CUR-IND-9021'}. Your 1-of-1 piece has been secured and reserved exclusively for you.
            </p>

            <div style={{
              padding: '16px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-sm)',
              textAlign: 'left',
              fontSize: '12.5px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Customer</span>
                <span style={{ fontWeight: 700 }}>{formData.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Email</span>
                <span style={{ fontWeight: 700 }}>{formData.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Paid</span>
                <span style={{ fontWeight: 800 }}>₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              onClick={onBackToShop || (() => window.location.href = '/')}
              className="btn btn-primary"
              style={{ width: '100%', height: '48px', fontSize: '13px' }}
            >
              CONTINUE EXPLORING ARCHIVES
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
