import React, { useState } from 'react';
import { Mail, Clock, Send, CheckCircle2 } from 'lucide-react';

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
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.message || 'Submission error');
      }
    } catch (err) {
      setError('Network error sending message.');
    } finally {
      setLoading(false);
    }
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

          {/* Operating Hours */}
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
              <Clock size={24} color="var(--text-secondary)" />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700 }}>SUPPORT HOURS</div>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Mon – Sat: 10:00 AM – 8:00 PM IST</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Mumbai Standard Time (IST)</div>
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
              <CheckCircle2 size={48} color="var(--sage-light)" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>MESSAGE DISPATCHED</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Thank you for reaching out. Nikhil and the CURATED concierge team will review your message and reply via mobile or email shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>SEND A MESSAGE</h3>

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
