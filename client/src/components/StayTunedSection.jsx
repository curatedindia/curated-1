import React, { useState } from 'react';
import { Mail, Check, ArrowRight, Bell } from 'lucide-react';

export default function StayTunedSection() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) {
        setSubscribed(true);
        setMessage(data.message || "You're on the list! We'll notify you the moment a new batch drops.");
        setEmail('');
      } else {
        setMessage(data.message || 'Unable to join drop alerts. Please try again.');
      }
    } catch (err) {
      setSubscribed(true);
      setMessage("You're on the list! We'll notify you the moment a new batch drops.");
      setEmail('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section style={{
      padding: '76px 20px',
      backgroundColor: '#121212',
      color: '#FFFFFF',
      borderTop: '1px solid #27272A',
      borderBottom: '1px solid #27272A',
      textAlign: 'center'
    }}>
      <div className="container" style={{ maxWidth: '640px', margin: '0 auto' }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 14px',
          borderRadius: '999px',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: '#FFFFFF',
          fontSize: '11px',
          fontFamily: 'var(--font-subheading)',
          fontWeight: 800,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginBottom: '16px'
        }}>
          <Bell size={13} color="#FFFFFF" />
          <span>DROP NOTIFICATIONS</span>
        </div>

        {/* Heading: STAY TUNED */}
        <h2 style={{
          fontSize: 'clamp(28px, 4.5vw, 40px)',
          fontFamily: 'var(--font-heading)',
          fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: '12px',
          color: '#FFFFFF'
        }}>
          STAY TUNED
        </h2>

        {/* Description */}
        <p style={{
          fontSize: '14px',
          lineHeight: 1.7,
          color: 'rgba(255, 255, 255, 0.75)',
          maxWidth: '520px',
          margin: '0 auto 30px',
          fontFamily: 'var(--font-body)'
        }}>
          We drop authentic 1-of-1 pieces weekly. Put your email in below to get notified on mail the moment a new batch drops before pieces sell out.
        </p>

        {/* Form or Confirmation */}
        {subscribed ? (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '16px 24px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid #FFFFFF',
            borderRadius: 'var(--radius-sm)',
            color: '#FFFFFF',
            fontSize: '13.5px',
            fontWeight: 600
          }}>
            <Check size={18} color="#FFFFFF" />
            <span>{message}</span>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              gap: '10px',
              maxWidth: '460px',
              margin: '0 auto',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}
          >
            <div style={{ position: 'relative', flex: '1 1 240px', width: '100%' }}>
              <input
                type="email"
                inputMode="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  height: '48px',
                  padding: '0 16px',
                  fontSize: '14px',
                  backgroundColor: '#FFFFFF',
                  color: '#121212',
                  border: '1px solid #FFFFFF',
                  borderRadius: 'var(--radius-sm)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{
                height: '48px',
                padding: '0 26px',
                backgroundColor: '#FFFFFF',
                color: '#121212',
                borderColor: '#FFFFFF',
                fontSize: '12px',
                fontFamily: 'var(--font-btn)',
                fontWeight: 800,
                letterSpacing: '0.08em',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                flex: '1 1 140px'
              }}
            >
              <span>{submitting ? 'JOINING...' : 'NOTIFY ME'}</span>
              <ArrowRight size={15} color="#121212" />
            </button>
          </form>
        )}

        {/* Privacy Note */}
        <p style={{
          fontSize: '11px',
          color: 'rgba(255, 255, 255, 0.45)',
          marginTop: '16px',
          letterSpacing: '0.04em'
        }}>
          No spam. Only drop alerts & private preview notifications.
        </p>
      </div>
    </section>
  );
}
