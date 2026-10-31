import React, { useState, useEffect } from 'react';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  Copy,
  ExternalLink,
  ShieldCheck,
  ShoppingBag,
  RefreshCw,
  MapPin,
  Calendar,
  AlertCircle
} from 'lucide-react';
import supabase from '../supabaseClient';

/**
 * Calculates approximate delivery range based on order creation date.
 * Standard Curated Express: 3 to 5 business days.
 */
function calculateEstimatedDelivery(createdAt) {
  const baseDate = createdAt ? new Date(createdAt) : new Date();
  if (isNaN(baseDate.getTime())) return { startStr: '3 business days', endStr: '5 business days' };

  // Helper to add business days (skipping Sunday)
  const addBusinessDays = (startDate, days) => {
    const result = new Date(startDate);
    let added = 0;
    while (added < days) {
      result.setDate(result.getDate() + 1);
      // Skip Sundays (0)
      if (result.getDay() !== 0) {
        added++;
      }
    }
    return result;
  };

  const minDelivery = addBusinessDays(baseDate, 3);
  const maxDelivery = addBusinessDays(baseDate, 5);

  const options = { weekday: 'short', day: 'numeric', month: 'short' };
  return {
    startStr: minDelivery.toLocaleDateString('en-IN', options),
    endStr: maxDelivery.toLocaleDateString('en-IN', options),
    fullTargetStr: `${minDelivery.toLocaleDateString('en-IN', options)} – ${maxDelivery.toLocaleDateString('en-IN', options)}`
  };
}

