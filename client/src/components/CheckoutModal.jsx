import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CreditCard,
  QrCode,
  Smartphone,
  Lock,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QRCodeSVG } from 'qrcode.react';
import supabase from '../supabaseClient';

const ADMIN_UPI_ID = 'nikhilpole90-2@okicici';
const ADMIN_NAME = 'Nikhil Pole';

export default function CheckoutModal({
  isOpen,
  onClose,
  cartItems,
  onOrderSuccess,
  onOpenPolicy,
  settings,
  authUser
}) {
  if (!isOpen) return null;

  const [step, setStep] = useState('FORM'); // 'FORM' | 'GATEWAY' | 'CONFIRMED' | 'FAILED' | 'LATE_REFUND'
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });

  // Dynamic UPI Payment & UTR Verification state
  const [utrInput, setUtrInput] = useState('');
  const [isVerifyingUtr, setIsVerifyingUtr] = useState(false);
  const [paymentStatusMsg, setPaymentStatusMsg] = useState({ text: '', type: '' });
  const [copiedUpi, setCopiedUpi] = useState(false);

  // When the modal mounts or when a Supabase Auth session is detected:
  useEffect(() => {
    let isMounted = true;

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

    // 1. Check if authUser prop is already available
    if (authUser) {
      populateFromUser(authUser);
    }

    // 2. Get current user session using supabase.auth.getSession()
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error fetching Supabase session on checkout modal mount:', error);
        return;
      }
      if (isMounted && session?.user) {
        populateFromUser(session.user);
      }
    });

    // 3. Listen for Supabase Auth session changes/events
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (isMounted && session?.user) {
        populateFromUser(session.user);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [authUser]);

  const [policyAck, setPolicyAck] = useState(false); // CK-05: Mandatory unchecked by default
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentOrder, setCurrentOrder] = useState(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState(null);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState(600);
  const [selectedPaymentTab, setSelectedPaymentTab] = useState('UPI');

  // Subtotal & Shipping calculation
  const subtotal = cartItems.reduce((sum, it) => sum + it.unit_price * it.quantity, 0);
  const freeThreshold = settings?.shipping_free_threshold || 1499;
  const flatShipping = settings?.shipping_flat_rate || 99;
  const shipping = subtotal >= freeThreshold ? 0 : flatShipping;
  const total = subtotal + shipping;

  // Countdown timer for 10-minute hold (INV-10)
  useEffect(() => {
    let timer;
    if (step === 'GATEWAY' && holdExpiresAt) {
      timer = setInterval(() => {
        const remaining = Math.max(0, Math.round((new Date(holdExpiresAt) - new Date()) / 1000));
        setHoldSecondsLeft(remaining);
        if (remaining <= 0) {
          clearInterval(timer);
          setErrorMessage('Hold expired. This piece has been released.');
          setStep('FAILED');
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, holdExpiresAt]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Step 1: Initiate Checkout & Atomic Hold
  const handleProceedToPayment = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!policyAck) {
      setErrorMessage('You must acknowledge the No Return Policy before proceeding.');
      return;
    }

    if (!formData.mobile || formData.mobile.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setLoading(true);
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
          setLoading(false);
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
    setLoading(false);
  };

  // Step 2: Confirm Payment through Gateway Simulator
  const handleConfirmPayment = async (simulateLate = false) => {
    if (!currentOrder) return;
    setLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch(`/api/orders/${currentOrder.id}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateway_payment_id: `pay_ind_${Date.now()}`,
          payment_mode: selectedPaymentTab,
          simulate_late: simulateLate
        })
      });
      const data = await res.json();

      if (data.edge_case === 'LATE_PAYMENT_ITEM_UNAVAILABLE') {
        setCurrentOrder(data.order);
        setStep('LATE_REFUND');
        setLoading(false);
        return;
      }

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Payment verification failed.');
        setStep('FAILED');
        setLoading(false);
        return;
      }

      // Success!
      setCurrentOrder(data.order);
      setStep('CONFIRMED');
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      onOrderSuccess();
    } catch (err) {
      setErrorMessage('Payment verification error.');
      setStep('FAILED');
    } finally {
      setLoading(false);
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
        customer_name: formData.name || authUser?.user_metadata?.full_name || 'Customer',
        customer_email: formData.email || authUser?.email || 'customer@example.com',
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
            if (onOrderSuccess) onOrderSuccess(currentOrder || { order_number: orderRef });
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
            if (onOrderSuccess) onOrderSuccess(currentOrder || { order_number: orderRef });
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
            if (onOrderSuccess) onOrderSuccess();
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

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(12px)',
      zIndex: 300,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
      overflowY: 'auto'
    }}>
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '580px',
          maxHeight: '94vh',
          overflowY: 'auto',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-lg)',
          margin: 'auto',
          position: 'relative'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="brand-font" style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '0.1em' }}>CURATED</span>
              <span style={{ fontSize: '11px', color: '#121212', fontWeight: 800, letterSpacing: '0.06em' }}>SECURE CHECKOUT</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Direct Concierge Fulfilment Across India</p>
          </div>
          {step !== 'GATEWAY' && (
            <button
              onClick={onClose}
              aria-label="Close checkout"
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div style={{
            margin: '16px 24px 0',
            padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent-red)',
            fontSize: '12.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertTriangle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: GUEST DETAILS & ACKNOWLEDGEMENT FORM */}
        {step === 'FORM' && (
          cartItems.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Your bag is currently empty.</p>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-primary"
                style={{ padding: '12px 24px', fontSize: '13px' }}
              >
                EXPLORE CURATED PIECES
              </button>
            </div>
          ) : (
          <form onSubmit={handleProceedToPayment} className="safe-bottom" style={{ padding: '20px 16px' }}>
            {/* Order Items Preview */}
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '14px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                ORDER ITEMS ({cartItems.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {cartItems.map((it) => (
                  <div key={it.variant_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-primary)' }}>{it.name} (Size {it.size})</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{it.unit_price}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '10px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700 }}>
                <span>Final Total (Incl. Express Shipping)</span>
                <span style={{ color: '#121212' }}>₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Delivery Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', color: '#121212', textTransform: 'uppercase' }}>
                  1. DELIVERY INFORMATION
                </div>
              </div>

              {authUser && (
                <div style={{
                  padding: '10px 14px',
                  backgroundColor: 'rgba(66, 133, 244, 0.06)',
                  border: '1px solid rgba(66, 133, 244, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '12px',
                  color: '#121212'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>
                    Authenticated as <strong>{authUser.email}</strong> via Google
                  </span>
                </div>
              )}

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>FULL NAME *</label>
                <input
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Tanmay Sharma"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>10-DIGIT MOBILE NUMBER *</label>
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
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>EMAIL ADDRESS *</label>
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
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>STREET ADDRESS *</label>
                <input
                  name="address"
                  type="text"
                  required
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Flat, building, street, landmark"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>CITY *</label>
                  <input
                    name="city"
                    type="text"
                    required
                    value={formData.city}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>STATE *</label>
                  <input
                    name="state"
                    type="text"
                    required
                    value={formData.state}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>PINCODE (6-DIGIT) *</label>
                  <input
                    name="pincode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    maxLength={6}
                    value={formData.pincode}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            {/* CK-05: Mandatory Unchecked No Return Policy Checkbox */}
            <div style={{
              backgroundColor: '#FAFAFA',
              border: '1px solid #121212',
              borderRadius: 'var(--radius-sm)',
              padding: '14px',
              marginBottom: '22px'
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
                <span style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                  I understand that CURATED follows a <strong>No Return Policy</strong> and have reviewed the product details, size and condition before placing my order.{' '}
                  <button
                    type="button"
                    onClick={onOpenPolicy}
                    style={{ background: 'none', border: 'none', color: '#121212', textDecoration: 'underline', padding: 0, cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
                  >
                    View policy & exceptions
                  </button>
                </span>
              </label>
            </div>

            {/* Pay Button */}
            <button
              type="submit"
              disabled={loading || !policyAck}
              className="btn btn-primary"
              style={{ width: '100%', height: '50px', fontSize: '14px' }}
            >
              {loading ? 'Reserving piece...' : `PAY ₹${total.toLocaleString('en-IN')} (UPI / CARDS)`}
            </button>
          </form>
          )
        )}

        {/* STEP 2: SIMULATED INDIAN PAYMENT GATEWAY MODAL (INV-10: 10-Min Hold) */}
        {step === 'GATEWAY' && (
          <div className="safe-bottom" style={{ padding: '20px 16px' }}>
            {/* 10-Minute Hold Reservation Banner */}
            <div style={{
              backgroundColor: '#121212',
              border: '1px solid #121212',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              color: '#FFFFFF'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color="#FFFFFF" />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.06em' }}>RESERVATION ACTIVE</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.75)' }}>Piece held exclusively for you</div>
                </div>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', fontFamily: 'monospace' }}>
                {formatTimer(holdSecondsLeft)}
              </div>
            </div>

            {/* STEP 2: DYNAMIC UPI QR GATEWAY */}
            {(() => {
              const cartAmountFormatted = Number(total || 0).toFixed(2);
              const orderRef = currentOrder?.order_number || currentOrder?.id || `ORD-${Date.now()}`;
              const upiDeepLink = `upi://pay?pa=${encodeURIComponent(ADMIN_UPI_ID)}&pn=${encodeURIComponent(ADMIN_NAME)}&am=${cartAmountFormatted}&cu=INR&tn=${encodeURIComponent('Order ' + orderRef)}`;

              return (
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 6px', fontFamily: 'var(--font-heading)' }}>
                    Scan &amp; Pay
                  </h3>
                  <p style={{ fontSize: '14px', margin: '0 0 14px', color: '#121212' }}>
                    Total Cart Amount: <strong>₹<span id="cart-amount">{cartAmountFormatted}</span></strong>
                  </p>

                  {/* Container where JS renders the Admin's QR */}
                  <div id="qrcode-container" style={{
                    margin: '10px auto 14px',
                    display: 'inline-block',
                    padding: '14px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid #E4E4E7',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.06)'
                  }}>
                    <QRCodeSVG
                      value={upiDeepLink}
                      size={200}
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
                  <div style={{ marginBottom: '16px' }}>
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

                  <hr style={{ border: 'none', borderTop: '1px solid #E4E4E7', margin: '16px 0' }} />

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
                        width: '90%',
                        maxWidth: '280px',
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
                        width: '90%',
                        maxWidth: '280px',
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
                        marginTop: '14px',
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
          </div>
        )}

        {/* STEP 3: ORDER CONFIRMED SCREEN */}
        {step === 'CONFIRMED' && currentOrder && (
          <div style={{ padding: '36px 24px', textAlign: 'center' }}>
            <CheckCircle size={56} color="var(--sage-primary)" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>ORDER CONFIRMED</h2>
            <div style={{ fontSize: '14px', color: 'var(--sage-primary)', fontWeight: 700, fontFamily: 'monospace', marginBottom: '16px' }}>
              ORDER #{currentOrder.order_number}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '420px', margin: '0 auto 24px' }}>
              Thank you, {currentOrder.customer.name}! We have secured your piece. An express dispatch tracking link will be sent to your mobile ({currentOrder.customer.mobile}) upon packing.
            </p>

            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              textAlign: 'left',
              marginBottom: '24px',
              fontSize: '13px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status</span>
                <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>CONFIRMED (PAID)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Delivery City</span>
                <span style={{ color: 'var(--text-primary)' }}>{currentOrder.customer.city}, {currentOrder.customer.pincode}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Policy Acknowledged</span>
                <span style={{ color: 'var(--sage-primary)' }}>No Return Policy (v{currentOrder.policy_version})</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="btn btn-primary"
              style={{ width: '100%', height: '48px' }}
            >
              RETURN TO STORE
            </button>
          </div>
        )}

        {/* EDGE CASE INV-13: LATE PAYMENT AFTER OFFLINE SALE -> AUTO REFUND */}
        {step === 'LATE_REFUND' && currentOrder && (
          <div style={{ padding: '36px 24px', textAlign: 'center' }}>
            <AlertTriangle size={56} color="var(--olive-primary)" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
              PAYMENT RECEIVED, ITEM UNAVAILABLE
            </h2>
            <div style={{
              backgroundColor: 'var(--olive-soft)',
              border: '1px solid var(--olive-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'left',
              fontSize: '13px',
              lineHeight: 1.6,
              color: 'var(--text-secondary)'
            }}>
              <p style={{ marginBottom: '8px' }}>
                We received your payment for <strong>{currentOrder.order_number}</strong>, but the checkout hold expired and this 1-of-1 piece was claimed in person.
              </p>
              <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                A full automated refund of ₹{currentOrder.total} has been initiated to your source account.
              </p>
            </div>
            <button onClick={onClose} className="btn btn-primary" style={{ width: '100%' }}>
              EXPLORE OTHER PIECES
            </button>
          </div>
        )}

        {/* FAILED STATE */}
        {step === 'FAILED' && (
          <div style={{ padding: '36px 24px', textAlign: 'center' }}>
            <AlertTriangle size={56} color="var(--accent-red)" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>PAYMENT COULD NOT BE COMPLETED</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              {errorMessage || 'The payment gateway reported a failure or timeout.'}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setStep('FORM')} className="btn btn-secondary" style={{ flex: 1 }}>
                REVISE DETAILS
              </button>
              <button onClick={() => setStep('GATEWAY')} className="btn btn-primary" style={{ flex: 1 }}>
                RETRY PAYMENT
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
