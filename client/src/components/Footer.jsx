import React from 'react';
import { ShieldAlert, ArrowRight } from 'lucide-react';

const InstagramIcon = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="4" ry="4"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

export default function Footer({ setCurrentView, setCategoryFilter, settings, onOpenPolicy }) {
  const navTo = (view, cat = '') => {
    if (cat) setCategoryFilter(cat);
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer style={{
      backgroundColor: '#121212',
      borderTop: '1px solid #27272A',
      padding: '64px 0 36px',
      marginTop: '80px',
      color: '#A1A1AA'
    }}>
      <div className="container">
        {/* Curated Editorial Footer Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '40px',
          marginBottom: '48px'
        }}>
          {/* Col 1: HIGHLIGHTED NO REFUND • NO RETURN POLICY CARD */}
          <div style={{
            backgroundColor: '#18181B',
            border: '1px solid #3F3F46',
            borderRadius: '0px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#FFFFFF',
                color: '#121212',
                fontSize: '10px',
                fontFamily: 'var(--font-subheading)',
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                padding: '3px 8px',
                marginBottom: '12px'
              }}>
                <ShieldAlert size={12} color="#121212" />
                <span>POLICY NOTICE</span>
              </div>

              <h4 style={{
                fontSize: '14px',
                fontFamily: 'var(--font-heading)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#FFFFFF',
                marginBottom: '10px',
                fontWeight: 800,
                lineHeight: 1.3
              }}>
                NO REFUND • NO RETURN POLICY
              </h4>

              <p style={{
                fontSize: '12.5px',
                lineHeight: 1.6,
                color: '#D4D4D8',
                marginBottom: '12px'
              }}>
                All pieces on CURATED are genuine 1-of-1 archival &amp; curated garments. Due to the exclusive one-of-one nature of our inventory, <strong>all sales are strictly final</strong>.
              </p>

              <div style={{
                borderTop: '1px solid #27272A',
                paddingTop: '10px',
                fontSize: '11.5px',
                color: '#A1A1AA',
                lineHeight: 1.5
              }}>
                Damaged transit exceptions are reviewed strictly within <strong>48 hours of delivery</strong> with unboxing proof.
              </div>
            </div>

            {onOpenPolicy && (
              <button
                onClick={onOpenPolicy}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FFFFFF',
                  padding: 0,
                  marginTop: '16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  fontFamily: 'var(--font-btn)',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  textDecoration: 'underline'
                }}
              >
                <span>Read Full Policy</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>

          {/* Col 2: Information & Customer Care */}
          <div>
            <h4 style={{
              fontSize: '13px',
              fontFamily: 'var(--font-heading)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#FFFFFF',
              marginBottom: '14px',
              fontWeight: 800
            }}>
              INFORMATION
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <button
                onClick={() => navTo('about')}
                style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', color: '#A1A1AA', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#A1A1AA'; }}
              >
                About CURATED
              </button>
              <button
                onClick={() => navTo('shop')}
                style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', color: '#A1A1AA', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#A1A1AA'; }}
              >
                Shop All Pieces
              </button>
              <button
                onClick={() => navTo('new-drops')}
                style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', color: '#A1A1AA', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#A1A1AA'; }}
              >
                New Drops
              </button>
              <button
                onClick={() => navTo('track-order')}
                style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', color: '#A1A1AA', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#A1A1AA'; }}
              >
                Track Order
              </button>
              <button
                onClick={() => navTo('contact')}
                style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', color: '#A1A1AA', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#A1A1AA'; }}
              >
                Contact &amp; Concierge
              </button>
              <a href="mailto:hello.curatedindia@gmail.com" style={{ color: '#FFFFFF', textDecoration: 'none', fontSize: '12px' }}>
                hello.curatedindia@gmail.com
              </a>
              <span style={{ color: '#71717A', fontSize: '12px' }}>
                Prepaid Express Shipping Across India
              </span>
            </div>
          </div>

          {/* Col 3: Brand Identity & Social */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <span style={{
                fontSize: '20px',
                fontWeight: 800,
                letterSpacing: '0.14em',
                color: '#FFFFFF',
                fontFamily: 'var(--font-heading)',
                textTransform: 'uppercase'
              }}>
                CURATED
              </span>
            </div>
            <p style={{
              fontSize: '10.5px',
              fontFamily: 'var(--font-subheading)',
              color: '#E4E4E7',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '10px'
            }}>
              SEARCHED • FILTERED • QUALITY CHECKED • HANDPICKED
            </p>
            <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#A1A1AA', marginBottom: '18px' }}>
              We search everywhere so our customers don't have to. Real garments, transparent condition grading, and honest 1-of-1 curation.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '0px',
                  backgroundColor: '#1C1C1E',
                  border: '1px solid #2E2E32',
                  color: '#FFFFFF',
                  fontSize: '11.5px',
                  fontFamily: 'var(--font-btn)',
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                <InstagramIcon size={14} color="#FFFFFF" />
                <span>Instagram</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Supporting Copyright Bar */}
        <div style={{
          borderTop: '1px solid #27272A',
          paddingTop: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '12px',
          color: '#71717A'
        }}>
          <div>
            &copy; {new Date().getFullYear()} CURATED. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
            <span>UPI / Cards / Net Banking</span>
            <span>•</span>
            <span>10-Minute Hold Lock</span>
            <span>•</span>
            <span style={{ color: '#FFFFFF', fontWeight: 600 }}>Strict No Return / No Refund</span>
            <span>•</span>
            <span>Zero Overselling</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