export default function OrdersView({
  user,
  customerEmail: initialEmail,
  highlightOrderNumber,
  onBackToShop
}) {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedUtr, setCopiedUtr] = useState(false);
  const [copiedOrderNum, setCopiedOrderNum] = useState(false);

  // Determine active customer email from props, auth session, or localStorage
  const activeEmail =
    initialEmail ||
    user?.email ||
    user?.user_metadata?.email ||
    (() => {
      try {
        return (
          localStorage.getItem('curated_customer_email') ||
          JSON.parse(localStorage.getItem('curated_last_order') || '{}')?.customer_email ||
          JSON.parse(localStorage.getItem('checkout_shipping') || '{}')?.email ||
          ''
        );
      } catch (e) {
        return '';
      }
    })();

  // Fetch orders from Supabase for this customer
  const fetchCustomerOrders = async () => {
    setLoading(true);
    try {
      let query = supabase.from('orders').select('*').order('created_at', { ascending: false });

      if (activeEmail) {
        query = query.ilike('customer_email', activeEmail.trim());
      } else {
        // Fallback: fetch most recent orders or check localStorage last order
        const lastOrder = localStorage.getItem('curated_last_order');
        if (lastOrder) {
          try {
            const parsed = JSON.parse(lastOrder);
            if (parsed.order_number) {
              query = query.eq('order_number', parsed.order_number);
            }
          } catch (e) {}
        }
      }

      const { data, error } = await query;

      if (!error && Array.isArray(data) && data.length > 0) {
        setOrders(data);
        // If a specific order is highlighted (e.g. just placed), select it
        if (highlightOrderNumber) {
          const match = data.find((o) => o.order_number === highlightOrderNumber);
          setSelectedOrder(match || data[0]);
        } else {
          setSelectedOrder(data[0]);
        }
      } else {
        // Check localStorage fallback for the order just booked offline/locally
        try {
          const localSaved = localStorage.getItem('curated_last_order');
          if (localSaved) {
            const parsed = JSON.parse(localSaved);
            setOrders([parsed]);
            setSelectedOrder(parsed);
          } else {
            setOrders([]);
          }
        } catch (e) {
          setOrders([]);
        }
      }
    } catch (err) {
      console.error('[OrdersView] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerOrders();

    // Subscribe to live Supabase changes so if Nikhil marks the piece PACKED, it updates live!
    const channel = supabase
      .channel('customer-orders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchCustomerOrders();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [activeEmail, highlightOrderNumber]);

  const handleCopyUtr = (utr) => {
    if (utr && navigator?.clipboard) {
      navigator.clipboard.writeText(utr);
      setCopiedUtr(true);
      setTimeout(() => setCopiedUtr(false), 2000);
    }
  };

  const handleCopyOrderNumber = (num) => {
    if (num && navigator?.clipboard) {
      navigator.clipboard.writeText(num);
      setCopiedOrderNum(true);
      setTimeout(() => setCopiedOrderNum(false), 2000);
    }
  };

  const currentOrder = selectedOrder || orders[0];
  const deliveryInfo = calculateEstimatedDelivery(currentOrder?.created_at);

  const getStepProgress = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'DELIVERED') return 4;
    if (s === 'SHIPPED') return 3;
    if (s === 'PACKED') return 2;
    return 1; // CONFIRMED / PENDING
  };

  const currentStep = getStepProgress(currentOrder?.status);

  return (
    <div className="container" style={{ maxWidth: '960px', padding: '32px 16px 80px', minHeight: '80vh' }}>
      
      {/* Top Navigation Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <button
          onClick={onBackToShop}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            color: '#71717A',
            cursor: 'pointer',
            padding: 0
          }}
        >
          <ArrowLeft size={16} />
          <span>RETURN TO ARCHIVES</span>
        </button>

        <button
          onClick={fetchCustomerOrders}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E4E4E7',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>REFRESH STATUS</span>
        </button>
      </div>

      {/* Main Title Section */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            backgroundColor: '#121212',
            color: '#FFFFFF',
            padding: '3px 8px',
            borderRadius: '4px'
          }}>
            AUTHENTICATED PATRON
          </span>
          {activeEmail && (
            <span style={{ fontSize: '12px', color: '#71717A' }}>
              {activeEmail}
            </span>
          )}
        </div>
        <h1 style={{
          fontSize: 'clamp(22px, 4vw, 30px)',
          fontFamily: 'var(--font-heading)',
          fontWeight: 900,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          margin: 0,
          color: '#121212'
        }}>
          MY ORDERS &amp; DELIVERY STATUS
        </h1>
        <p style={{ fontSize: '13.5px', color: '#71717A', marginTop: '6px', marginBottom: 0 }}>
          Real-time fulfillment tracking, verified UPI settlement, and approximate dispatch dates for your 1-of-1 archival pieces.
        </p>
      </div>

      {loading && orders.length === 0 ? (
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E4E4E7',
          borderRadius: '12px',
          padding: '60px 20px',
          textAlign: 'center',
          color: '#71717A'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '2px solid #D4D4D8',
            borderTopColor: '#121212',
            borderRadius: '50%',
            margin: '0 auto 14px',
            animation: 'spin 0.8s linear infinite'
          }} />
          <p style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Locating your verified orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E4E4E7',
          borderRadius: '12px',
          padding: '60px 20px',
          textAlign: 'center'
        }}>
          <ShoppingBag size={44} color="#D4D4D8" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px 0' }}>NO ORDERS LOCATED YET</h2>
          <p style={{ fontSize: '13px', color: '#71717A', maxWidth: '380px', margin: '0 auto 20px' }}>
            We couldn't find any orders under this session. Place your first 1-of-1 order through checkout to unlock real-time delivery tracking.
          </p>
          <button
            onClick={onBackToShop}
            className="btn btn-primary"
            style={{ minHeight: '44px', padding: '0 24px', fontSize: '13px', fontWeight: 800 }}
          >
            EXPLORE ARCHIVES NOW
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          
          {/* Order Selector Pills if User has Multiple Orders */}
          {orders.length > 1 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#71717A', letterSpacing: '0.06em', marginBottom: '8px' }}>
                SELECT ORDER ({orders.length} TOTAL):
              </div>
              <div style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '4px'
              }}>
                {orders.map((ord) => {
                  const isSelected = (currentOrder?.order_number || currentOrder?.id) === (ord.order_number || ord.id);
                  return (
                    <button
                      key={ord.id || ord.order_number}
                      onClick={() => setSelectedOrder(ord)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '6px',
                        border: isSelected ? '1.5px solid #121212' : '1px solid #E4E4E7',
                        backgroundColor: isSelected ? '#121212' : '#FFFFFF',
                        color: isSelected ? '#FFFFFF' : '#121212',
                        fontSize: '12px',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>#{ord.order_number}</span>
                      <span style={{
                        fontSize: '10px',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        backgroundColor: isSelected ? '#333' : '#F4F4F5',
                        color: isSelected ? '#FFF' : '#71717A'
                      }}>
                        ₹{ord.total_amount || ord.total}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* MAIN HERO ORDER CARD */}
          {currentOrder && (
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E4E4E7',
              borderRadius: '12px',
              padding: 'clamp(18px, 4vw, 28px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              boxSizing: 'border-box'
            }}>
              
              {/* Header Row: Order Number & Status Badge */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px',
                borderBottom: '1px solid #E4E4E7',
                paddingBottom: '18px',
                marginBottom: '22px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '22px',
                      fontWeight: 900,
                      letterSpacing: '0.04em',
                      margin: 0,
                      color: '#121212'
                    }}>
                      ORDER #{currentOrder.order_number}
                    </h2>
                    <button
                      onClick={() => handleCopyOrderNumber(currentOrder.order_number)}
                      title="Copy order number"
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '4px',
                        cursor: 'pointer',
                        color: '#71717A'
                      }}
                    >
                      <Copy size={15} />
                    </button>
                    {copiedOrderNum && (
                      <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 700 }}>COPIED ✓</span>
                    )}
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#71717A', marginTop: '4px' }}>
                    Booked on {new Date(currentOrder.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                {/* Status Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    backgroundColor: '#DCFCE7',
                    color: '#15803D',
                    border: '1px solid #86EFAC',
                    padding: '5px 10px',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <CheckCircle2 size={13} />
                    <span>PAID VIA RAZORPAY</span>
                  </span>

                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    backgroundColor: (currentOrder.status || '').toUpperCase() === 'PACKED' ? '#FEF08A' : '#F4F4F5',
                    color: (currentOrder.status || '').toUpperCase() === 'PACKED' ? '#854D0E' : '#3F3F46',
                    border: '1px solid #D4D4D8',
                    padding: '5px 10px',
                    borderRadius: '20px'
                  }}>
                    STATUS: {(currentOrder.status || 'PENDING').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* ESTIMATED DATE OF DELIVERY BANNER (HERO HIGHLIGHT) */}
              <div style={{
                backgroundColor: '#F8FAFC',
                border: '1.5px solid #0284C7',
                borderRadius: '8px',
                padding: '16px 20px',
                marginBottom: '26px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: '#E0F2FE',
                    color: '#0284C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Truck size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#0369A1', textTransform: 'uppercase' }}>
                      APPROXIMATE DATE OF DELIVERY
                    </div>
                    <div style={{ fontSize: '17px', fontWeight: 900, color: '#0F172A', marginTop: '2px' }}>
                      {deliveryInfo.fullTargetStr}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                      Express BlueDart / Delhivery Air Cargo (Estimated 3–5 Business Days)
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: '6px 12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #BAE6FD',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  color: '#0369A1'
                }}>
                  DOORSTEP DISPATCH ACTIVE
                </div>
              </div>

              {/* FULFILLMENT VISUAL TIMELINE STEPPER */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.06em', color: '#121212', marginBottom: '14px' }}>
                  FULFILLMENT PROGRESS
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px'
                }}>
                  {[
                    { step: 1, title: '1. Order Confirmed', desc: 'UPI Verified & Secured', completed: currentStep >= 1 },
                    { step: 2, title: '2. Quality Check & Pack', desc: currentStep >= 2 ? 'Packed & Ready ✓' : 'Inspection underway', completed: currentStep >= 2 },
                    { step: 3, title: '3. Handover to Courier', desc: currentStep >= 3 ? 'In Express Transit' : 'Scheduled dispatch', completed: currentStep >= 3 },
                    { step: 4, title: '4. Delivered', desc: 'Doorstep Handover', completed: currentStep >= 4 }
                  ].map((s) => (
                    <div
                      key={s.step}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        backgroundColor: s.completed ? '#F0FDF4' : '#F4F4F5',
                        border: s.completed ? '1px solid #86EFAC' : '1px solid #E4E4E7',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px'
                      }}
                    >
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: s.completed ? '#16A34A' : '#D4D4D8',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 800,
                        flexShrink: 0
                      }}>
                        {s.completed ? '✓' : s.step}
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: s.completed ? '#15803D' : '#52525B' }}>
                          {s.title}
                        </div>
                        <div style={{ fontSize: '11px', color: '#71717A', marginTop: '2px' }}>
                          {s.desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* PIECE BREAKDOWN & INVOICE */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '24px',
                borderTop: '1px solid #E4E4E7',
                paddingTop: '24px'
              }}>
                
                {/* Left Column: Items In Order */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.06em', color: '#121212', marginBottom: '12px' }}>
                    RESERVED 1-OF-1 PIECES
                  </div>

                  {Array.isArray(currentOrder.items) && currentOrder.items.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {currentOrder.items.map((item, idx) => (
                        <div
                          key={item.product_id || idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px',
                            backgroundColor: '#FAFAFA',
                            borderRadius: '8px',
                            border: '1px solid #E4E4E7'
                          }}
                        >
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              style={{ width: '48px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                            />
                          ) : (
                            <div style={{
                              width: '48px',
                              height: '60px',
                              backgroundColor: '#E4E4E7',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <Package size={20} color="#71717A" />
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#121212', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#71717A', marginTop: '2px' }}>
                              Size: {item.size || 'One Size'} • Qty: {item.quantity || 1}
                            </div>
                            <div style={{ fontSize: '12.5px', fontWeight: 900, color: '#121212', marginTop: '2px' }}>
                              ₹{item.price || item.unit_price || 0}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#71717A' }}>Curated Archival Piece</div>
                  )}

                  {/* Payment Details Pill */}
                  <div style={{
                    marginTop: '16px',
                    padding: '12px 14px',
                    backgroundColor: '#FAFAFA',
                    borderRadius: '8px',
                    border: '1px solid #E4E4E7'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                      <span style={{ color: '#71717A' }}>Payment Method:</span>
                      <strong style={{ color: '#121212' }}>Razorpay (Secure)</strong>
                    </div>
                    {(currentOrder.shipping_address?.razorpay_payment_id || currentOrder.gateway_id || currentOrder.shipping_address?.gateway_payment_id || currentOrder.shipping_address?.utr) && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '6px' }}>
                        <span style={{ color: '#71717A' }}>Payment ID / Ref:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                            {currentOrder.shipping_address?.razorpay_payment_id || currentOrder.gateway_id || currentOrder.shipping_address?.gateway_payment_id || currentOrder.shipping_address?.utr}
                          </span>
                          <button
                            onClick={() => handleCopyUtr(currentOrder.shipping_address?.razorpay_payment_id || currentOrder.gateway_id || currentOrder.shipping_address?.gateway_payment_id || currentOrder.shipping_address?.utr)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#71717A' }}
                          >
                            <Copy size={13} />
                          </button>
                          {copiedUtr && <span style={{ fontSize: '10px', color: '#16A34A', fontWeight: 700 }}>✓</span>}
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 900, borderTop: '1px solid #E4E4E7', paddingTop: '6px', marginTop: '6px' }}>
                      <span>Total Paid:</span>
                      <span>₹{currentOrder.total_amount || currentOrder.total}</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Shipping Destination */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.06em', color: '#121212', marginBottom: '12px' }}>
                    SHIPPING DESTINATION
                  </div>

                  <div style={{
                    backgroundColor: '#FAFAFA',
                    border: '1px solid #E4E4E7',
                    borderRadius: '8px',
                    padding: '14px',
                    fontSize: '12.5px',
                    lineHeight: '1.6'
                  }}>
                    <div style={{ fontWeight: 800, color: '#121212', fontSize: '14px', marginBottom: '4px' }}>
                      {currentOrder.customer_name || currentOrder.shipping_address?.name || 'Customer'}
                    </div>
                    <div style={{ color: '#52525B' }}>
                      {currentOrder.shipping_address?.address || 'Standard Address'}
                    </div>
                    <div style={{ color: '#52525B' }}>
                      {[currentOrder.shipping_address?.city, currentOrder.shipping_address?.state, currentOrder.shipping_address?.pincode].filter(Boolean).join(', ')}
                    </div>
                    {currentOrder.shipping_address?.mobile && (
                      <div style={{ marginTop: '8px', fontWeight: 700, color: '#121212' }}>
                        Mobile: +91 {currentOrder.shipping_address.mobile}
                      </div>
                    )}
                    <div style={{ color: '#71717A', fontSize: '11.5px', marginTop: '2px' }}>
                      Email: {currentOrder.customer_email || currentOrder.shipping_address?.email}
                    </div>
                  </div>

                  {/* Help Card */}
                  <div style={{
                    marginTop: '16px',
                    padding: '14px',
                    borderRadius: '8px',
                    backgroundColor: '#F4F4F5',
                    fontSize: '12px',
                    color: '#52525B'
                  }}>
                    <div style={{ fontWeight: 800, color: '#121212', marginBottom: '4px' }}>
                      NEED ASSISTANCE WITH THIS ORDER?
                    </div>
                    <p style={{ margin: 0 }}>
                      Reach out to our concierge at{' '}
                      <a href="mailto:hello.curatedindia@gmail.com" style={{ color: '#121212', fontWeight: 700, textDecoration: 'underline' }}>
                        hello.curatedindia@gmail.com
                      </a>
                    </p>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
