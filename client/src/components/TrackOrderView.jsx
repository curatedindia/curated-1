import React, { useState } from 'react';
import { Search, Package, Truck, CheckCircle2, Clock, AlertTriangle, ExternalLink } from 'lucide-react';

export default function TrackOrderView() {
  const [orderNumber, setOrderNumber] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderData, setOrderData] = useState(null);

  const handleTrack = async (e) => {
    e.preventDefault();
    setError('');
    setOrderData(null);
    setLoading(true);

    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_number: orderNumber, mobile })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || 'No matching order found.');
      } else {
        setOrderData(data.order);
      }
    } catch (err) {
      setError('Unable to reach server to lookup order.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { key: 'CONFIRMED', label: 'Order Confirmed' },
    { key: 'PROCESSING', label: 'Quality Verification & Packing' },
    { key: 'SHIPPED', label: 'Express Handover to Courier' },
    { key: 'DELIVERED', label: 'Delivered' }
  ];

  const getStepIndex = (status) => {
    if (status === 'CONFIRMED') return 0;
    if (status === 'PROCESSING' || status === 'PACKED') return 1;
    if (status === 'SHIPPED') return 2;
    if (status === 'DELIVERED') return 3;
    return 0;
  };

  const currentStepIdx = orderData ? getStepIndex(orderData.order_status) : 0;

  return (
    <div className="container" style={{ maxWidth: '720px', padding: '60px 16px', minHeight: '70vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>TRACK YOUR SHIPMENT</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Enter your CURATED order number and 10-digit mobile number to view real-time fulfillment status.
        </p>
      </div>

      {/* Lookup Form */}
      <form
        onSubmit={handleTrack}
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '24px',
          marginBottom: '32px'
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '18px' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>
              ORDER NUMBER *
            </label>
            <input
              type="text"
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g. CUR-1000"
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>
              10-DIGIT MOBILE NUMBER *
            </label>
            <input
              type="tel"
              required
              maxLength={10}
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="e.g. 9820012345"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
          style={{ width: '100%', height: '46px' }}
        >
          {loading ? 'Locating order...' : 'CHECK STATUS'}
        </button>
      </form>

      {/* Error state */}
      {error && (
        <div style={{
          padding: '16px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--accent-red)',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '24px'
        }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Results Card */}
      {orderData && (
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-active)',
          borderRadius: 'var(--radius-sm)',
          padding: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--sage-light)', fontWeight: 700 }}>ORDER LOCATED</div>
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>#{orderData.order_number}</h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="subtle-badge badge-new" style={{ fontSize: '12px' }}>
                {orderData.order_status}
              </span>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Placed: {new Date(orderData.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Stepper */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {steps.map((st, i) => {
                const isDone = i <= currentStepIdx;
                const isCurrent = i === currentStepIdx;
                return (
                  <div key={st.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: isDone ? 'var(--sage-primary)' : 'var(--bg-tertiary)',
                      color: isDone ? '#FFFFFF' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontWeight: 700,
                      fontSize: '12px'
                    }}>
                      {isDone ? <CheckCircle2 size={16} /> : i + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: isCurrent ? 700 : 500, color: isDone ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {st.label}
                      </div>
                      {isCurrent && (
                        <div style={{ fontSize: '12px', color: 'var(--sage-light)', marginTop: '2px' }}>
                          Active fulfillment stage
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Courier & Tracking Details (SHP-04) */}
          {orderData.courier && (
            <div style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--sage-light)', fontWeight: 700, fontSize: '12px' }}>
                <Truck size={16} />
                <span>EXPRESS COURIER DISPATCH</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                Courier: <strong>{orderData.courier}</strong>
              </div>
              {orderData.tracking_number && (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  AWB Tracking Number: <code style={{ color: 'var(--olive-light)' }}>{orderData.tracking_number}</code>
                </div>
              )}
              {orderData.tracking_url && (
                <a
                  href={orderData.tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: 'var(--sage-light)',
                    fontSize: '12px',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    marginTop: '8px'
                  }}
                >
                  <span>Track directly on courier portal</span>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          )}

          {/* Items Summary */}
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
              ITEMS IN SHIPMENT
            </div>
            {orderData.items?.map((it, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span>{it.name} (Size {it.size})</span>
                <span style={{ fontWeight: 600 }}>₹{it.unit_price}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
