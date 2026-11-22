import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

/**
 * AddressFormFields
 * Shared component rendering the 7 delivery address fields across CURATED checkout views:
 * 1. Full Name
 * 2. 10-Digit Mobile
 * 3. Email Address
 * 4. Complete Delivery Address
 * 5. 6-Digit Pincode (with automatic lookup & loading spinner)
 * 6. City
 * 7. State
 */
export default function AddressFormFields({
  formData = {},
  onChange,
  pincodeLoading = false,
  error = ''
}) {
  const handleChange = onChange || (() => {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Optional error alert */}
      {error && (
        <div style={{
          padding: '10px 14px',
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--accent-red)',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Full Name */}
      <div>
        <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', letterSpacing: '0.04em' }}>
          FULL NAME *
        </label>
        <input
          name="name"
          type="text"
          required
          value={formData.name || ''}
          onChange={handleChange}
          placeholder="e.g. Tanmay Sharma"
          style={{ width: '100%' }}
        />
      </div>

      {/* 2 & 3: Mobile & Email */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', letterSpacing: '0.04em' }}>
            10-DIGIT MOBILE *
          </label>
          <input
            name="mobile"
            type="tel"
            inputMode="tel"
            required
            maxLength={10}
            value={formData.mobile || ''}
            onChange={handleChange}
            placeholder="9820012345"
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', letterSpacing: '0.04em' }}>
            EMAIL ADDRESS *
          </label>
          <input
            name="email"
            type="email"
            inputMode="email"
            required
            value={formData.email || ''}
            onChange={handleChange}
            placeholder="your@email.com"
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* 4. Complete Delivery Address */}
      <div>
        <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', letterSpacing: '0.04em' }}>
          COMPLETE DELIVERY ADDRESS *
        </label>
        <input
          name="address"
          type="text"
          required
          value={formData.address || ''}
          onChange={handleChange}
          placeholder="Flat, building, street, landmark"
          style={{ width: '100%' }}
        />
      </div>

      {/* 5, 6, 7: Pincode, City, State */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', letterSpacing: '0.04em' }}>
              6-DIGIT PINCODE *
            </label>
            {pincodeLoading && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#121212', fontWeight: 600 }}>
                <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Locating...</span>
              </span>
            )}
          </div>
          <input
            name="pincode"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            required
            maxLength={6}
            value={formData.pincode || ''}
            onChange={handleChange}
            placeholder="e.g. 400001"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', letterSpacing: '0.04em' }}>
            CITY *
          </label>
          <input
            name="city"
            type="text"
            required
            value={formData.city || ''}
            onChange={handleChange}
            placeholder="City"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', letterSpacing: '0.04em' }}>
            STATE *
          </label>
          <input
            name="state"
            type="text"
            required
            value={formData.state || ''}
            onChange={handleChange}
            placeholder="State"
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </div>
  );
}
