import React, { useState } from 'react';
import { Mail, Send, CheckCircle2 } from 'lucide-react';
import supabase from '../supabaseClient';
import nikhilBitmoji from '../assets/nikhil-bitmoji.jpg';

const InstagramIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="4" ry="4"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

export default function ContactView({ settings }) {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    order_number: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.message?.trim()) {
      setError('Name and message are required.');
      return;
    }

    setLoading(true);
    setError('');

    let savedDirectly = false;
    let apiDispatched = false;

    // 1. Direct Supabase save (instant, client-side resilience)
    try {
      const { error: sbErr } = await supabase
        .from('inquiries')
        .insert([{
          name: formData.name.trim(),
          email: formData.email?.trim() || null,
          mobile: formData.mobile?.trim() || null,
          order_number: formData.order_number?.trim() || null,
          message: formData.message.trim(),
          status: 'unread'
        }]);

      if (!sbErr) {
        savedDirectly = true;
      } else {
        console.warn('[ContactView] Supabase direct insert note:', sbErr);
      }
    } catch (sbEx) {
      console.warn('[ContactView] Supabase direct exception:', sbEx);
    }

    // 2. Dispatch to /api/contact for email alert and backup storage
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.success) {
          apiDispatched = true;
        }
      }
    } catch (apiEx) {
      console.warn('[ContactView] API notification exception:', apiEx);
    }

    if (savedDirectly || apiDispatched) {
      setSubmitted(true);
    } else {
      setError('Unable to send message right now. Please email us directly at hello.curatedindia@gmail.com.');
    }

    setLoading(false);
  };

  const whatsappUrl = `https://wa.me/${(settings?.whatsapp_number || '+919876543210').replace(/[^0-9]/g, '')}?text=Hi%20CURATED%20team,%20I'd%20like%20to%20inquire%20about...`;

  return (
    <div className="container" style={{ padding: '60px 16px', maxWidth: '840px' }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <span style={{ fontSize: '11px', color: 'var(--sage-light)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          CONCIERGE & SUPPORT
        </span>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginTop: '8px' }}>
          GET IN TOUCH
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
        {/* Contact Info Channels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Instagram Concierge */}
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '20px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
              color: 'var(--text-primary)',
              transition: 'border-color 0.2s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
          >
            <div style={{ padding: '10px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
              <InstagramIcon size={24} color="var(--text-primary)" />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 700 }}>INSTAGRAM DIRECT</div>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>@curatedindia</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Follow for drop previews &amp; updates</div>
            </div>
          </a>

          {/* Email Support */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '20px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)'
          }}>
            <div style={{ padding: '10px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
              <Mail size={24} color="var(--sage-light)" />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--sage-light)', fontWeight: 700 }}>DIRECT EMAIL</div>
              <a
                href="mailto:hello.curatedindia@gmail.com"
                style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}
              >
                hello.curatedindia@gmail.com
              </a>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Response within 24 business hours</div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '24px'
        }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <img
                src={nikhilBitmoji}
                alt="Nikhil - CURATED"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover mx-auto mb-4 border-2 border-[#121212] shadow-md bg-black"
              />
              <CheckCircle2 size={40} color="var(--sage-light)" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>MESSAGE DISPATCHED</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Thank you for reaching out. Nikhil and the CURATED concierge team will review your message and reply via mobile or email shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="flex items-center justify-between gap-3 pb-3 mb-1 border-b border-[var(--border-subtle)]">
                <div>
                  <span className="text-[10px] font-extrabold tracking-wider uppercase text-[var(--text-muted)] block">
                    Concierge Direct
                  </span>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                    SEND A MESSAGE
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] text-[var(--text-secondary)] font-medium">
                      Nikhil is online
                    </span>
                  </div>
                </div>

                <div className="relative shrink-0">
                  <img
                    src={nikhilBitmoji}
                    alt="Nikhil - CURATED Concierge"
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover bg-black border-2 border-[#121212] shadow-sm transition-transform hover:scale-105"
                  />
                  <span
                    className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs"
                    title="Active Concierge"
                  />
                </div>
              </div>

              {error && (
                <div style={{
                  padding: '10px 14px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#ef4444',
                  fontSize: '12px'
                }}>
                  {error}
                </div>
              )}

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>YOUR NAME *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Rohan Verma"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>MOBILE NUMBER</label>
                  <input
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="9820012345"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>EMAIL</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="rohan@example.com"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>ORDER NUMBER (OPTIONAL)</label>
                <input
                  type="text"
                  value={formData.order_number}
                  onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                  placeholder="e.g. CUR-1001"
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>MESSAGE *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Detail your inquiry, sizing query, or order feedback..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ height: '46px', marginTop: '6px' }}
              >
                <Send size={15} />
                <span>{loading ? 'Sending...' : 'SUBMIT MESSAGE'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
