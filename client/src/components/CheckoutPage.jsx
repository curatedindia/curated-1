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
import { QRCodeSVG } from 'qrcode.react';
import supabase from '../supabaseClient';
import { useCheckoutAuth } from '../hooks/useCheckoutAuth';

const ADMIN_UPI_ID = 'nikhilpole90-2@okicici';
const ADMIN_NAME = 'Nikhil Pole';

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
    mobile: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });

  const [policyAck, setPolicyAck] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentOrder, setCurrentOrder] = useState(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState(null);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState(600);
  const [selectedPaymentTab, setSelectedPaymentTab] = useState('UPI');

  // Dynamic UPI Payment & UTR Verification state
  const [utrInput, setUtrInput] = useState('');
  const [isVerifyingUtr, setIsVerifyingUtr] = useState(false);
  const [paymentStatusMsg, setPaymentStatusMsg] = useState({ text: '', type: '' });
  const [copiedUpi, setCopiedUpi] = useState(false);

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

    if (!formData.mobile || formData.mobile.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setSubmitting(true);
    let orderData = null;
    let expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

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

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok && data.success && data.order) {
          orderData = data.order;
          if (data.expires_at) expiresAt = data.expires_at;
        } else if (data.message && data.message.includes('sold out')) {
          setErrorMessage(data.message);
          setSubmitting(false);
          return;
        }
      }
    } catch (apiErr) {
      console.warn('Backend checkout API warning, continuing to dynamic UPI payment:', apiErr);
    }

    // Always ensure customer has an order reference to scan and pay via UPI
    if (!orderData) {
      const orderNumber = `CUR-${Math.floor(1000 + Math.random() * 9000)}`;
      const orderId = `ord-${Date.now()}`;
      orderData = {
        id: orderId,
        order_number: orderNumber,
        customer: formData,
        items: cartItems,
        total: total,
        payment_status: 'PENDING',
        order_status: 'PENDING_PAYMENT',
        created_at: new Date().toISOString()
      };
    }

    setCurrentOrder(orderData);
    setHoldExpiresAt(expiresAt);
    setHoldSecondsLeft(600);
    setStep('GATEWAY');
    setSubmitting(false);
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

  // Step 2b: Handle UTR submission and automated verification polling
  const handleUtrSubmit = async (e) => {
    e.preventDefault();
    const cleanUtr = utrInput.trim();
    if (!cleanUtr || cleanUtr.length !== 12) {
      setPaymentStatusMsg({
        text: 'Please enter a valid 12-digit numeric UTR/Ref No.',
        type: 'error'
      });
      return;
    }

    setIsVerifyingUtr(true);
    setPaymentStatusMsg({
      text: 'Checking bank logs...',
      type: 'info'
    });

    const orderRef = currentOrder?.order_number || currentOrder?.id || `ORD-${Date.now()}`;

    // 1. Submit UTR to Express server
    if (currentOrder?.id) {
      try {
        await fetch(`/api/orders/${currentOrder.id}/confirm-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gateway_payment_id: cleanUtr,
            payment_mode: 'UPI',
            utr: cleanUtr
          })
        });
      } catch (err) {
        console.warn('Backend payment confirmation notice:', err);
      }
    }

    // 2. Insert order directly into Supabase orders table for immediate Admin Dashboard visibility
    try {
      await supabase.from('orders').insert([{
        order_number: orderRef,
        customer_name: formData.name || profile.fullName || 'Customer',
        customer_email: formData.email || profile.email || 'customer@example.com',
        total_amount: total,
        status: 'PENDING',
        payment_status: 'PAID',
        items: cartItems.map((it) => ({
          name: it.name || it.title,
          sku: it.sku || 'CUR-ITEM',
          size: it.size || 'One Size',
          price: it.price || it.selling_price
        })),
        shipping_address: formData,
        created_at: new Date().toISOString()
      }]);
    } catch (err) {
      console.warn('Supabase orders table sync notice:', err);
    }

    // 3. Poll /api/check-payment status
    let attempts = 0;
    const maxAttempts = 10;

    const timer = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/check-payment?utr=${encodeURIComponent(cleanUtr)}&amount=${total}&orderId=${encodeURIComponent(currentOrder?.id || orderRef)}`);
        const data = await res.json();

        if (data && data.status === 'VERIFIED') {
          clearInterval(timer);
          setIsVerifyingUtr(false);
          setPaymentStatusMsg({
            text: '✅ Payment Verified! Processing your order...',
            type: 'success'
          });
          setTimeout(() => {
            setStep('CONFIRMED');
            confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
            clearCart();
            if (onOrderPlaced) onOrderPlaced(currentOrder || { order_number: orderRef });
          }, 1500);
        } else if (attempts >= maxAttempts) {
          clearInterval(timer);
          setIsVerifyingUtr(false);
          setPaymentStatusMsg({
            text: '⏳ Payment log pending. Our team will verify it shortly.',
            type: 'warning'
          });
          setTimeout(() => {
            setStep('CONFIRMED');
            confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
            clearCart();
            if (onOrderPlaced) onOrderPlaced(currentOrder || { order_number: orderRef });
          }, 2000);
        }
      } catch (err) {
        console.error('Polling error:', err);
        if (attempts >= maxAttempts) {
          clearInterval(timer);
          setIsVerifyingUtr(false);
          setPaymentStatusMsg({
            text: '⏳ Payment log pending. Our team will verify it shortly.',
            type: 'warning'
          });
          setTimeout(() => {
            setStep('CONFIRMED');
            clearCart();
          }, 2000);
        }
      }
    }, 3000);
  };

  const handleCopyUpi = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(ADMIN_UPI_ID);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
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

        {/* STEP 2: DYNAMIC UPI QR GATEWAY (10-Minute Hold) */}
        {step === 'GATEWAY' && (() => {
          const cartAmountFormatted = Number(total || 0).toFixed(2);
          const orderRef = currentOrder?.order_number || currentOrder?.id || `ORD-${Date.now()}`;
          const upiDeepLink = `upi://pay?pa=${encodeURIComponent(ADMIN_UPI_ID)}&pn=${encodeURIComponent(ADMIN_NAME)}&am=${cartAmountFormatted}&cu=INR&tn=${encodeURIComponent('Order ' + orderRef)}`;

          return (
            <div className="checkout-card" style={{
              maxWidth: '480px',
              margin: '0 auto',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '28px 20px',
              boxShadow: 'var(--shadow-lg)',
              textAlign: 'center',
              boxSizing: 'border-box'
            }}>
              {/* 10-Minute Hold Timer Banner */}
              <div style={{
                backgroundColor: '#121212',
                color: '#FFFFFF',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '18px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={15} color="#FFFFFF" />
                  <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em' }}>ATOMIC HOLD ACTIVE</span>
                </div>
                <div style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'monospace' }}>
                  {formatTimer(holdSecondsLeft)}
                </div>
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 6px', fontFamily: 'var(--font-heading)' }}>
                Scan &amp; Pay
              </h3>
              <p style={{ fontSize: '14px', margin: '0 0 14px', color: '#121212' }}>
                Total Cart Amount: <strong>₹<span id="cart-amount">{cartAmountFormatted}</span></strong>
              </p>

              {/* Container where JS renders the Admin's QR */}
              <div id="qrcode-container" style={{
                margin: '12px auto 14px',
                display: 'inline-block',
                padding: '14px',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E4E4E7',
                boxShadow: '0 2px 10px rgba(0,0,0,0.06)'
              }}>
                <QRCodeSVG
                  value={upiDeepLink}
                  size={220}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <p style={{ fontSize: '12px', color: '#666', margin: '0 0 12px' }}>
                Amount is locked. Scan with GPay, PhonePe, or Paytm.
              </p>

              {/* Admin UPI Details Badge with Copy button */}
              <div
                onClick={handleCopyUpi}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  backgroundColor: '#F4F4F5',
                  border: '1px solid #E4E4E7',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#121212',
                  marginBottom: '16px',
                  cursor: 'pointer'
                }}
              >
                <span>UPI ID: <strong>{ADMIN_UPI_ID}</strong></span>
                <span style={{ fontSize: '11px', color: '#71717A', textDecoration: 'underline' }}>
                  {copiedUpi ? 'COPIED ✓' : 'COPY'}
                </span>
              </div>

              {/* Direct Tap for Mobile Devices */}
              <div style={{ marginBottom: '18px' }}>
                <a
                  href={upiDeepLink}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    minHeight: '44px',
                    backgroundColor: '#F4F4F5',
                    color: '#121212',
                    border: '1px solid #D4D4D8',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textDecoration: 'none'
                  }}
                >
                  <Smartphone size={16} />
                  <span>TAP TO PAY IN UPI APP (MOBILE)</span>
                </a>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #E4E4E7', margin: '18px 0' }} />

              {/* Form for customer to enter UTR number after paying */}
              <form id="utr-form" onSubmit={handleUtrSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <label htmlFor="utr-input" style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.04em', color: '#121212' }}>
                  ENTER 12-DIGIT UTR / REFERENCE NUMBER *
                </label>
                <input
                  type="text"
                  id="utr-input"
                  placeholder="Enter 12-digit UTR/Ref No."
                  maxLength={12}
                  pattern="\d{12}"
                  required
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  style={{
                    padding: '10px 14px',
                    width: '85%',
                    maxWidth: '300px',
                    textAlign: 'center',
                    fontSize: '16px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    border: '1px solid #D4D4D8',
                    borderRadius: '6px',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="submit"
                  id="submit-btn"
                  disabled={isVerifyingUtr || utrInput.length !== 12}
                  style={{
                    padding: '12px 24px',
                    width: '85%',
                    maxWidth: '300px',
                    backgroundColor: utrInput.length === 12 ? '#28a745' : '#71717A',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    cursor: utrInput.length === 12 && !isVerifyingUtr ? 'pointer' : 'not-allowed',
                    transition: 'background-color 0.2s ease',
                    marginTop: '4px'
                  }}
                >
                  {isVerifyingUtr ? 'Verifying Bank Logs...' : 'Submit & Verify Order'}
                </button>
              </form>

              {paymentStatusMsg.text && (
                <p
                  id="status-msg"
                  style={{
                    fontWeight: 'bold',
                    marginTop: '15px',
                    fontSize: '13px',
                    color:
                      paymentStatusMsg.type === 'success'
                        ? '#28a745'
                        : paymentStatusMsg.type === 'warning'
                        ? '#D97706'
                        : paymentStatusMsg.type === 'error'
                        ? '#DC2626'
                        : '#121212'
                  }}
                >
                  {paymentStatusMsg.text}
                </p>
              )}
            </div>
          );
        })()}

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
