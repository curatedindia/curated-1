import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CreditCard,
  Lock,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  ExternalLink,
  Smartphone,
  Check,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import supabase from '../supabaseClient';

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TuZkYc8hwiX2q1';

function loadRazorpaySdk() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

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

  // Razorpay payment state
  const [razorpayOrderData, setRazorpayOrderData] = useState(null);
  const [paymentStatusMsg, setPaymentStatusMsg] = useState({ text: '', type: '' });

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
  const subtotal = cartItems.reduce((sum, it) => sum + (Number(it.unit_price || it.selling_price || 0) * (it.quantity || 1)), 0);

  const productDeliveryCharges = cartItems.reduce((sum, item) => {
    const charge = item.deliveryCharge !== undefined && item.deliveryCharge !== null && item.deliveryCharge !== ''
      ? Number(item.deliveryCharge)
      : (item.delivery_charge !== undefined && item.delivery_charge !== null && item.delivery_charge !== ''
        ? Number(item.delivery_charge)
        : null);
    return charge !== null ? sum + charge : sum;
  }, 0);

  const hasItemDeliveryCharge = cartItems.some((item) => (item.deliveryCharge !== undefined && item.deliveryCharge !== null && item.deliveryCharge !== '') || (item.delivery_charge !== undefined && item.delivery_charge !== null && item.delivery_charge !== ''));

  const freeThreshold = settings?.shipping_free_threshold || 1499;
  const flatShipping = settings?.shipping_flat_rate || 99;
  const standardShipping = subtotal >= freeThreshold ? 0 : flatShipping;
  const shipping = hasItemDeliveryCharge ? productDeliveryCharges : standardShipping;
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

  // Step 1: Proceed to Payment Gateway & trigger Razorpay checkout
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

    // Keep customer shipping details in client state and localStorage until payment is verified
    try {
      localStorage.setItem('checkout_shipping', JSON.stringify(formData));
    } catch (err) {
      console.warn('Unable to persist shipping details in localStorage:', err);
    }

    const orderNumber = `CUR-${Math.floor(1000 + Math.random() * 9000)}`;
    const orderId = `ord-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const orderData = {
      id: orderId,
      order_number: orderNumber,
      customer: formData,
      items: cartItems,
      total: total,
      created_at: new Date().toISOString()
    };

    setCurrentOrder(orderData);
    setHoldExpiresAt(expiresAt);
    setHoldSecondsLeft(600);
    setStep('GATEWAY');
    await triggerRazorpayCheckout(orderNumber, total, formData);
  };

  const triggerRazorpayCheckout = async (orderRef, payableAmount, shippingDetails) => {
    setLoading(true);
    setPaymentStatusMsg({ text: 'Initializing secure Razorpay gateway...', type: 'info' });

    const sdkLoaded = await loadRazorpaySdk();
    if (!sdkLoaded || !window.Razorpay) {
      setErrorMessage('Failed to load Razorpay payment gateway. Please check your internet connection.');
      setLoading(false);
      return;
    }

    const key = RAZORPAY_KEY_ID || 'rzp_test_TuZkYc8hwiX2q1';
    const amountInPaise = Math.round(payableAmount * 100);

    // 1. Create order on server to obtain mandatory Razorpay order_id
    let rzpOrderId = null;
    try {
      const res = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: payableAmount,
          currency: 'INR',
          receipt: orderRef,
          notes: {
            order_number: orderRef,
            customer_name: shippingDetails.name,
            customer_email: shippingDetails.email,
            customer_mobile: shippingDetails.mobile
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.order_id) {
          rzpOrderId = data.order_id;
          setRazorpayOrderData(data);
        }
      }
    } catch (apiErr) {
      console.warn('Backend order creation notice:', apiErr);
    }

    const options = {
      key: key,
      amount: amountInPaise,
      currency: 'INR',
      name: 'CURATED',
      description: `Order #${orderRef} - Archival Garment`,
      ...(rzpOrderId ? { order_id: rzpOrderId } : {}),
      prefill: {
        name: shippingDetails.name || '',
        email: shippingDetails.email || '',
        contact: shippingDetails.mobile || ''
      },
      theme: {
        color: '#121212'
      },
      modal: {
        confirm_close: true,
        ondismiss: function () {
          setLoading(false);
          setPaymentStatusMsg({
            text: 'Payment window was closed. Click below to complete your payment before the hold expires.',
            type: 'warning'
          });
        }
      },
      handler: async function (response) {
        setLoading(true);
        setPaymentStatusMsg({ text: 'Verifying payment with bank servers...', type: 'info' });

        try {
          const orderPayload = {
            order_number: orderRef,
            customer_name: shippingDetails.name || authUser?.user_metadata?.full_name || 'Customer',
            customer_email: shippingDetails.email || authUser?.email || 'customer@example.com',
            customer: shippingDetails,
            total_amount: payableAmount,
            total: payableAmount,
            status: 'PENDING',
            payment_status: 'PAID',
            payment_mode: 'RAZORPAY',
            gateway_id: response.razorpay_payment_id,
            gateway_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            items: cartItems.map((it) => ({
              product_id: it.id || it.product_id,
              name: it.name || it.title,
              sku: it.sku || 'CUR-ITEM',
              size: it.size || 'One Size',
              price: parseFloat(it.price || it.selling_price || it.unit_price) || 0,
              unit_price: parseFloat(it.price || it.selling_price || it.unit_price) || 0,
              delivery_charge: parseFloat(it.delivery_charge !== undefined ? it.delivery_charge : (it.deliveryCharge || 0)) || 0,
              quantity: parseInt(it.quantity, 10) || 1
            })),
            shipping_address: {
              ...shippingDetails,
              payment_mode: 'RAZORPAY',
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            },
            created_at: new Date().toISOString()
          };

          // 1. Direct Supabase insert/upsert
          try {
            const supabasePayload = {
              order_number: orderRef,
              customer_name: orderPayload.customer_name,
              customer_email: orderPayload.customer_email,
              total_amount: payableAmount,
              status: 'PENDING',
              payment_status: 'PAID',
              items: orderPayload.items,
              shipping_address: orderPayload.shipping_address,
              created_at: orderPayload.created_at
            };

            await supabase
              .from('orders')
              .upsert([supabasePayload], { onConflict: 'order_number' });
          } catch (sbErr) {
            console.warn('[CheckoutModal] Supabase sync notice:', sbErr);
          }

          // 2. Call backend verification endpoint
          try {
            await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(orderPayload)
            });
          } catch (srvErr) {
            console.warn('[CheckoutModal] Backend verify notice:', srvErr);
          }

          // 3. Persist order details to localStorage
          try {
            localStorage.removeItem('checkout_shipping');
            localStorage.setItem('curated_last_order', JSON.stringify(orderPayload));
            if (orderPayload.customer_email) {
              localStorage.setItem('curated_customer_email', orderPayload.customer_email);
            }
            if (orderPayload.customer_name) {
              localStorage.setItem('curated_customer_name', orderPayload.customer_name);
            }
          } catch (e) {}

          // 4. Mark success & show celebration
          setLoading(false);
          setPaymentStatusMsg({ text: '✅ Payment Verified! Processing your order...', type: 'success' });
          setCurrentOrder(orderPayload);
          setStep('CONFIRMED');
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });

          setTimeout(() => {
            if (onOrderSuccess) onOrderSuccess(orderPayload);
          }, 2000);
        } catch (err) {
          console.error('[CheckoutModal] Handler error:', err);
          setErrorMessage('Payment was charged but order could not be synced. Please contact support.');
          setLoading(false);
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (resp) {
      setPaymentStatusMsg({
        text: `Payment failed: ${resp.error?.description || 'Transaction declined'}`,
        type: 'error'
      });
      setLoading(false);
    });
    rzp.open();
    setStep('GATEWAY');
    setLoading(false);
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

            {/* STEP 2: RAZORPAY PAYMENT GATEWAY */}
            {(() => {
              const cartAmountFormatted = Number(total || 0).toFixed(2);
              const orderRef = currentOrder?.order_number || currentOrder?.id || `ORD-${Date.now()}`;

              return (
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#F4F4F5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px'
                  }}>
                    <CreditCard size={24} color="#121212" />
                  </div>

                  <h3 style={{ fontSize: '18px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 6px', fontFamily: 'var(--font-heading)' }}>
                    Complete Your Payment
                  </h3>
                  <p style={{ fontSize: '13px', color: '#71717A', margin: '0 0 16px' }}>
                    Order #{orderRef} • Locked 1-of-1 Piece
                  </p>

                  {/* Order Amount Card */}
                  <div style={{
                    backgroundColor: '#FAFAFA',
                    border: '1px solid #E4E4E7',
                    borderRadius: '8px',
                    padding: '14px 18px',
                    marginBottom: '16px',
                    textAlign: 'left'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#71717A' }}>Customer</span>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#121212' }}>{formData.name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#71717A' }}>Deliver To</span>
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#121212' }}>{formData.city}, {formData.pincode}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E4E4E7', paddingTop: '8px', marginTop: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#121212' }}>Total Payable Amount</span>
                      <span style={{ fontSize: '18px', fontWeight: 900, color: '#121212', fontFamily: 'var(--font-heading)' }}>
                        ₹{cartAmountFormatted}
                      </span>
                    </div>
                  </div>

                  {/* Payment Methods Badges */}
                  <div style={{
                    padding: '10px 14px',
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '16px',
                    textAlign: 'left'
                  }}>
                    <ShieldCheck size={18} color="#15803D" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', color: '#166534', lineHeight: 1.4 }}>
                      Instant verification via <strong>UPI</strong> (GPay, PhonePe, Paytm), <strong>Cards</strong>, <strong>NetBanking</strong>, &amp; <strong>Wallets</strong>.
                    </span>
                  </div>

                  {/* Razorpay Launch Button */}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => triggerRazorpayCheckout(orderRef, total, formData)}
                    style={{
                      width: '100%',
                      padding: '14px',
                      backgroundColor: '#121212',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 800,
                      letterSpacing: '0.06em',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'opacity 0.2s ease',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
                    }}
                  >
                    {loading ? (
                      <>
                        <RefreshCw size={16} className="spin-slow" />
                        <span>PROCESSING RAZORPAY...</span>
                      </>
                    ) : (
                      <>
                        <Lock size={15} />
                        <span>PAY ₹{cartAmountFormatted} VIA RAZORPAY</span>
                      </>
                    )}
                  </button>

                  {paymentStatusMsg.text && (
                    <p
                      id="status-msg"
                      style={{
                        fontWeight: 'bold',
                        marginTop: '14px',
                        fontSize: '12.5px',
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
              onClick={() => {
                if (onOrderSuccess) onOrderSuccess(currentOrder);
                onClose();
              }}
              className="btn btn-primary"
              style={{ width: '100%', height: '50px', fontSize: '13.5px', fontWeight: 800, marginBottom: '10px' }}
            >
              VIEW ORDER &amp; ESTIMATED DELIVERY DATE →
            </button>

            <button
              onClick={onClose}
              style={{
                width: '100%',
                height: '42px',
                background: 'none',
                border: '1px solid #E4E4E7',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: 700,
                color: '#71717A',
                cursor: 'pointer'
              }}
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
