import React, { useState, useEffect } from 'react';
import { Search, X, Sparkles, ArrowRight } from 'lucide-react';
import supabase from '../supabaseClient';

export default function SearchModal({ isOpen, onClose, onSelectProduct, onExploreShop }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .or(`name.ilike.%${query}%,sku.ilike.%${query}%,category_id.ilike.%${query}%`);

        if (error) {
          console.error('Search error from Supabase:', error);
        } else if (Array.isArray(data)) {
          const normalized = data.map((p) => {
            let imgs = p.images;
            if (!Array.isArray(imgs)) {
              if (p.image_url) imgs = [p.image_url];
              else imgs = [];
            }
            return {
              ...p,
              name: p.title || p.name || 'Untitled Piece',
              selling_price: parseFloat(p.selling_price) || 0,
              original_price: p.original_price ? parseFloat(p.original_price) : null,
              images: imgs,
              image_url: imgs[0] || p.image_url || ''
            };
          });

          // Sort available pieces first, sold out below
          const sorted = normalized.sort((a, b) => {
            const aAvail = (a.status !== 'SOLD_OUT' && (a.total_available === undefined || a.total_available > 0)) ? 1 : 0;
            const bAvail = (b.status !== 'SOLD_OUT' && (b.total_available === undefined || b.total_available > 0)) ? 1 : 0;
            return bAvail - aAvail;
          });
          setResults(sorted);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(10px)',
      zIndex: 250,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 12px 20px',
      overflowY: 'auto'
    }}>
      <div style={{ width: '100%', maxWidth: '640px' }}>
        {/* Search Input Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #121212',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 16px',
          boxShadow: 'var(--shadow-md)',
          marginBottom: '20px'
        }}>
          <Search size={20} color="#121212" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by silhouette, cotton, tee, jacket, oversized..."
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px 0',
              fontSize: '16px',
              color: 'var(--text-primary)',
              minHeight: 'auto',
              boxShadow: 'none'
            }}
          />
          <button
            onClick={onClose}
            aria-label="Close search"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Results Stream */}
        <div>
          {loading && (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              Filtering catalog...
            </div>
          )}

          {!loading && query && results.length === 0 && (
            /* SF-11: Empty search state */
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)'
            }}>
              <p style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                No pieces matched your search.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                Try searching for simple variations like "tee", "oversized", or "hoodie".
              </p>
              <button
                onClick={() => { onClose(); onExploreShop(); }}
                className="btn btn-primary"
              >
                <span>EXPLORE SHOP</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {results.map((prod) => {
              const isSold = prod.status === 'SOLD_OUT' || prod.total_on_hand <= 0;
              return (
                <div
                  key={prod.id}
                  onClick={() => {
                    onClose();
                    onSelectProduct(prod);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-active)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                >
                  <img
                    src={prod.images?.[0] || prod.image_url || ''}
                    alt={prod.title || prod.name || 'Product'}
                    style={{ width: '50px', height: '62px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }}
                  />
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#121212', fontWeight: 700, textTransform: 'uppercase' }}>
                        {prod.category_id}
                      </span>
                      {isSold && (
                        <span style={{ fontSize: '10px', backgroundColor: '#121212', color: '#FFFFFF', padding: '2px 6px', borderRadius: '2px', fontWeight: 700 }}>
                          SOLD OUT
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {prod.title || prod.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      SKU: {prod.sku} • {prod.condition}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      ₹{(parseFloat(prod.selling_price) || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
