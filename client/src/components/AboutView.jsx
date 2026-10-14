import React from 'react';
import { Search, Filter, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';

export default function AboutView({ onExploreShop }) {
  const steps = [
    {
      num: '01',
      title: 'SEARCHED',
      icon: Search,
      tag: 'Broad Horizon Sourcing',
      desc: 'We scour brand surplus lots, high-grade export runs, factory overstock, and archival vintage vaults across India. Sourcing is our legwork so you never have to sift through chaotic piles.'
    },
    {
      num: '02',
      title: 'FILTERED',
      icon: Filter,
      tag: '90% Rejection Rate',
      desc: 'Most garments do not make the cut. We ruthlessly eliminate lightweight flimsy polyester blends, dated cuts, stretched necklines, and worn silhouettes. Only high-character garments survive.'
    },
    {
      num: '03',
      title: 'QUALITY CHECKED',
      icon: ShieldCheck,
      tag: 'Multi-Point Inspection',
      desc: 'Every prospective piece undergoes tactile inspection under bright daylight: seam tension, print cracking, pocket alignment, pilling, and collar integrity. We measure every piece with a physical tape to provide accurate chest, shoulder, and length specs.'
    },
    {
      num: '04',
      title: 'HANDPICKED',
      icon: Sparkles,
      tag: 'The Final Archive',
      desc: 'Only the approved pieces are cataloged and released in weekly curated drops. Each garment is unique, honest in its condition grading, and priced accessibly.'
    }
  ];

  return (
    <div className="container" style={{ padding: '60px 16px', maxWidth: '880px' }}>
      {/* Brand Manifest */}
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <span style={{ fontSize: '11px', color: 'var(--sage-light)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          OUR PHILOSOPHY
        </span>
        <h1 style={{ fontSize: '36px', fontWeight: 800, marginTop: '10px', marginBottom: '16px', letterSpacing: '-0.02em' }}>
          THE SELECTION IS THE BRAND
        </h1>
        <p style={{ fontSize: 'clamp(13px, 2.2vw, 21px)', color: 'var(--sage-primary)', opacity: 0.85, lineHeight: 1.5, whiteSpace: 'nowrap', maxWidth: '100%', width: 'max-content', margin: '0 auto', fontFamily: 'var(--font-body)', fontStyle: 'italic' }}>
          “We search everywhere so our customers don't have to.”
        </p>
      </div>

      {/* Narrative Section */}
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        padding: '32px',
        marginBottom: '48px',
        fontSize: '14.5px',
        lineHeight: 1.8,
        color: 'var(--text-secondary)'
      }}>
        <p style={{ marginBottom: '16px' }}>
          CURATED is an Indian fashion retail brand built on discernment over volume. In an era dominated by disposable fast fashion and endless algorithmic catalogs, finding truly great garments with heavyweight fabrics, authentic fits, and enduring character has become a chore.
        </p>
        <p style={{ marginBottom: '16px' }}>
          We are not a generic thrift shop, an export-surplus bin, or a wholesale reseller. Where a garment comes from is an internal operational detail; what matters to our customers is that every piece bearing the CURATED badge has been vetted, measured, and approved by a passionate human eye.
        </p>
        <p>
          We photograph flaws honestly, disclose exact measurements down to the half-inch, and operate on verified one-of-one pieces. When you buy from CURATED, you are owning a garment that truly made the cut.
        </p>
      </div>

      {/* The 4-Step Process */}
      <div style={{ marginBottom: '60px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800, textAlign: 'center', marginBottom: '32px', letterSpacing: '0.04em' }}>
          THE CURATION PROTOCOL
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          {steps.map((st) => {
            const IconComp = st.icon;
            return (
              <div
                key={st.num}
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--sage-light)', fontFamily: 'var(--font-brand)' }}>
                    {st.num}
                  </span>
                  <div style={{ padding: '8px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <IconComp size={18} color="var(--sage-light)" />
                  </div>
                </div>

                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>
                  {st.title}
                </h3>
                <div style={{ fontSize: '11px', color: 'var(--olive-light)', fontWeight: 600, marginBottom: '10px' }}>
                  {st.tag}
                </div>
                <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                  {st.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ textAlign: 'center' }}>
        <button onClick={onExploreShop} className="btn btn-primary" style={{ height: '48px', padding: '0 32px' }}>
          <span>EXPLORE AVAILABLE PIECES</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
