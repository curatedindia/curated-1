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

export default function CheckoutModal({
  isOpen,
  onClose,
  cartItems,
  onOrderSuccess,
  onOpenPolicy,
  settings
}) {
  if (!isOpen) return null;

  const [step, setStep] = useState('FORM'); // 'FORM' | 'GATEWAY' | 'CONFIRMED' | 'FAILED' | 'LATE_REFUND'
  const [formData, setFormData] = useState({
    name: 'Tanmay Sharma',
    mobile: '9820123456',
    email: 'tanmay@example.com',
    address: '402, Sunset Boulevard, Bandra West',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400050'
  });
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

    if (formData.mobile.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setLoading(true);
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
        setErrorMessage(data.message || 'Unable to place hold on this piece.');
        setLoading(false);
        return;
      }

      setCurrentOrder(data.order);
      setHoldExpiresAt(data.expires_at);
      setHoldSecondsLeft(600);
      setStep('GATEWAY');
    } catch (err) {
      setErrorMessage('Network error initiating payment hold. Please try again.');
    } finally {
      setLoading(false);
    }
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
              <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', color: '#121212', textTransform: 'uppercase' }}>
                1. DELIVERY INFORMATION
              </div>

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
                  style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#121212', flexShrink: 0 }}
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

            {/* Payment Method Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
              {['UPI', 'CARD', 'NETBANKING'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedPaymentTab(tab)}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    padding: '12px 6px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: selectedPaymentTab === tab ? '#121212' : 'var(--text-muted)',
                    borderBottom: selectedPaymentTab === tab ? '2px solid #121212' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  {tab === 'UPI' ? 'UPI / QR' : tab === 'CARD' ? 'CARDS' : 'NETBANKING'}
                </button>
              ))}
            </div>

            {/* UPI Tab */}
            {selectedPaymentTab === 'UPI' && (
              <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
                <div style={{
                  display: 'inline-block',
                  padding: '16px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '14px'
                }}>
                  {/* Clean SVG QR code simulation in Matte Black */}
                  <svg width="140" height="140" viewBox="0 0 100 100">
                    <rect width="100" height="100" fill="#FFFFFF" />
                    <rect x="10" y="10" width="30" height="30" fill="#121212" />
                    <rect x="15" y="15" width="20" height="20" fill="#FFFFFF" />
                    <rect x="20" y="20" width="10" height="10" fill="#121212" />
                    <rect x="60" y="10" width="30" height="30" fill="#121212" />
                    <rect x="65" y="15" width="20" height="20" fill="#FFFFFF" />
                    <rect x="70" y="20" width="10" height="10" fill="#121212" />
                    <rect x="10" y="60" width="30" height="30" fill="#121212" />
                    <rect x="15" y="65" width="20" height="20" fill="#FFFFFF" />
                    <rect x="20" y="70" width="10" height="10" fill="#121212" />
                    <rect x="50" y="50" width="10" height="10" fill="#121212" />
                    <rect x="60" y="60" width="15" height="15" fill="#121212" />
                    <rect x="80" y="75" width="10" height="15" fill="#121212" />
                  </svg>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
                  Scan to Pay ₹{total.toLocaleString('en-IN')} via any UPI App
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Supports Google Pay, PhonePe, Paytm, CRED, BHIM
                </p>
              </div>
            )}

            {/* Card Tab */}
            {selectedPaymentTab === 'CARD' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>CARD NUMBER</label>
                  <input type="text" defaultValue="4242 •••• •••• 4242" disabled />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>EXPIRY</label>
                    <input type="text" defaultValue="12/28" disabled />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>CVV</label>
                    <input type="password" defaultValue="•••" disabled />
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={12} /> 256-Bit Bank Grade Tokenized Encryption
                </div>
              </div>
            )}

            {/* Test Simulation Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              <button
                onClick={() => handleConfirmPayment(false)}
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', height: '48px', fontSize: '14px' }}
              >
                {loading ? 'Confirming with Gateway...' : `AUTHORIZE PAYMENT (₹${total})`}
              </button>

              {/* Edge Case Simulation for Developer / Owner testing */}
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                  Edge Case Verification Triggers:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleConfirmPayment(true)}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--olive-light)',
                      fontSize: '11px',
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer'
                    }}
                  >
                    Test INV-13 (Late Claim)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setErrorMessage('Payment declined by issuing bank.'); setStep('FAILED'); }}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--accent-red)',
                      fontSize: '11px',
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer'
                    }}
                  >
                    Simulate Failure
                  </button>
                </div>
              </div>
            </div>
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
