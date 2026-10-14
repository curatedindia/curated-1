import React, { useState, useEffect } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function SoldOutView({ onSelectProduct, onExploreNewDrops }) {
  const [soldProducts, setSoldProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSoldProducts();
  }, []);

  const fetchSoldProducts = async () => {
    try {
      const res = await fetch('/api/products?view=sold-out&is_admin=true');
      const data = await res.json();
      if (data.success) {
        // Only products that have at least one verified sale
        const filtered = data.products.filter((p) => p.status === 'SOLD_OUT' && p.pieces_sold > 0);
        setSoldProducts(filtered);
      }
    } catch (err) {
      console.error('Failed to load sold archive:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '60px 16px', minHeight: '70vh' }}>
      {/* Editorial Header */}
      <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 50px' }}>
        <h1 style={{ fontSize: '34px', fontWeight: 800, marginBottom: '12px', letterSpacing: '-0.02em' }}>
          SOLD OUT
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--sage-primary)', opacity: 0.85, fontStyle: 'italic', fontFamily: 'var(--font-body)' }}>
          “Pieces that made the cut.”
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Loading archive...
        </div>
      ) : soldProducts.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          maxWidth: '540px',
          margin: '0 auto'
        }}>
          <p style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '14px' }}>
            Pieces from upcoming drops will be archived here once sold out.
          </p>
          <button onClick={onExploreNewDrops} className="btn btn-primary">
            <span>EXPLORE LIVE DROPS</span>
            <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '24px'
        }}>
          {soldProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => onSelectProduct(product)}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-active)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Image Container with Muted Grayscale Overlay */}
              <div style={{ position: 'relative', width: '100%', paddingTop: '125%', backgroundColor: 'var(--bg-secondary)' }}>
                <img
                  src={product.images?.[0]}
                  alt={product.name}
                  loading="lazy"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: 'grayscale(35%) opacity(0.85)'
                  }}
                />

                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  backgroundColor: 'rgba(58, 83, 64, 0.92)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#FFFFFF',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  SOLD OUT
                </div>
              </div>

              {/* Minimalist Card Details (SF-24: Only Name, Listing Price, Pieces Sold) */}
              <div style={{ padding: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--sage-light)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                  {product.category_id}
                </div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.4 }}>
                  {product.name}
                </h3>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    ₹{product.selling_price.toLocaleString('en-IN')}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--olive-light)', fontWeight: 600 }}>
                    {product.pieces_sold} {product.pieces_sold === 1 ? 'piece sold' : 'pieces sold'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
