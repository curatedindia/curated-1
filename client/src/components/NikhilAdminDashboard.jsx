import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Lock,
  PlusCircle,
  Trash2,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  LogOut,
  RefreshCw,
  ExternalLink,
  Layers,
  Tag,
  DollarSign,
  Maximize2
} from 'lucide-react';
import supabase from '../supabaseClient';

const REQUIRED_ADMIN_EMAIL = 'hello.curatedindia@gmail.com';

export default function NikhilAdminDashboard({ onExit }) {
  // Authentication & Guard State
  const [authChecking, setAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [authError, setAuthError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Catalog State
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [actionError, setActionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form State
  const fileInputRef = useRef(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: 't-shirts',
    conditionGrade: 'New / Unused',
    sellingPrice: '',
    originalPrice: '',
    internalCost: '',
    chest: '',
    length: '',
    shoulder: '',
    sleeve: '',
    conditionNotes: ''
  });

  // ========================================================
  // 1. STRICT ROUTE GUARD & AUTHENTICATION
  // ========================================================
  useEffect(() => {
    let isMounted = true;

    const enforceAdminSecurity = (user) => {
      if (!user) {
        if (isMounted) {
          setCurrentUser(null);
          setAuthChecking(false);
        }
        return false;
      }

      const email = (user.email || '').toLowerCase().trim();
      if (email !== REQUIRED_ADMIN_EMAIL) {
        console.warn(`[SECURITY VIOLATION] Unauthorized email: ${email}`);
        alert(`Access Denied. Only ${REQUIRED_ADMIN_EMAIL} is authorized.`);
        supabase.auth.signOut();
        window.location.replace('/');
        return false;
      }

      if (isMounted) {
        setCurrentUser(user);
        setAuthChecking(false);
        fetchCatalog();
      }
      return true;
    };

    // Check existing session on mount
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Session check error:', error);
      }
      if (isMounted) {
        enforceAdminSecurity(session?.user);
      }
    });

    // Listen for auth state changes (e.g. returning from Google OAuth)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (isMounted) {
        enforceAdminSecurity(session?.user);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleAdminGoogleLogin = async () => {
    setIsSigningIn(true);
    setAuthError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/nikhil'
        }
      });
      if (error) {
        setAuthError(error.message);
        setIsSigningIn(false);
      }
    } catch (err) {
      setAuthError('Failed to trigger admin authentication.');
      setIsSigningIn(false);
    }
  };

  const handleAdminLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    window.location.replace('/');
  };

  // ========================================================
  // 2. FETCH CATALOG FROM SUPABASE (with API fallback)
  // ========================================================
  const fetchCatalog = async () => {
    setLoadingProducts(true);
    setActionError('');
    try {
      // 1. Primary: fetch from Supabase 'products' table
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        setProducts(data);
      } else {
        // Fallback: fetch from local API if Supabase table is newly created
        const apiRes = await fetch('/api/products?is_admin=true');
        const apiData = await apiRes.json();
        if (apiData && apiData.success && Array.isArray(apiData.products)) {
          setProducts(apiData.products);
        }
      }
    } catch (err) {
      console.error('Error fetching catalog:', err);
      setActionError('Could not load products. Please check Supabase table configuration.');
    } finally {
      setLoadingProducts(false);
    }
  };

  // ========================================================
  // 3. IMAGE SELECTION & PREVIEW
  // ========================================================
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ========================================================
  // 4. PRODUCT ENTRY (ADD): STORAGE UPLOAD + DB INSERT
  // ========================================================
  const handleAddProduct = async (e) => {
    e.preventDefault();
    setActionError('');
    setSuccessMessage('');

    if (!imageFile) {
      setActionError('Please select or capture a product image file.');
      return;
    }

    if (!form.title.trim()) {
      setActionError('Please provide a product title.');
      return;
    }

    if (!form.sellingPrice || parseFloat(form.sellingPrice) <= 0) {
      setActionError('Please enter a valid selling price.');
      return;
    }

    setSubmitting(true);
    try {
      // Step A: Upload image to Supabase Storage bucket 'product-images'
      const fileExt = imageFile.name.split('.').pop() || 'jpg';
      const cleanFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const storagePath = `products/${cleanFileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(storagePath, imageFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Supabase Storage error:', uploadError);
        throw new Error(`Image upload failed: ${uploadError.message}. Make sure bucket 'product-images' exists and is public.`);
      }

      // Step B: Retrieve public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(storagePath);

      if (!publicUrl) {
        throw new Error('Failed to obtain public URL for uploaded product image.');
      }

      // Step C: Prepare product row payload
      const categoryCode = form.category.toUpperCase().slice(0, 2);
      const generatedSku = `CUR-${categoryCode}-${Math.floor(100 + Math.random() * 900)}`;
      const generatedSlug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const newProductPayload = {
        sku: generatedSku,
        name: form.title.trim(),
        slug: generatedSlug,
        category_id: form.category,
        condition: form.conditionGrade,
        condition_notes: form.conditionNotes.trim() || 'Pristine authentic 1-of-1 piece.',
        selling_price: parseFloat(form.sellingPrice),
        original_price: parseFloat(form.originalPrice) || parseFloat(form.sellingPrice) * 2,
        cost_price: parseFloat(form.internalCost) || 0,
        measurements: {
          chest: parseFloat(form.chest) || 0,
          length: parseFloat(form.length) || 0,
          shoulder: parseFloat(form.shoulder) || 0,
          sleeve: parseFloat(form.sleeve) || 0,
          unit: 'in'
        },
        images: [publicUrl],
        status: 'ACTIVE',
        is_new_drop: true,
        created_at: new Date().toISOString()
      };

      // Step D: Insert row into Supabase 'products' table
      const { data: insertedData, error: insertError } = await supabase
        .from('products')
        .insert([newProductPayload])
        .select();

      if (insertError) {
        console.error('Supabase DB Insert Error:', insertError);
        throw new Error(`Database insert failed: ${insertError.message}`);
      }

      // Also sync to local backend if running
      try {
        await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProductPayload)
        });
      } catch (syncErr) {
        // non-blocking
      }

      setSuccessMessage(`✓ '${form.title}' successfully published with SKU ${generatedSku}!`);

      // Reset form
      setForm({
        title: '',
        category: 't-shirts',
        conditionGrade: 'New / Unused',
        sellingPrice: '',
        originalPrice: '',
        internalCost: '',
        chest: '',
        length: '',
        shoulder: '',
        sleeve: '',
        conditionNotes: ''
      });
      setImageFile(null);
      setImagePreview('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Refresh list
      fetchCatalog();
    } catch (err) {
      console.error('Error adding product:', err);
      setActionError(err.message || 'Failed to add product. Please check console.');
    } finally {
      setSubmitting(false);
    }
  };

  // ========================================================
  // 5. CATALOG MANAGEMENT (DELETE)
  // ========================================================
  const handleDeleteProduct = async (product) => {
    const confirmDelete = window.confirm(
      `Permanently delete "${product.name}" (${product.sku || product.id}) from the database?`
    );
    if (!confirmDelete) return;

    setActionError('');
    setSuccessMessage('');

    try {
      // Execute supabase delete
      const { error: dbError } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (dbError) {
        console.error('Supabase delete error:', dbError);
        throw new Error(`Delete failed: ${dbError.message}`);
      }

      // Also delete from local API if available
      try {
        await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
      } catch (e) {
        // non-blocking
      }

      // Remove from UI state instantly
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      setSuccessMessage(`✓ Successfully removed "${product.name}" from catalog.`);
    } catch (err) {
      console.error('Delete error:', err);
      setActionError(err.message || 'Unable to delete product.');
    }
  };

  // ========================================================
  // RENDER: LOADING CHECK
  // ========================================================
  if (authChecking) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#121212',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '3px solid #27272A',
          borderTopColor: '#FFFFFF',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '16px'
        }} />
        <p style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '12px',
          letterSpacing: '0.14em',
          textTransform: 'uppercase'
        }}>
          VERIFYING SECURE ROUTE CREDENTIALS...
        </p>
      </div>
    );
  }

  // ========================================================
  // RENDER: SECURE ADMIN LOGIN GATE (If not signed in)
  // ========================================================
  if (!currentUser) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#09090B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#121212',
          border: '1px solid #27272A',
          padding: '36px 28px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.8)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#18181B',
              border: '1px solid #27272A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Lock size={22} color="#FFFFFF" />
            </div>
            <h1 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '20px',
              fontWeight: 800,
              letterSpacing: '0.1em',
              color: '#FFFFFF',
              textTransform: 'uppercase'
            }}>
              CURATED // ADMIN PORTAL
            </h1>
            <p style={{ fontSize: '12px', color: '#71717A', marginTop: '6px' }}>
              Restricted to authorized administrator ({REQUIRED_ADMIN_EMAIL})
            </p>
          </div>

          {authError && (
            <div style={{
              padding: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#EF4444',
              fontSize: '12.5px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertTriangle size={16} />
              <span>{authError}</span>
            </div>
          )}

          <button
            onClick={handleAdminGoogleLogin}
            disabled={isSigningIn}
            className="btn btn-primary"
            style={{
              width: '100%',
              height: '50px',
              fontSize: '13px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              backgroundColor: '#FFFFFF',
              color: '#121212',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{isSigningIn ? 'AUTHENTICATING...' : 'SIGN IN AS NIKHIL'}</span>
          </button>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              onClick={() => window.location.replace('/')}
              style={{
                background: 'none',
                border: 'none',
                color: '#71717A',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ArrowLeft size={14} /> Back to Storefront
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // RENDER: AUTHORIZED ADMIN DASHBOARD (/nikhil)
  // ========================================================
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8F9FA', color: '#121212' }}>
      
      {/* Admin Header Bar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: '#121212',
        color: '#FFFFFF',
        borderBottom: '1px solid #27272A',
        padding: '16px 24px'
      }}>
        <div className="container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '18px',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase'
            }}>
              CURATED // NIKHIL ADMIN
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#18181B',
              border: '1px solid #3F3F46',
              padding: '3px 8px',
              fontSize: '11px',
              color: '#34A853',
              fontWeight: 700
            }}>
              <ShieldCheck size={13} color="#34A853" /> {REQUIRED_ADMIN_EMAIL}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => {
                if (onExit) onExit();
                else window.location.href = '/';
              }}
              style={{
                background: 'transparent',
                border: '1px solid #3F3F46',
                color: '#FFFFFF',
                padding: '6px 12px',
                fontSize: '11.5px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ExternalLink size={13} /> STOREFRONT
            </button>

            <button
              onClick={handleAdminLogout}
              style={{
                background: '#EF4444',
                border: 'none',
                color: '#FFFFFF',
                padding: '6px 12px',
                fontSize: '11.5px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <LogOut size={13} /> LOG OUT
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container" style={{ padding: '32px 16px 80px', maxWidth: '1040px' }}>
        
        {/* Status Alerts */}
        {actionError && (
          <div style={{
            padding: '14px 18px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '4px',
            color: '#DC2626',
            fontSize: '13px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertTriangle size={18} />
            <span>{actionError}</span>
          </div>
        )}

        {successMessage && (
          <div style={{
            padding: '14px 18px',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '4px',
            color: '#15803D',
            fontSize: '13px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ========================================================
            SECTION 1: QUICK MOBILE PRODUCT ENTRY
        ======================================================== */}
        <section style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border-subtle)',
          borderRadius: '4px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          marginBottom: '40px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', pb: '14px' }}>
            <PlusCircle size={20} color="#121212" />
            <h2 style={{
              fontSize: '16px',
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}>
              QUICK MOBILE PRODUCT ENTRY
            </h2>
          </div>

          <form onSubmit={handleAddProduct}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' }}>
              
              {/* Left Column: Image Upload Box */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: '#121212', display: 'block', marginBottom: '8px' }}>
                  PRODUCT IMAGE * (CAMERA / FILE)
                </label>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #D4D4D8',
                    borderRadius: '4px',
                    padding: '20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: '#FAFAFA',
                    minHeight: '220px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {imagePreview ? (
                    <div style={{ position: 'relative', width: '100%', height: '200px' }}>
                      <img
                        src={imagePreview}
                        alt="Product Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                      <div style={{
                        position: 'absolute',
                        bottom: 4,
                        right: 4,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        color: '#FFFFFF',
                        padding: '4px 8px',
                        fontSize: '10px',
                        borderRadius: '2px'
                      }}>
                        TAP TO REPLACE
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload size={36} color="#71717A" style={{ margin: '0 auto 10px' }} />
                      <p style={{ fontSize: '13px', fontWeight: 700, color: '#121212', marginBottom: '4px' }}>
                        Snap or Upload Photo
                      </p>
                      <p style={{ fontSize: '11px', color: '#71717A' }}>
                        Direct upload to Supabase 'product-images' bucket
                      </p>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>

              {/* Right Column: Key Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: '#121212', display: 'block', marginBottom: '4px' }}>
                    TITLE / GARMENT NAME *
                  </label>
                  <input
                    name="title"
                    type="text"
                    required
                    value={form.title}
                    onChange={handleFormChange}
                    placeholder="e.g. Heavyweight Mineral Washed Boxy Tee"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #D4D4D8', borderRadius: '4px', fontSize: '13px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: '#121212', display: 'block', marginBottom: '4px' }}>
                      CATEGORY *
                    </label>
                    <select
                      name="category"
                      value={form.category}
                      onChange={handleFormChange}
                      style={{ width: '100%', padding: '10px', border: '1px solid #D4D4D8', borderRadius: '4px', fontSize: '13px', backgroundColor: '#FFFFFF' }}
                    >
                      <option value="t-shirts">T-Shirts</option>
                      <option value="shirts">Shirts</option>
                      <option value="hoodies">Hoodies</option>
                      <option value="jackets">Jackets</option>
                      <option value="pants">Pants</option>
                      <option value="accessories">Accessories</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: '#121212', display: 'block', marginBottom: '4px' }}>
                      CONDITION GRADE *
                    </label>
                    <select
                      name="conditionGrade"
                      value={form.conditionGrade}
                      onChange={handleFormChange}
                      style={{ width: '100%', padding: '10px', border: '1px solid #D4D4D8', borderRadius: '4px', fontSize: '13px', backgroundColor: '#FFFFFF' }}
                    >
                      <option value="New / Unused">New / Unused</option>
                      <option value="Pristine">Pristine</option>
                      <option value="Excellent - Pre-Owned">Excellent - Pre-Owned</option>
                      <option value="Vintage Distressed">Vintage Distressed</option>
                      <option value="Good Pre-Owned">Good Pre-Owned</option>
                    </select>
                  </div>
                </div>

                {/* Pricing Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: '#121212', display: 'block', marginBottom: '4px' }}>
                      SELLING PRICE (₹) *
                    </label>
                    <input
                      name="sellingPrice"
                      type="number"
                      required
                      min="1"
                      value={form.sellingPrice}
                      onChange={handleFormChange}
                      placeholder="1599"
                      style={{ width: '100%', padding: '10px', border: '1px solid #D4D4D8', borderRadius: '4px', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: '#71717A', display: 'block', marginBottom: '4px' }}>
                      ORIGINAL PRICE (₹)
                    </label>
                    <input
                      name="originalPrice"
                      type="number"
                      min="1"
                      value={form.originalPrice}
                      onChange={handleFormChange}
                      placeholder="3299"
                      style={{ width: '100%', padding: '10px', border: '1px solid #D4D4D8', borderRadius: '4px', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: '#71717A', display: 'block', marginBottom: '4px' }}>
                      INTERNAL COST (₹)
                    </label>
                    <input
                      name="internalCost"
                      type="number"
                      min="0"
                      value={form.internalCost}
                      onChange={handleFormChange}
                      placeholder="650"
                      style={{ width: '100%', padding: '10px', border: '1px solid #D4D4D8', borderRadius: '4px', fontSize: '13px' }}
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Row 2: Physical Measurements & Condition Notes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: '#121212', display: 'block', marginBottom: '6px' }}>
                  PHYSICAL MEASUREMENTS (INCHES)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: '#71717A', display: 'block', marginBottom: '2px' }}>CHEST</span>
                    <input
                      name="chest"
                      type="number"
                      step="0.5"
                      value={form.chest}
                      onChange={handleFormChange}
                      placeholder="48"
                      style={{ width: '100%', padding: '8px', border: '1px solid #D4D4D8', borderRadius: '4px', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: '#71717A', display: 'block', marginBottom: '2px' }}>LENGTH</span>
                    <input
                      name="length"
                      type="number"
                      step="0.5"
                      value={form.length}
                      onChange={handleFormChange}
                      placeholder="29"
                      style={{ width: '100%', padding: '8px', border: '1px solid #D4D4D8', borderRadius: '4px', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: '#71717A', display: 'block', marginBottom: '2px' }}>SHOULDER</span>
                    <input
                      name="shoulder"
                      type="number"
                      step="0.5"
                      value={form.shoulder}
                      onChange={handleFormChange}
                      placeholder="22"
                      style={{ width: '100%', padding: '8px', border: '1px solid #D4D4D8', borderRadius: '4px', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: '#71717A', display: 'block', marginBottom: '2px' }}>SLEEVE</span>
                    <input
                      name="sleeve"
                      type="number"
                      step="0.5"
                      value={form.sleeve}
                      onChange={handleFormChange}
                      placeholder="25"
                      style={{ width: '100%', padding: '8px', border: '1px solid #D4D4D8', borderRadius: '4px', fontSize: '12px' }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: '#121212', display: 'block', marginBottom: '6px' }}>
                  CONDITION NOTES
                </label>
                <textarea
                  name="conditionNotes"
                  rows={2}
                  value={form.conditionNotes}
                  onChange={handleFormChange}
                  placeholder="e.g. Crisp collar ribbing, natural mineral acid-wash fade, 100% unworn sample condition."
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #D4D4D8', borderRadius: '4px', fontSize: '12px', resize: 'vertical' }}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{
                width: '100%',
                height: '52px',
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '0.08em',
                backgroundColor: '#121212',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {submitting ? (
                <span>UPLOADING TO SUPABASE &amp; PUBLISHING...</span>
              ) : (
                <>
                  <PlusCircle size={18} />
                  <span>PUBLISH 1-OF-1 PIECE TO STOREFRONT</span>
                </>
              )}
            </button>
          </form>
        </section>

        {/* ========================================================
            SECTION 2: CATALOG MANAGEMENT (DELETE & AUDIT)
        ======================================================== */}
        <section style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border-subtle)',
          borderRadius: '4px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '14px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <h2 style={{
                fontSize: '16px',
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}>
                EXISTING CATALOG MANAGEMENT ({products.length})
              </h2>
              <p style={{ fontSize: '12px', color: '#71717A', marginTop: '2px' }}>
                Instant live deletion using <code>supabase.from('products').delete().eq('id', id)</code>
              </p>
            </div>

            <button
              onClick={fetchCatalog}
              disabled={loadingProducts}
              style={{
                background: '#F4F4F5',
                border: '1px solid #E4E4E7',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RefreshCw size={13} className={loadingProducts ? 'animate-spin' : ''} /> REFRESH
            </button>
          </div>

          {loadingProducts ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#71717A' }}>
              Loading products from database...
            </div>
          ) : products.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#71717A' }}>
              <p style={{ fontSize: '14px', marginBottom: '8px' }}>No products found in database.</p>
              <p style={{ fontSize: '12px' }}>Use the quick entry form above to add your first piece.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {products.map((item) => {
                const img = Array.isArray(item.images) ? item.images[0] : (item.images || '/products/man_street_hoodie.jpg');
                const cost = item.cost_price || 0;
                const price = item.selling_price || 0;
                const margin = cost > 0 ? Math.round(((price - cost) / price) * 100) : 0;

                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px',
                      border: '1px solid #E4E4E7',
                      borderRadius: '4px',
                      backgroundColor: '#FFFFFF',
                      flexWrap: 'wrap',
                      gap: '14px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <img
                        src={img}
                        alt={item.name}
                        style={{
                          width: '64px',
                          height: '80px',
                          objectFit: 'cover',
                          borderRadius: '3px',
                          backgroundColor: '#F4F4F5',
                          flexShrink: 0
                        }}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#71717A', letterSpacing: '0.06em' }}>
                            {item.sku || item.id}
                          </span>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '2px',
                            backgroundColor: item.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: item.status === 'ACTIVE' ? '#15803D' : '#B91C1C'
                          }}>
                            {item.status || 'ACTIVE'}
                          </span>
                        </div>

                        <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#121212', margin: '4px 0 2px' }}>
                          {item.name}
                        </h3>

                        <div style={{ fontSize: '11.5px', color: '#71717A', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <span>Cat: <strong>{item.category_id || 't-shirts'}</strong></span>
                          <span>Cond: <strong>{item.condition || 'New'}</strong></span>
                          {item.measurements?.chest && (
                            <span>Chest: <strong>{item.measurements.chest}"</strong></span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginLeft: 'auto' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#121212' }}>
                          ₹{price.toLocaleString('en-IN')}
                        </div>
                        {item.original_price && (
                          <div style={{ fontSize: '11px', color: '#A1A1AA', textDecoration: 'line-through' }}>
                            ₹{item.original_price.toLocaleString('en-IN')}
                          </div>
                        )}
                        {cost > 0 && (
                          <div style={{ fontSize: '10.5px', color: '#15803D', fontWeight: 700 }}>
                            Cost: ₹{cost} ({margin}% margin)
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteProduct(item)}
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.08)',
                          color: '#DC2626',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '4px',
                          padding: '8px 14px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#DC2626'; e.currentTarget.style.color = '#FFFFFF'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)'; e.currentTarget.style.color = '#DC2626'; }}
                      >
                        <Trash2 size={14} />
                        <span>DELETE</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
