import React from 'react';
import { X, ShieldAlert, Truck, FileText, CheckCircle, HelpCircle } from 'lucide-react';

export default function PolicyModal({ type, onClose, settings }) {
  if (!type) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(32, 49, 36, 0.65)',
      backdropFilter: 'blur(10px)',
      zIndex: 350,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      overflowY: 'auto'
    }}>
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: 'var(--radius-md)',
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border-active)',
          padding: '28px',
          boxShadow: 'var(--shadow-lg)',
          position: 'relative'
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close modal"
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            borderRadius: 'var(--radius-full)',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        {/* NO RETURN POLICY */}
        {(type === 'no-return' || type === 'policy-no-return') && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', color: 'var(--sage-primary)' }}>
              <ShieldAlert size={24} />
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>NO RETURN POLICY & EXCEPTIONS</h2>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Policy Version 1.1 • Effective Date: October 2026
            </div>

            <div style={{ fontSize: '13.5px', lineHeight: 1.7, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p>
                CURATED operates on rare, one-of-one and strictly limited archival garments. Due to the unique nature of our stock pool, <strong>we do not accept customer-initiated returns or size exchanges</strong> based on subjective preference, change of mind, or fit mismatches.
              </p>
              <p>
                Every listing displays true physical measurements (chest, length, shoulder, sleeve) and comprehensive condition grading so customers can make an informed, confident purchase before paying.
              </p>

              <div style={{ backgroundColor: 'var(--bg-surface)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Governed Exception Categories
                </h3>
                <p style={{ marginBottom: '8px' }}>We take complete responsibility for genuine fulfilment errors:</p>
                <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li><strong>Wrong Product Shipped:</strong> The garment received differs entirely from your order.</li>
                  <li><strong>Materially Incorrect Product:</strong> Significant discrepancy from listed photos or specifications.</li>
                  <li><strong>Undisclosed Major Defect:</strong> A structural tear, missing critical fastener, or major flaw that was omitted in listing notes.</li>
                  <li><strong>In-Transit Damage:</strong> Severe packaging destruction attributable to courier transit.</li>
                </ul>
              </div>

              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  48-Hour Claim Window
                </h3>
                <p>
                  Exceptions must be reported within <strong>48 hours of recorded delivery</strong> by emailing hello.curatedindia@gmail.com or submitting the Contact Form with your order number, clear photographs, and an unboxing video.
                </p>
              </div>

              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Resolution & Quarantine
                </h3>
                <p>
                  Upon approval, CURATED provides a full gateway refund or an identical replacement if one exists. Any returned physical unit undergoes mandatory quarantine and manual re-inspection before it can ever be deemed sellable again.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SHIPPING POLICY */}
        {(type === 'shipping' || type === 'policy-shipping') && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', color: 'var(--sage-primary)' }}>
              <Truck size={24} />
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>SHIPPING & FULFILMENT POLICY</h2>
            </div>
            <div style={{ fontSize: '13.5px', lineHeight: 1.7, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p>
                CURATED ships domestic orders across serviceable Indian pincodes via leading express courier partners (BlueDart, Delhivery, Smartr).
              </p>
              <div style={{ backgroundColor: 'var(--bg-surface)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <li><strong>Dispatch Timeline:</strong> Orders are verified, packed in custom packaging, and dispatched within 24 to 48 business hours.</li>
                  <li><strong>Standard Shipping Fee:</strong> Flat ₹{settings?.shipping_flat_rate || 99} across India.</li>
                  <li><strong>Complimentary Shipping:</strong> Free express shipping automatically unlocks on orders of ₹{settings?.shipping_free_threshold || 1499} and above.</li>
                  <li><strong>Tracking:</strong> Live courier AWB tracking links are sent via email and can be tracked anytime on our <span style={{ color: 'var(--sage-primary)' }}>Track Order</span> page.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TERMS & PRIVACY */}
        {(type === 'terms' || type === 'policy-terms') && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', color: 'var(--sage-primary)' }}>
              <FileText size={24} />
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>TERMS AND CONDITIONS</h2>
            </div>
            <div style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p>CURATED is the sole merchant of record for all products sold on this platform.</p>
              <p>All prices are listed in Indian National Rupees (₹) and are inclusive of applicable taxes.</p>
              <p>We reserve the right to cancel and refund any order in the event of an unforeseen inventory discrepancy or pricing error.</p>
            </div>
          </div>
        )}

        {(type === 'privacy' || type === 'policy-privacy') && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', color: 'var(--sage-primary)' }}>
              <FileText size={24} />
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>PRIVACY POLICY</h2>
            </div>
            <div style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p>We respect your privacy. Customer delivery details (name, phone, address) are collected solely to fulfill orders and communicate shipping updates.</p>
              <p>CURATED does not sell customer personal data to third parties. Raw card numbers, CVVs, and UPI PINs are processed via tokenized gateway infrastructure and never touch our servers.</p>
            </div>
          </div>
        )}

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', textAlign: 'right' }}>
          <button onClick={onClose} className="btn btn-primary">
            I UNDERSTAND
          </button>
        </div>
      </div>
    </div>
  );
}
