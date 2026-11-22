import React from 'react';
import {
  ShieldCheck,
  CreditCard,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  RefreshCw
} from 'lucide-react';
import { useCheckoutAuth } from '../hooks/useCheckoutAuth';
import { useRazorpayCheckout } from '../hooks/useRazorpayCheckout';

export default function CheckoutPage({ onBackToShop, onOrderPlaced, settings, cartItems: passedCartItems }) {
  const {
    user,
    profile,
    cartItems,
    loading: authLoading,
    clearCart
  } = useCheckoutAuth(passedCartItems);

  const {
    step,
    setStep,
    formData,
    handleInputChange,
    policyAck,
    setPolicyAck,
    submitting,
    errorMessage,
    currentOrder,
    holdSecondsLeft,
    paymentStatusMsg,
    subtotal,
    shippingFee,
    total,
    handleProceedToPayment,
    triggerRazorpayCheckout,
    formatTimer
  } = useRazorpayCheckout({
    cartItems,
    settings,
    authUser: user,
    profile,
    clearCart,
    onOrderSuccess: onOrderPlaced
  });

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
        </div>

        {/* Google Authentication Status Banner */}
        {profile?.email && (
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
            
            {/* Column 1: Preserved Cart Items */}
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
                  <span>Delivery Charge</span>
                  <span style={{ color: shippingFee === 0 ? '#2E7D32' : '#121212', fontWeight: 700 }}>
                    {shippingFee === 0 ? 'FREE' : `₹${shippingFee}`}
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

              {/* Secure Payment Badges */}
              <div style={{
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                color: '#71717A',
                fontSize: '11px',
                fontWeight: 600
              }}>
                <CreditCard size={15} />
                <span>UPI • Cards • NetBanking • Wallets</span>
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
                  <span>{submitting ? 'INITIALIZING RAZORPAY...' : `PROCEED TO PAYMENT (₹${total.toLocaleString('en-IN')})`}</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* STEP 2: RAZORPAY PAYMENT GATEWAY (10-Minute Atomic Hold) */}
        {step === 'GATEWAY' && (() => {
          const cartAmountFormatted = Number(total || 0).toFixed(2);
          const orderRef = currentOrder?.order_number || currentOrder?.id || 'ORD-ACTIVE';

          return (
            <div className="checkout-card" style={{
              maxWidth: '520px',
              margin: '0 auto',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '32px 24px',
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
                marginBottom: '22px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={15} color="#FFFFFF" />
                  <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em' }}>ATOMIC HOLD ACTIVE</span>
                </div>
                <div style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'monospace' }}>
                  {formatTimer(holdSecondsLeft)}
                </div>
              </div>

              {/* Header */}
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: '#F4F4F5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px'
              }}>
                <CreditCard size={26} color="#121212" />
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 6px', fontFamily: 'var(--font-heading)' }}>
                Complete Your Payment
              </h3>
              <p style={{ fontSize: '13px', color: '#71717A', margin: '0 0 20px' }}>
                Order #{orderRef} • Locked 1-of-1 Piece
              </p>

              {/* Order Amount Card */}
              <div style={{
                backgroundColor: '#FAFAFA',
                border: '1px solid #E4E4E7',
                borderRadius: '8px',
                padding: '16px 20px',
                marginBottom: '20px',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#71717A' }}>Customer</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#121212' }}>{formData.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#71717A' }}>Deliver To</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#121212' }}>{formData.city}, {formData.pincode}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E4E4E7', paddingTop: '10px', marginTop: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#121212' }}>Total Payable Amount</span>
                  <span style={{ fontSize: '20px', fontWeight: 900, color: '#121212', fontFamily: 'var(--font-heading)' }}>
                    ₹{cartAmountFormatted}
                  </span>
                </div>
              </div>

              {/* Payment Methods Info */}
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '6px',
                marginBottom: '22px',
                fontSize: '12px',
                color: '#15803D',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <ShieldCheck size={16} />
                <span>Supports UPI (GPay/PhonePe), Credit &amp; Debit Cards, NetBanking, EMI</span>
              </div>

              {/* Pay Now Button */}
              <button
                type="button"
                onClick={() => triggerRazorpayCheckout(orderRef, total)}
                disabled={submitting}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  height: '52px',
                  fontSize: '14px',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  marginBottom: '12px',
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>LAUNCHING RAZORPAY...</span>
                  </>
                ) : (
                  <>
                    <span>PAY ₹{cartAmountFormatted} VIA RAZORPAY</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* Back to Edit Address */}
              <button
                type="button"
                onClick={() => setStep('FORM')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#71717A',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                ← Edit shipping details
              </button>

              {paymentStatusMsg.text && (
                <p
                  id="status-msg"
                  style={{
                    fontWeight: 'bold',
                    marginTop: '18px',
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
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Payment Method</span>
                <span style={{ fontWeight: 700, color: '#16A34A' }}>Razorpay (Verified ✓)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Paid</span>
                <span style={{ fontWeight: 800 }}>₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              onClick={() => (onOrderPlaced ? onOrderPlaced(currentOrder) : (window.location.href = '/'))}
              className="btn btn-primary"
              style={{ width: '100%', height: '50px', fontSize: '13.5px', fontWeight: 800, marginBottom: '10px' }}
            >
              VIEW ORDER &amp; ESTIMATED DELIVERY DATE →
            </button>

            <button
              onClick={onBackToShop || (() => (window.location.href = '/'))}
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
              CONTINUE EXPLORING ARCHIVES
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
