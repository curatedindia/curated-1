import React from 'react';
import { Eye } from 'lucide-react';

export default function ProductCard({ product, onSelectProduct }) {
  const isSoldOut = product.status === 'SOLD_OUT' || product.total_on_hand <= 0;
  const isHeld = !isSoldOut && product.total_available === 0 && product.total_reserved > 0;

  const primaryVariant = product.variants && product.variants[0];
  const sizeLabel = primaryVariant ? `Size ${primaryVariant.size}` : '';

  const sellingPrice = parseFloat(product.selling_price) || 0;
  const originalPrice = parseFloat(product.original_price) || 0;
  const hasDiscount = originalPrice > sellingPrice;

  const displayImage = (Array.isArray(product.images) && product.images[0]) || product.image_url || product.image || '';
  const displayTitle = product.title || product.name || 'Untitled Piece';

  return (
    <div
      onClick={() => onSelectProduct(product)}
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = 'var(--text-primary)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* 4:5 Aspect Ratio Image Container */}
      <div style={{
        position: 'relative',
        width: '100%',
        paddingTop: '125%', // 4:5 ratio
        backgroundColor: 'var(--bg-secondary)',
        overflow: 'hidden'
      }}>
        <img
          src={displayImage}
          alt={displayTitle}
          loading="lazy"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.35s ease',
            filter: isSoldOut ? 'grayscale(60%) opacity(0.8)' : 'none'
          }}
          onMouseEnter={(e) => {
            if (!isSoldOut) e.currentTarget.style.transform = 'scale(1.03)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        />

        {/* Top Badges (Future Saints Style) */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          right: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          pointerEvents: 'none'
        }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {hasDiscount && !isSoldOut && (
              <span style={{
                backgroundColor: '#121212',
                color: '#FFFFFF',
                fontSize: '10px',
                fontFamily: 'var(--font-subheading)',
                fontWeight: 700,
                letterSpacing: '0.08em',
                padding: '3px 7px',
                borderRadius: 'var(--radius-sm)',
                textTransform: 'uppercase'
              }}>
                SALE
              </span>
            )}
            {product.is_new_drop && !isSoldOut && !hasDiscount && (
              <span style={{
                backgroundColor: '#FFFFFF',
                color: '#121212',
                border: '1px solid #121212',
                fontSize: '10px',
                fontFamily: 'var(--font-subheading)',
                fontWeight: 700,
                letterSpacing: '0.08em',
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                textTransform: 'uppercase'
              }}>
                NEW
              </span>
            )}
          </div>

          <div>
            {isSoldOut ? (
              <span style={{
                backgroundColor: '#121212',
                color: '#FFFFFF',
                fontSize: '10px',
                fontFamily: 'var(--font-subheading)',
                fontWeight: 700,
                letterSpacing: '0.08em',
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                textTransform: 'uppercase'
              }}>
                SOLD OUT
              </span>
            ) : isHeld ? (
              <span style={{
                backgroundColor: '#121212',
                color: '#FFFFFF',
                border: '1px solid #27272A',
                fontSize: '10px',
                fontFamily: 'var(--font-subheading)',
                fontWeight: 700,
                letterSpacing: '0.06em',
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                textTransform: 'uppercase'
              }}>
                ON HOLD
              </span>
            ) : null}
          </div>
        </div>

        {/* Quick View Floating Pill on hover (Desktop only) */}
        {!isSoldOut && (
          <div
            className="desktop-only"
            style={{
              position: 'absolute',
              bottom: '10px',
              left: '10px',
              right: '10px',
              padding: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.94)',
              backdropFilter: 'blur(4px)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '11px',
              fontFamily: 'var(--font-btn)',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              textAlign: 'center',
              borderRadius: 'var(--radius-sm)',
              opacity: 0.95,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Eye size={13} />
            <span>VIEW PIECE</span>
          </div>
        )}
      </div>

      {/* Product Details Section (Mobile Optimized 2-Col Layout) */}
      <div style={{ padding: '12px 10px 14px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
          <h3 style={{
            fontSize: 'clamp(12.5px, 3.4vw, 14px)',
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            textTransform: 'none',
            letterSpacing: '0.01em',
            color: 'var(--text-primary)',
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '34px'
          }}>
            {displayTitle}
          </h3>
        </div>

        {/* Condition Grade and Size */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '10.5px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 500 }}>{product.condition || 'New / Unused'}</span>
          {sizeLabel && (
            <>
              <span>•</span>
              <span style={{ fontWeight: 600 }}>{sizeLabel}</span>
            </>
          )}
        </div>

        {/* Pricing (Future Saints Rs. Format) */}
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 'clamp(13.5px, 3.6vw, 15px)',
            fontWeight: 700,
            fontFamily: 'var(--font-body)',
            color: 'var(--text-primary)'
          }}>
            Rs. {sellingPrice.toLocaleString('en-IN')}
          </span>
          {hasDiscount && (
            <span style={{
              fontSize: '11.5px',
              color: 'var(--text-muted)',
              textDecoration: 'line-through'
            }}>
              Rs. {originalPrice.toLocaleString('en-IN')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
