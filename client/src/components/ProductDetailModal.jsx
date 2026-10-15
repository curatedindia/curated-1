import React, { useState } from 'react';
import {
  X,
  Share2,
  MessageCircle,
  ShieldCheck,
  Ruler,
  Truck,
  RotateCcw,
  Check,
  AlertTriangle,
  Clock,
  Sparkles
} from 'lucide-react';

export default function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
  onNavigateToShop,
  onNavigateToNewDrops,
  onOpenPolicy,
  settings
}) {
  if (!product) return null;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState(
    product.variants && product.variants.length > 0 ? product.variants[0].id : null
  );
  const [copiedLink, setCopiedLink] = useState(false);

  const selectedVariant = product.variants?.find((v) => v.id === selectedVariantId) || product.variants?.[0];
  const isSoldOut = product.status === 'SOLD_OUT' || product.total_on_hand <= 0;
  const isHeld = !isSoldOut && selectedVariant?.available === 0 && selectedVariant?.reserved > 0;
  const isOnlyOneLeft = !isSoldOut && !isHeld && selectedVariant?.available === 1;

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${product.name} | CURATED`,
          text: `Check out this handpicked 1-of-1 piece on CURATED: ${product.name}`,
          url
        });
      } catch (err) {
        copyToClipboard(url);
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const whatsappPrefill = `https://wa.me/${(settings?.whatsapp_number || '+919876543210').replace(/[^0-9]/g, '')}?text=Hi%20CURATED,%20I'm%20interested%20in%20${encodeURIComponent(product.name)}%20(SKU:%20${product.sku})`;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(8px)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      overflowY: 'auto'
    }}>
      <div
        className="glass-panel product-modal-dialog"
        style={{
          width: '100%',
          maxWidth: '1040px',
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: '#FFFFFF',
          position: 'relative',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-lg)',
          margin: 'auto'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close details"
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            borderRadius: 'var(--radius-full)',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 20
          }}
        >
          <X size={20} />
        </button>

        <div className="product-modal-grid">
          {/* Left Column: Image Gallery */}
          <div>
            {/* Main Stage Image */}
            <div style={{
              width: '100%',
              paddingTop: '125%', // 4:5 aspect ratio
              position: 'relative',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '12px'
            }}>
              <img
                src={product.images?.[activeImageIndex] || product.images?.[0]}
                alt={product.name}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />

              {product.is_new_drop && (
                <div style={{
                  position: 'absolute',
                  top: '14px',
                  left: '14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #121212',
                  color: '#121212',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <Sparkles size={12} color="#121212" />
                  NEW DROP
                </div>
              )}
            </div>

            {/* Thumbnail Navigation */}
            {product.images?.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    style={{
                      width: '64px',
                      height: '80px',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      padding: 0,
                      border: activeImageIndex === idx ? '2px solid #121212' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      flexShrink: 0,
                      background: 'none'
                    }}
                  >
                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}

            {/* Social Share & WhatsApp Action Bar */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                onClick={handleShare}
                style={{
                  width: '100%',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {copiedLink ? <Check size={16} color="var(--text-primary)" /> : <Share2 size={16} />}
                <span>{copiedLink ? 'Link Copied' : 'Share Piece'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Garment Specs, Honesty Badge, Measurements, Checkout */}
          <div>
            {/* Header: Category & SKU */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {product.category_id} • {product.subcategory_id}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                SKU: {product.sku}
              </span>
            </div>

            <h1 style={{ fontSize: '24px', fontWeight: 700, lineHeight: 1.3, marginBottom: '14px', color: 'var(--text-primary)' }}>
              {product.name}
            </h1>

            {/* Pricing Section */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '20px' }}>
              <span style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                ₹{product.selling_price.toLocaleString('en-IN')}
              </span>
              {product.original_price && product.original_price > product.selling_price && (
                <span style={{ fontSize: '15px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                  ₹{product.original_price.toLocaleString('en-IN')}
                </span>
              )}
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                (Inclusive of all taxes)
              </span>
            </div>

            {/* Condition Badge & Condition Notes Displayed Together Prominently */}
            <div style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className={`subtle-badge ${product.condition === 'New / Unused' ? 'badge-new' : 'badge-preowned'}`}>
                  {product.condition}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 600 }}>
                  Quality Checked &amp; Verified
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {product.condition_notes || 'Clean garment, verified condition. Inspected under high daylight.'}
              </p>
            </div>

            {/* Size Selector */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  AVAILABLE SIZE
                </label>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Ruler size={13} /> True to measurement
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {product.variants?.map((v) => {
                  const isVarSoldOut = v.stock_on_hand <= 0;
                  const isSelected = v.id === selectedVariantId;
                  return (
                    <button
                      key={v.id}
                      onClick={() => !isVarSoldOut && setSelectedVariantId(v.id)}
                      disabled={isVarSoldOut}
                      style={{
                        padding: '10px 20px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '13px',
                        fontWeight: 700,
                        border: isSelected ? '2px solid #121212' : '1px solid var(--border-subtle)',
                        background: isSelected ? '#121212' : isVarSoldOut ? 'transparent' : 'var(--bg-secondary)',
                        color: isVarSoldOut ? 'var(--text-muted)' : isSelected ? '#FFFFFF' : 'var(--text-primary)',
                        cursor: isVarSoldOut ? 'not-allowed' : 'pointer',
                        textDecoration: isVarSoldOut ? 'line-through' : 'none'
                      }}
                    >
                      {v.size} {isVarSoldOut && '(Sold)'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Exact Measurements Table */}
            {selectedVariant?.measurements && (
              <div style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px',
                marginBottom: '22px'
              }}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  GARMENT MEASUREMENTS (INCHES)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
                  <div style={{ background: 'var(--bg-surface)', padding: '8px 4px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>CHEST</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {selectedVariant.measurements.chest}"
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-surface)', padding: '8px 4px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>LENGTH</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {selectedVariant.measurements.length}"
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-surface)', padding: '8px 4px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>SHOULDER</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {selectedVariant.measurements.shoulder || '-'}"
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-surface)', padding: '8px 4px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>SLEEVE</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {selectedVariant.measurements.sleeve || '-'}"
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Availability Message Banner (SF-15) */}
            {isOnlyOneLeft && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#121212',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '14px'
              }}>
                <AlertTriangle size={15} />
                <span>Only 1 left in stock. This is a one-of-one physical piece.</span>
              </div>
            )}

            {isHeld && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#121212',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: 'var(--bg-secondary)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '14px',
                border: '1px solid var(--border-subtle)'
              }}>
                <Clock size={16} />
                <span>This piece is unavailable right now. A buyer is currently in checkout. Check back in a few minutes.</span>
              </div>
            )}

            {/* Action Button: Add to Cart OR Sold Out Navigation */}
            <div className="product-modal-actions-sticky">
              {isSoldOut ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{
                    padding: '14px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '14px',
                    color: 'var(--text-secondary)'
                  }}>
                    PIECE SOLD OUT {product.pieces_sold > 0 && `(${product.pieces_sold} sold)`}
                  </div>
                  <button
                    onClick={() => { onClose(); onNavigateToNewDrops(); }}
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                  >
                    EXPLORE NEW DROPS
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    onClick={() => {
                      onAddToCart(product, selectedVariant);
                      onClose();
                    }}
                    disabled={isHeld || selectedVariant?.available <= 0}
                    className="btn btn-primary"
                    style={{ width: '100%', height: '50px', fontSize: '14px' }}
                  >
                    {isHeld ? 'UNAVAILABLE RIGHT NOW' : 'ADD TO CART'}
                  </button>
                </div>
              )}
            </div>

            {/* Visible Mandatory No Return Policy Link */}
            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                No returns. Authentic exceptions handled.{' '}
                <button
                  onClick={onOpenPolicy}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-primary)',
                    textDecoration: 'underline',
                    fontSize: '12px',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  See policy.
                </button>
              </span>
            </div>

            {/* Garment Details Specs */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Fabric &amp; Material: </span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{product.fabric || '100% Cotton'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Fit Profile: </span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{product.fit}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Care Instructions: </span>
                <span style={{ color: 'var(--text-secondary)' }}>{product.care || 'Cold gentle cycle, hang dry in shade.'}</span>
              </div>
              <div style={{ marginTop: '6px' }}>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{product.description}</p>
              </div>
            </div>

            {/* Trust Badges */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '11.5px',
              color: 'var(--text-secondary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={16} color="var(--text-primary)" />
                <span>Dispatched within 24-48 hours</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={16} color="var(--text-primary)" />
                <span>Multi-point Quality Inspected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
