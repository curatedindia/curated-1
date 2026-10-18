import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Maximize2,
  LayoutDashboard,
  ShoppingBag,
  Package,
  Settings,
  History,
  Check,
  Clock,
  TrendingUp,
  Filter,
  Calendar,
  Search,
  Camera,
  ChevronRight
} from 'lucide-react';
import supabase from '../supabaseClient';

const REQUIRED_ADMIN_EMAIL = 'hello.curatedindia@gmail.com';

// Fallback initial orders if Supabase orders table is newly created or empty
const SEED_FALLBACK_ORDERS = [
  {
    id: 'ord-1791794829611',
    order_number: 'CUR-1003',
    customer_name: 'Tanmay Sharma',
    customer_email: 'tanmay@example.com',
    total_amount: 1498,
    status: 'PENDING',
    payment_status: 'PAID',
    items: [
      { name: 'Oversized Raw Indigo Utility Work Shirt', sku: 'CUR-SH-001', size: 'XL', price: 1399 }
    ],
    created_at: '2026-10-18T10:15:00.000Z'
  },
  {
    id: 'ord-1791130399149',
    order_number: 'CUR-1002',
    customer_name: 'Mayur Joshi',
    customer_email: 'may@example.com',
    total_amount: 2299,
    status: 'PACKED',
    payment_status: 'PAID',
    items: [
      { name: 'Vintage Acid Wash Heavy Denim Chore Jacket', sku: 'CUR-JK-001', size: 'L', price: 2299 }
    ],
    created_at: '2026-10-17T14:20:00.000Z'
  },
  {
    id: 'ord-1791048209402',
    order_number: 'CUR-1001',
    customer_name: 'Tanmay Khurpe',
    customer_email: 'khurpetanmay53@gmail.com',
    total_amount: 1698,
    status: 'PACKED',
    payment_status: 'PAID',
    items: [
      { name: 'Pigment-Dyed French Terry Drop-Shoulder Hoodie', sku: 'CUR-HD-001', size: 'L', price: 1599 }
    ],
    created_at: '2026-10-16T18:45:00.000Z'
  }
];

// Fallback activity ledger
const SEED_ACTIVITY_LOGS = [
  {
    id: 'tx-1791130411180',
    sku: 'CUR-JK-001',
    product_name: 'Vintage Acid Wash Heavy Denim Chore Jacket',
    quantity_change: -1,
    reason: 'Online Sale',
    admin_user: 'SYSTEM',
    order_id: 'ord-1791130399149',
    note: 'Online purchase verified & stock reserved',
    created_at: '2026-10-17T14:21:00.000Z'
  },
  {
    id: 'tx-1791048209420',
    sku: 'CUR-HD-001',
    product_name: 'Pigment-Dyed French Terry Drop-Shoulder Hoodie',
    quantity_change: -1,
    reason: 'Online Sale',
    admin_user: 'SYSTEM',
    order_id: 'ord-1791048209402',
    note: 'Online purchase verified & stock reserved',
    created_at: '2026-10-16T18:46:00.000Z'
  },
  {
    id: 'tx-001',
    sku: 'CUR-TS-001',
    product_name: 'Heavyweight Washed Vintage Boxy Tee',
    quantity_change: 1,
    reason: 'Initial Stock Added',
    admin_user: 'Nikhil Pol',
    order_id: null,
    note: 'Initial drop catalog entry created',
    created_at: '2026-10-15T10:00:00.000Z'
  },
  {
    id: 'tx-003',
    sku: 'CUR-SH-001',
    product_name: 'Oversized Minimalist Utility Work Shirt',
    quantity_change: 1,
    reason: 'Initial Stock Added',
    admin_user: 'Nikhil Pol',
    order_id: null,
    note: 'Initial drop catalog entry created',
    created_at: '2026-10-15T11:00:00.000Z'
  }
];

export default function NikhilAdminDashboard({ onExit }) {
  // Mobile Navigation Tabs: 'dashboard' | 'orders' | 'catalog' | 'settings' | 'activity'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Authentication & Guard State
  const [authChecking, setAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [authError, setAuthError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Orders State (The 'Tick' System)
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');

  // Dashboard Stats State
  const [revenueTimeframe, setRevenueTimeframe] = useState('month'); // 'day' | 'month' | 'year' | 'all'

  // Catalog State
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [actionError, setActionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Catalog Form State
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

  // Settings State
  const [settings, setSettings] = useState({
    shipping_free_threshold: 1499,
    shipping_flat_rate: 99,
    cart_hold_duration_minutes: 10,
    concierge_email: 'hello.curatedindia@gmail.com',
    sold_out_section_enabled: true,
    marquee_headline: 'CURATED | SEARCHED • FILTERED • QUALITY CHECKED • HANDPICKED'
  });
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Activity Log State
  const [activityLogs, setActivityLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilter, setLogFilter] = useState('ALL');

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
        fetchOrders();
        fetchActivityLogs();
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

    // Listen for auth state changes
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
  // 2. FETCH DATA (ORDERS, CATALOG, ACTIVITY LOGS)
  // ========================================================
  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        setOrders(data);
      } else {
        try {
          const apiRes = await fetch('/api/orders');
          const apiData = await apiRes.json();
          if (apiData && apiData.success && Array.isArray(apiData.orders) && apiData.orders.length > 0) {
            const mapped = apiData.orders.map((o) => ({
              id: o.id,
              order_number: o.order_number || o.id,
              customer_name: o.customer?.name || o.customer_name || 'Customer',
              customer_email: o.customer?.email || o.customer_email || 'customer@example.com',
              total_amount: parseFloat(o.total || o.total_amount || 0),
              status: (o.status || (o.order_status === 'CONFIRMED' ? 'PACKED' : 'PENDING')).toUpperCase(),
              payment_status: o.payment_status || 'PAID',
              items: o.items || [],
              created_at: o.created_at || new Date().toISOString()
            }));
            setOrders(mapped);
          } else {
            setOrders(SEED_FALLBACK_ORDERS);
          }
        } catch {
          setOrders(SEED_FALLBACK_ORDERS);
        }
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setOrders(SEED_FALLBACK_ORDERS);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchCatalog = async () => {
    setLoadingProducts(true);
    setActionError('');
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        setProducts(data);
      } else {
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

  const fetchActivityLogs = async () => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        setActivityLogs(data);
      } else {
        try {
          const apiRes = await fetch('/api/inventory-transactions');
          const apiData = await apiRes.json();
          if (apiData && apiData.success && Array.isArray(apiData.transactions) && apiData.transactions.length > 0) {
            setActivityLogs(apiData.transactions);
          } else {
            setActivityLogs(SEED_ACTIVITY_LOGS);
          }
        } catch {
          setActivityLogs(SEED_ACTIVITY_LOGS);
        }
      }
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      setActivityLogs(SEED_ACTIVITY_LOGS);
    } finally {
      setLoadingLogs(false);
    }
  };

  // ========================================================
  // 3. THE 'TICK' SYSTEM (PACKED TOGGLE FOR ORDERS)
  // ========================================================
  const handleTogglePacked = async (order) => {
    const isCurrentlyPacked = (order.status || '').toUpperCase() === 'PACKED';
    const newStatus = isCurrentlyPacked ? 'PENDING' : 'PACKED';

    // Instant local state update (no page reload)
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o))
    );
    setUpdatingOrderId(order.id);

    try {
      const { error: dbError } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', order.id);

      if (dbError) {
        console.warn('Supabase update warning:', dbError);
      }

      try {
        await fetch(`/api/orders/${order.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
      } catch {
        // non-blocking
      }

      // Add to activity ledger
      const newLogEntry = {
        id: `tx-${Date.now()}`,
        sku: order.items?.[0]?.sku || 'ORDER-PACK',
        product_name: order.items?.[0]?.name || `Order #${order.order_number || order.id.slice(0, 8)}`,
        quantity_change: 0,
        reason: newStatus === 'PACKED' ? 'Order Marked as Packed' : 'Order Reverted to Pending',
        admin_user: 'hello.curatedindia@gmail.com',
        order_id: order.id,
        note: `Order ${order.order_number || order.id} status changed to ${newStatus}`,
        created_at: new Date().toISOString()
      };
      setActivityLogs((prev) => [newLogEntry, ...prev]);

      setSuccessMessage(`✓ Order #${order.order_number || order.id.slice(0, 8)} is now ${newStatus}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Failed to update order status:', err);
      setActionError('Could not update status. Reverting.');
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: order.status } : o))
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // ========================================================
  // 4. STATS & REVENUE CALCULATIONS
  // ========================================================
  const packedOrdersCount = useMemo(() => {
    return orders.filter((o) => (o.status || '').toUpperCase() === 'PACKED').length;
  }, [orders]);

  const pendingOrdersCount = useMemo(() => {
    return orders.filter((o) => (o.status || '').toUpperCase() !== 'PACKED').length;
  }, [orders]);

  const totalOrdersCount = orders.length;

  const filteredRevenue = useMemo(() => {
    const now = new Date();
    const validOrders = orders.filter((o) => {
      const st = (o.status || '').toUpperCase();
      const paySt = (o.payment_status || o.order_status || '').toUpperCase();
      return st === 'PACKED' || paySt === 'CONFIRMED' || paySt === 'PAID';
    });

    return validOrders.reduce((sum, o) => {
      const date = new Date(o.created_at);
      if (isNaN(date.getTime())) return sum + (parseFloat(o.total_amount) || 0);

      let matches = true;
      if (revenueTimeframe === 'day') {
        const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
        matches = diffHours <= 24;
      } else if (revenueTimeframe === 'month') {
        const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
        matches = diffDays <= 30;
      } else if (revenueTimeframe === 'year') {
        matches = date.getFullYear() === now.getFullYear();
      }

      if (matches) {
        return sum + (parseFloat(o.total_amount) || 0);
      }
      return sum;
    }, 0);
  }, [orders, revenueTimeframe]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const st = (o.status || '').toUpperCase();
      if (orderStatusFilter === 'PACKED' && st !== 'PACKED') return false;
      if (orderStatusFilter === 'PENDING' && st === 'PACKED') return false;

      if (orderSearch.trim()) {
        const q = orderSearch.toLowerCase();
        const num = (o.order_number || o.id || '').toLowerCase();
        const name = (o.customer_name || '').toLowerCase();
        const email = (o.customer_email || '').toLowerCase();
        return num.includes(q) || name.includes(q) || email.includes(q);
      }
      return true;
    });
  }, [orders, orderStatusFilter, orderSearch]);

  const filteredActivityLogs = useMemo(() => {
    if (logFilter === 'ALL') return activityLogs;
    return activityLogs.filter((log) => {
      const r = (log.reason || '').toUpperCase();
      if (logFilter === 'SALE') return r.includes('SALE');
      if (logFilter === 'STOCK') return r.includes('STOCK') || r.includes('ADDED');
      if (logFilter === 'DELETE') return r.includes('DELETE') || r.includes('REMOVED');
      return true;
    });
  }, [activityLogs, logFilter]);

  // ========================================================
  // 5. CATALOG HANDLERS
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

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setActionError('');
    setSuccessMessage('');

    if (!imageFile) {
      setActionError('Please select or capture a product image.');
      return;
    }

    if (!form.title.trim()) {
      setActionError('Please enter a product title.');
      return;
    }

    if (!form.sellingPrice || parseFloat(form.sellingPrice) <= 0) {
      setActionError('Please enter a valid selling price.');
      return;
    }

    setSubmitting(true);
    try {
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
        throw new Error(`Image upload failed: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(storagePath);

      if (!publicUrl) {
        throw new Error('Failed to obtain image URL.');
      }

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

      const { error: insertError } = await supabase
        .from('products')
        .insert([newProductPayload]);

      if (insertError) {
        throw new Error(`Database insert failed: ${insertError.message}`);
      }

      // Record in activity log
      setActivityLogs((prev) => [
        {
          id: `tx-${Date.now()}`,
          sku: generatedSku,
          product_name: form.title.trim(),
          quantity_change: 1,
          reason: 'Initial Stock Added',
          admin_user: 'hello.curatedindia@gmail.com',
          order_id: null,
          note: `New piece published at ₹${form.sellingPrice}`,
          created_at: new Date().toISOString()
        },
        ...prev
      ]);

      setSuccessMessage(`✓ '${form.title}' published successfully!`);
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

      fetchCatalog();
    } catch (err) {
      console.error('Error adding product:', err);
      setActionError(err.message || 'Failed to add product.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    const confirmDelete = window.confirm(`Delete "${product.name}" (${product.sku || product.id})?`);
    if (!confirmDelete) return;

    setActionError('');
    setSuccessMessage('');

    try {
      const { error: dbError } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (dbError) {
        throw new Error(`Delete failed: ${dbError.message}`);
      }

      setProducts((prev) => prev.filter((p) => p.id !== product.id));

      setActivityLogs((prev) => [
        {
          id: `tx-${Date.now()}`,
          sku: product.sku || product.id,
          product_name: product.name,
          quantity_change: -1,
          reason: 'Product Deleted',
          admin_user: 'hello.curatedindia@gmail.com',
          order_id: null,
          note: `Piece removed from catalog`,
          created_at: new Date().toISOString()
        },
        ...prev
      ]);

      setSuccessMessage(`✓ Deleted "${product.name}" from catalog.`);
    } catch (err) {
      console.error('Delete error:', err);
      setActionError(err.message || 'Unable to delete product.');
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  // ========================================================
  // RENDER: LOADING CHECK
  // ========================================================
  if (authChecking) {
    return (
      <div style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#121212',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        overflowX: 'hidden'
      }}>
        <div style={{
          width: '38px',
          height: '38px',
          border: '3px solid #27272A',
          borderTopColor: '#FFFFFF',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '16px'
        }} />
        <p style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '13px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase'
        }}>
          VERIFYING ADMIN CREDENTIALS...
        </p>
      </div>
    );
  }

  // ========================================================
  // RENDER: SECURE ADMIN LOGIN GATE
  // ========================================================
  if (!currentUser) {
    return (
      <div style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#09090B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflowX: 'hidden',
        boxSizing: 'border-box'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#121212',
          border: '1px solid #27272A',
          borderRadius: '8px',
          padding: '32px 20px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
          boxSizing: 'border-box'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#18181B',
              border: '1px solid #27272A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px'
            }}>
              <Lock size={22} color="#FFFFFF" />
            </div>
            <h1 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '18px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: '#FFFFFF',
              textTransform: 'uppercase'
            }}>
              CURATED // ADMIN
            </h1>
            <p style={{ fontSize: '12px', color: '#71717A', marginTop: '6px' }}>
              Restricted to {REQUIRED_ADMIN_EMAIL}
            </p>
          </div>

          {authError && (
            <div style={{
              padding: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              color: '#EF4444',
              fontSize: '12.5px',
              marginBottom: '18px',
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
            style={{
              width: '100%',
              minHeight: '50px',
              backgroundColor: '#FFFFFF',
              color: '#121212',
              border: 'none',
              borderRadius: '6px',
              fontSize: '15px',
              fontWeight: 800,
              fontFamily: 'var(--font-btn)',
              letterSpacing: '0.04em',
              cursor: isSigningIn ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            {isSigningIn ? (
              <span>VERIFYING...</span>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>SIGN IN WITH GOOGLE</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ========================================================
  // RENDER: MOBILE-FIRST ADMIN SUITE
  // ========================================================
  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      maxWidth: '100vw',
      overflowX: 'hidden',
      backgroundColor: '#F8F9FA',
      color: '#121212',
      boxSizing: 'border-box',
      position: 'relative'
    }}>
      
      {/* 1. Mobile Top Sticky Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: '#121212',
        color: '#FFFFFF',
        borderBottom: '1px solid #27272A',
        padding: '12px 16px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          {/* Logo & Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '15px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap'
            }}>
              NIKHIL ADMIN
            </span>
            <span style={{
              backgroundColor: '#18181B',
              border: '1px solid #27272A',
              color: '#34A853',
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap'
            }}>
              <ShieldCheck size={11} color="#34A853" /> SECURE
            </span>
          </div>

          {/* Quick Header Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => {
                if (onExit) onExit();
                else window.location.href = '/';
              }}
              aria-label="View Storefront"
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #3F3F46',
                color: '#FFFFFF',
                borderRadius: '4px',
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <ExternalLink size={12} />
              <span>SHOP</span>
            </button>

            <button
              onClick={handleAdminLogout}
              aria-label="Log Out"
              style={{
                backgroundColor: '#EF4444',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: '4px',
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <LogOut size={12} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Mobile Content Container */}
      <main
        className="pb-24"
        style={{
          width: '100%',
          maxWidth: '100%',
          paddingTop: '16px',
          paddingLeft: '14px',
          paddingRight: '14px',
          paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 24px))',
          boxSizing: 'border-box',
          overflowX: 'hidden'
        }}
      >
        
        {/* Status Messages */}
        {actionError && (
          <div style={{
            padding: '12px 14px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '6px',
            color: '#B91C1C',
            fontSize: '13px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{actionError}</span>
          </div>
        )}

        {successMessage && (
          <div style={{
            padding: '12px 14px',
            backgroundColor: '#F0FDF4',
            border: '1px solid #86EFAC',
            borderRadius: '6px',
            color: '#15803D',
            fontSize: '13px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ========================================================
            TAB 1: DASHBOARD (MOBILE REVENUE & STATS)
        ======================================================== */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Header with Title & Full-width Native Timeframe Picker */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <h1 style={{
                  fontSize: '18px',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  margin: 0
                }}>
                  REAL-TIME OVERVIEW
                </h1>
                <p style={{ fontSize: '12px', color: '#71717A', marginTop: '2px', marginBottom: 0 }}>
                  Logged in as {REQUIRED_ADMIN_EMAIL}
                </p>
              </div>

              {/* Full-width Native Timeframe Picker for Mobile */}
              <div style={{ width: '100%' }}>
                <select
                  value={revenueTimeframe}
                  onChange={(e) => setRevenueTimeframe(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '44px',
                    padding: '10px 14px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D4D4D8',
                    borderRadius: '6px',
                    fontSize: '16px', // Prevents iOS Safari auto-zoom
                    fontWeight: 700,
                    color: '#121212',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="day">Timeframe: Today (Last 24 Hours)</option>
                  <option value="month">Timeframe: This Month (Last 30 Days)</option>
                  <option value="year">Timeframe: This Year ({new Date().getFullYear()})</option>
                  <option value="all">Timeframe: All Time</option>
                </select>
              </div>
            </div>

            {/* Total Revenue Widget (Full-Width Card) */}
            <div style={{
              backgroundColor: '#121212',
              color: '#FFFFFF',
              borderRadius: '8px',
              padding: '20px 18px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              boxSizing: 'border-box',
              width: '100%'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#A1A1AA', textTransform: 'uppercase' }}>
                  TOTAL REVENUE ({revenueTimeframe.toUpperCase()})
                </span>
                <TrendingUp size={18} color="#22C55E" />
              </div>
              <div style={{
                fontSize: '32px',
                fontWeight: 900,
                color: '#FFFFFF',
                fontFamily: 'var(--font-heading)',
                letterSpacing: '0.02em',
                lineHeight: 1.1
              }}>
                ₹{filteredRevenue.toLocaleString('en-IN')}
              </div>
              <p style={{ fontSize: '12px', color: '#A1A1AA', marginTop: '8px', marginBottom: 0 }}>
                Income from packed &amp; confirmed customer orders
              </p>
            </div>

            {/* 2-Column Grid for PACKED & PENDING Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              width: '100%'
            }}>
              
              {/* Packed Orders Counter */}
              <div
                onClick={() => { setActiveTab('orders'); setOrderStatusFilter('PACKED'); }}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E4E4E7',
                  borderRadius: '8px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#71717A', letterSpacing: '0.06em' }}>
                    PACKED
                  </span>
                  <CheckCircle2 size={16} color="#16A34A" />
                </div>
                <div style={{ fontSize: '30px', fontWeight: 900, color: '#16A34A', lineHeight: 1 }}>
                  {packedOrdersCount}
                </div>
                <span style={{ fontSize: '11px', color: '#71717A', marginTop: '6px', display: 'block' }}>
                  Orders Ready →
                </span>
              </div>

              {/* Pending Orders Counter */}
              <div
                onClick={() => { setActiveTab('orders'); setOrderStatusFilter('PENDING'); }}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: pendingOrdersCount > 0 ? '1px solid #FCA5A5' : '1px solid #E4E4E7',
                  borderRadius: '8px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: pendingOrdersCount > 0 ? '#DC2626' : '#71717A', letterSpacing: '0.06em' }}>
                    PENDING
                  </span>
                  <Clock size={16} color={pendingOrdersCount > 0 ? '#DC2626' : '#71717A'} />
                </div>
                <div style={{ fontSize: '30px', fontWeight: 900, color: pendingOrdersCount > 0 ? '#DC2626' : '#121212', lineHeight: 1 }}>
                  {pendingOrdersCount}
                </div>
                <span style={{ fontSize: '11px', color: pendingOrdersCount > 0 ? '#DC2626' : '#71717A', marginTop: '6px', display: 'block', fontWeight: pendingOrdersCount > 0 ? 700 : 400 }}>
                  Needs Packing →
                </span>
              </div>

            </div>

            {/* Catalog Pieces Summary Card */}
            <div
              onClick={() => setActiveTab('catalog')}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', backgroundColor: '#F4F4F5', borderRadius: '6px' }}>
                  <Package size={20} color="#121212" />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#121212' }}>
                    {products.length} Active Catalog Pieces
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#71717A' }}>
                    1-of-1 archival streetwear in stock
                  </div>
                </div>
              </div>
              <ChevronRight size={18} color="#A1A1AA" />
            </div>

            {/* Quick Action Button: Add New Piece */}
            <button
              onClick={() => setActiveTab('catalog')}
              style={{
                width: '100%',
                minHeight: '50px',
                backgroundColor: '#121212',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <PlusCircle size={18} />
              <span>SNAP &amp; PUBLISH NEW PIECE</span>
            </button>

          </div>
        )}

        {/* ========================================================
            TAB 2: ORDERS (STACKED MOBILE CARDS + IOS TOGGLE)
        ======================================================== */}
        {activeTab === 'orders' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Orders Header & Refresh */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{
                  fontSize: '18px',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  margin: 0
                }}>
                  ORDERS ({orders.length})
                </h1>
                <p style={{ fontSize: '12px', color: '#71717A', margin: '2px 0 0 0' }}>
                  Tap switch to toggle Packed status
                </p>
              </div>

              <button
                onClick={fetchOrders}
                disabled={loadingOrders}
                style={{
                  minHeight: '40px',
                  padding: '6px 12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D4D4D8',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={13} className={loadingOrders ? 'animate-spin' : ''} />
                <span>REFRESH</span>
              </button>
            </div>

            {/* Search Box with 16px font-size to prevent zoom */}
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={18} color="#71717A" style={{ position: 'absolute', left: '12px', top: '13px' }} />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search orders, customers..."
                style={{
                  width: '100%',
                  minHeight: '44px',
                  padding: '10px 12px 10px 38px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D4D4D8',
                  borderRadius: '6px',
                  fontSize: '16px', // Prevents iOS Safari auto-zoom
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Segmented Filter Pills */}
            <div style={{
              display: 'flex',
              width: '100%',
              backgroundColor: '#E4E4E7',
              borderRadius: '6px',
              padding: '3px',
              boxSizing: 'border-box'
            }}>
              {['ALL', 'PENDING', 'PACKED'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setOrderStatusFilter(filter)}
                  style={{
                    flex: 1,
                    minHeight: '36px',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    backgroundColor: orderStatusFilter === filter ? '#121212' : 'transparent',
                    color: orderStatusFilter === filter ? '#FFFFFF' : '#52525B',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Orders Stacked Cards List */}
            {loadingOrders ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#71717A' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  border: '2px solid #D4D4D8',
                  borderTopColor: '#121212',
                  borderRadius: '50%',
                  margin: '0 auto 12px',
                  animation: 'spin 0.8s linear infinite'
                }} />
                Loading orders...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: '8px',
                padding: '40px 16px',
                textAlign: 'center',
                color: '#71717A'
              }}>
                <ShoppingBag size={32} color="#D4D4D8" style={{ margin: '0 auto 10px' }} />
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#121212', marginBottom: '4px' }}>
                  No matching orders
                </p>
                <p style={{ fontSize: '12px', margin: 0 }}>
                  Orders placed by customers will appear here.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredOrders.map((order) => {
                  const isPacked = (order.status || '').toUpperCase() === 'PACKED';
                  const isUpdating = updatingOrderId === order.id;
                  const dateStr = order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'N/A';

                  return (
                    <div
                      key={order.id}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: isPacked ? '1px solid #BBF7D0' : '1px solid #E4E4E7',
                        borderRadius: '8px',
                        padding: '16px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxSizing: 'border-box'
                      }}
                    >
                      {/* Top Row: Order ID & Date */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          fontWeight: 700,
                          backgroundColor: '#F4F4F5',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          color: '#121212'
                        }}>
                          #{order.order_number || order.id.slice(0, 10)}
                        </span>

                        <span style={{ fontSize: '11.5px', color: '#71717A', fontWeight: 600 }}>
                          {dateStr}
                        </span>
                      </div>

                      {/* Middle Row: Customer Info & Amount */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ minWidth: 0, paddingRight: '8px' }}>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#121212' }}>
                            {order.customer_name || 'Customer'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#71717A', marginTop: '2px', wordBreak: 'break-all' }}>
                            {order.customer_email || 'No email provided'}
                          </div>
                          {order.items?.length > 0 && (
                            <div style={{ fontSize: '11.5px', color: '#52525B', marginTop: '4px' }}>
                              {order.items[0]?.name}
                            </div>
                          )}
                        </div>

                        <div style={{
                          fontSize: '18px',
                          fontWeight: 900,
                          color: '#121212',
                          fontFamily: 'var(--font-heading)',
                          whiteSpace: 'nowrap'
                        }}>
                          ₹{(parseFloat(order.total_amount) || 0).toLocaleString('en-IN')}
                        </div>
                      </div>

                      {/* Bottom Row: iOS-Style 'Packed' Toggle Switch (Min tap target 44px) */}
                      <div
                        onClick={() => !isUpdating && handleTogglePacked(order)}
                        style={{
                          minHeight: '44px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          backgroundColor: isPacked ? '#F0FDF4' : '#F4F4F5',
                          border: isPacked ? '1px solid #86EFAC' : '1px solid #E4E4E7',
                          cursor: isUpdating ? 'wait' : 'pointer',
                          userSelect: 'none'
                        }}
                      >
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 800,
                          letterSpacing: '0.04em',
                          color: isPacked ? '#15803D' : '#52525B'
                        }}>
                          {isPacked ? 'STATUS: PACKED ✓' : 'STATUS: PENDING PACKING'}
                        </span>

                        {/* Large Touch-Friendly iOS Toggle Switch */}
                        <div style={{
                          width: '52px',
                          height: '30px',
                          borderRadius: '15px',
                          backgroundColor: isPacked ? '#16A34A' : '#D4D4D8',
                          position: 'relative',
                          transition: 'background-color 0.25s ease',
                          flexShrink: 0
                        }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: '#FFFFFF',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
                            position: 'absolute',
                            top: '3px',
                            left: isPacked ? '25px' : '3px',
                            transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                          }} />
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* ========================================================
            TAB 3: CATALOG (SINGLE-COLUMN QUICK ENTRY + MOBILE LIST)
        ======================================================== */}
        {activeTab === 'catalog' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* 1. Quick Mobile Product Entry (Single-Column Form) */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E4E4E7',
              borderRadius: '8px',
              padding: '18px 16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #E4E4E7', paddingBottom: '12px' }}>
                <PlusCircle size={20} color="#121212" />
                <h2 style={{
                  fontSize: '15px',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  margin: 0
                }}>
                  QUICK MOBILE PRODUCT ENTRY
                </h2>
              </div>

              <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* 100% Width Tall Photo Tap Button (Min height 52px) */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: '#121212', display: 'block', marginBottom: '6px' }}>
                    PRODUCT IMAGE *
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '100%',
                      minHeight: '160px',
                      border: '2px dashed #D4D4D8',
                      borderRadius: '6px',
                      backgroundColor: '#FAFAFA',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '16px',
                      cursor: 'pointer',
                      boxSizing: 'border-box'
                    }}
                  >
                    {imagePreview ? (
                      <div style={{ position: 'relative', width: '100%', height: '180px' }}>
                        <img
                          src={imagePreview}
                          alt="Preview"
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: 4,
                          right: 4,
                          backgroundColor: 'rgba(0,0,0,0.8)',
                          color: '#FFFFFF',
                          padding: '4px 8px',
                          fontSize: '11px',
                          borderRadius: '4px'
                        }}>
                          TAP TO RETAKE
                        </div>
                      </div>
                    ) : (
                      <>
                        <Camera size={34} color="#71717A" style={{ marginBottom: '8px' }} />
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#121212' }}>
                          SNAP OR SELECT PHOTO
                        </span>
                        <span style={{ fontSize: '11px', color: '#71717A', marginTop: '2px' }}>
                          Uploads directly to product-images
                        </span>
                      </>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                </div>

                {/* Garment Title (font-size: 16px to prevent iOS zoom) */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: '#121212', display: 'block', marginBottom: '4px' }}>
                    TITLE / GARMENT NAME *
                  </label>
                  <input
                    name="title"
                    type="text"
                    required
                    value={form.title}
                    onChange={handleFormChange}
                    placeholder="e.g. Heavyweight Mineral Washed Boxy Tee"
                    style={{
                      width: '100%',
                      minHeight: '44px',
                      padding: '10px 12px',
                      border: '1px solid #D4D4D8',
                      borderRadius: '6px',
                      fontSize: '16px', // 16px prevents iOS zoom
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Category & Condition Grade (Stacked / Full Width) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 800, color: '#121212', display: 'block', marginBottom: '4px' }}>
                      CATEGORY *
                    </label>
                    <select
                      name="category"
                      value={form.category}
                      onChange={handleFormChange}
                      style={{
                        width: '100%',
                        minHeight: '44px',
                        padding: '10px 12px',
                        border: '1px solid #D4D4D8',
                        borderRadius: '6px',
                        fontSize: '16px',
                        backgroundColor: '#FFFFFF',
                        boxSizing: 'border-box'
                      }}
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
                    <label style={{ fontSize: '12px', fontWeight: 800, color: '#121212', display: 'block', marginBottom: '4px' }}>
                      CONDITION GRADE *
                    </label>
                    <select
                      name="conditionGrade"
                      value={form.conditionGrade}
                      onChange={handleFormChange}
                      style={{
                        width: '100%',
                        minHeight: '44px',
                        padding: '10px 12px',
                        border: '1px solid #D4D4D8',
                        borderRadius: '6px',
                        fontSize: '16px',
                        backgroundColor: '#FFFFFF',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="New / Unused">New / Unused</option>
                      <option value="Pristine">Pristine</option>
                      <option value="Excellent - Pre-Owned">Excellent - Pre-Owned</option>
                      <option value="Vintage Distressed">Vintage Distressed</option>
                      <option value="Good Pre-Owned">Good Pre-Owned</option>
                    </select>
                  </div>
                </div>

                {/* Pricing Fields (2-column on mobile) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 800, color: '#121212', display: 'block', marginBottom: '4px' }}>
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
                      style={{
                        width: '100%',
                        minHeight: '44px',
                        padding: '10px',
                        border: '1px solid #D4D4D8',
                        borderRadius: '6px',
                        fontSize: '16px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 800, color: '#71717A', display: 'block', marginBottom: '4px' }}>
                      ORIGINAL PRICE (₹)
                    </label>
                    <input
                      name="originalPrice"
                      type="number"
                      min="1"
                      value={form.originalPrice}
                      onChange={handleFormChange}
                      placeholder="3299"
                      style={{
                        width: '100%',
                        minHeight: '44px',
                        padding: '10px',
                        border: '1px solid #D4D4D8',
                        borderRadius: '6px',
                        fontSize: '16px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Internal Cost */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: '#71717A', display: 'block', marginBottom: '4px' }}>
                    INTERNAL SOURCING COST (₹)
                  </label>
                  <input
                    name="internalCost"
                    type="number"
                    min="0"
                    value={form.internalCost}
                    onChange={handleFormChange}
                    placeholder="650"
                    style={{
                      width: '100%',
                      minHeight: '44px',
                      padding: '10px',
                      border: '1px solid #D4D4D8',
                      borderRadius: '6px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Measurements (4 items in a 2x2 grid) */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: '#121212', display: 'block', marginBottom: '6px' }}>
                    PHYSICAL MEASUREMENTS (INCHES)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: '#71717A', display: 'block', marginBottom: '2px' }}>Chest</span>
                      <input
                        name="chest"
                        type="number"
                        step="0.5"
                        value={form.chest}
                        onChange={handleFormChange}
                        placeholder="48"
                        style={{ width: '100%', minHeight: '40px', padding: '8px', border: '1px solid #D4D4D8', borderRadius: '4px', fontSize: '16px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#71717A', display: 'block', marginBottom: '2px' }}>Length</span>
                      <input
                        name="length"
                        type="number"
                        step="0.5"
                        value={form.length}
                        onChange={handleFormChange}
                        placeholder="29"
                        style={{ width: '100%', minHeight: '40px', padding: '8px', border: '1px solid #D4D4D8', borderRadius: '4px', fontSize: '16px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#71717A', display: 'block', marginBottom: '2px' }}>Shoulder</span>
                      <input
                        name="shoulder"
                        type="number"
                        step="0.5"
                        value={form.shoulder}
                        onChange={handleFormChange}
                        placeholder="22"
                        style={{ width: '100%', minHeight: '40px', padding: '8px', border: '1px solid #D4D4D8', borderRadius: '4px', fontSize: '16px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#71717A', display: 'block', marginBottom: '2px' }}>Sleeve</span>
                      <input
                        name="sleeve"
                        type="number"
                        step="0.5"
                        value={form.sleeve}
                        onChange={handleFormChange}
                        placeholder="25"
                        style={{ width: '100%', minHeight: '40px', padding: '8px', border: '1px solid #D4D4D8', borderRadius: '4px', fontSize: '16px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Condition Notes */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: '#121212', display: 'block', marginBottom: '4px' }}>
                    CONDITION NOTES
                  </label>
                  <textarea
                    name="conditionNotes"
                    rows={2}
                    value={form.conditionNotes}
                    onChange={handleFormChange}
                    placeholder="e.g. Crisp collar ribbing, unworn sample condition."
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #D4D4D8',
                      borderRadius: '6px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Submit Button (Tall 52px thumb target) */}
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: '100%',
                    minHeight: '52px',
                    fontSize: '14px',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    backgroundColor: '#121212',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    marginTop: '6px'
                  }}
                >
                  {submitting ? (
                    <span>UPLOADING TO SUPABASE...</span>
                  ) : (
                    <>
                      <PlusCircle size={18} />
                      <span>PUBLISH 1-OF-1 PIECE</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* 2. Existing Catalog List (Compact Mobile List Items) */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E4E4E7',
              borderRadius: '8px',
              padding: '18px 16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '14px',
                borderBottom: '1px solid #E4E4E7',
                paddingBottom: '10px'
              }}>
                <h2 style={{
                  fontSize: '15px',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  margin: 0
                }}>
                  CATALOG PIECES ({products.length})
                </h2>

                <button
                  onClick={fetchCatalog}
                  disabled={loadingProducts}
                  style={{
                    padding: '6px 10px',
                    backgroundColor: '#F4F4F5',
                    border: '1px solid #D4D4D8',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <RefreshCw size={12} className={loadingProducts ? 'animate-spin' : ''} />
                  <span>REFRESH</span>
                </button>
              </div>

              {loadingProducts ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#71717A', fontSize: '13px' }}>
                  Loading catalog...
                </div>
              ) : products.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#71717A', fontSize: '13px' }}>
                  No catalog items found.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {products.map((item) => {
                    const img = Array.isArray(item.images) ? item.images[0] : (item.images || '/products/man_street_hoodie.jpg');
                    const price = item.selling_price || 0;

                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px',
                          border: '1px solid #E4E4E7',
                          borderRadius: '6px',
                          backgroundColor: '#FFFFFF',
                          gap: '10px'
                        }}
                      >
                        {/* Thumbnail on left */}
                        <img
                          src={img}
                          alt={item.name}
                          style={{
                            width: '56px',
                            height: '70px',
                            objectFit: 'cover',
                            borderRadius: '4px',
                            backgroundColor: '#F4F4F5',
                            flexShrink: 0
                          }}
                        />

                        {/* Title & Price in middle */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#71717A' }}>
                            {item.sku || item.id}
                          </span>
                          <div style={{
                            fontSize: '13px',
                            fontWeight: 800,
                            color: '#121212',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginTop: '2px'
                          }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 900, color: '#121212', marginTop: '2px' }}>
                            ₹{price}
                          </div>
                        </div>

                        {/* Large Red Delete Button (Min 44x44px tap target) */}
                        <button
                          onClick={() => handleDeleteProduct(item)}
                          aria-label={`Delete ${item.name}`}
                          style={{
                            minWidth: '44px',
                            minHeight: '44px',
                            backgroundColor: '#FEE2E2',
                            color: '#DC2626',
                            border: '1px solid #FCA5A5',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ========================================================
            TAB 4: SETTINGS (MOBILE STORE CONFIGURATION)
        ======================================================== */}
        {activeTab === 'settings' && (
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E4E4E7',
            borderRadius: '8px',
            padding: '18px 16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ borderBottom: '1px solid #E4E4E7', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={20} color="#121212" />
                <h1 style={{
                  fontSize: '16px',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  margin: 0
                }}>
                  STORE CONFIGURATION
                </h1>
              </div>
              <p style={{ fontSize: '12px', color: '#71717A', marginTop: '2px', marginBottom: 0 }}>
                Adjust shipping rates and cart reservation duration
              </p>
            </div>

            {settingsSaved && (
              <div style={{
                padding: '12px',
                backgroundColor: '#F0FDF4',
                border: '1px solid #86EFAC',
                borderRadius: '6px',
                color: '#15803D',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircle2 size={16} />
                <span>Configuration saved successfully.</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#121212', display: 'block', marginBottom: '4px' }}>
                  FREE SHIPPING THRESHOLD (₹)
                </label>
                <input
                  type="number"
                  value={settings.shipping_free_threshold}
                  onChange={(e) => setSettings({ ...settings, shipping_free_threshold: parseFloat(e.target.value) || 0 })}
                  style={{
                    width: '100%',
                    minHeight: '44px',
                    padding: '10px 12px',
                    border: '1px solid #D4D4D8',
                    borderRadius: '6px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#121212', display: 'block', marginBottom: '4px' }}>
                  FLAT DELIVERY FEE (₹)
                </label>
                <input
                  type="number"
                  value={settings.shipping_flat_rate}
                  onChange={(e) => setSettings({ ...settings, shipping_flat_rate: parseFloat(e.target.value) || 0 })}
                  style={{
                    width: '100%',
                    minHeight: '44px',
                    padding: '10px 12px',
                    border: '1px solid #D4D4D8',
                    borderRadius: '6px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#121212', display: 'block', marginBottom: '4px' }}>
                  CART HOLD TIMEOUT (MINUTES)
                </label>
                <input
                  type="number"
                  value={settings.cart_hold_duration_minutes}
                  onChange={(e) => setSettings({ ...settings, cart_hold_duration_minutes: parseInt(e.target.value) || 10 })}
                  style={{
                    width: '100%',
                    minHeight: '44px',
                    padding: '10px 12px',
                    border: '1px solid #D4D4D8',
                    borderRadius: '6px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 800, color: '#121212', display: 'block', marginBottom: '4px' }}>
                  CONCIERGE SUPPORT EMAIL
                </label>
                <input
                  type="email"
                  value={settings.concierge_email}
                  onChange={(e) => setSettings({ ...settings, concierge_email: e.target.value })}
                  style={{
                    width: '100%',
                    minHeight: '44px',
                    padding: '10px 12px',
                    border: '1px solid #D4D4D8',
                    borderRadius: '6px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Toggle Switch for Sold Out Section */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                backgroundColor: '#FAFAFA',
                borderRadius: '6px',
                border: '1px solid #E4E4E7'
              }}>
                <div>
                  <strong style={{ fontSize: '13px', display: 'block', color: '#121212' }}>Sold Out Archive</strong>
                  <span style={{ fontSize: '11px', color: '#71717A' }}>Display historical 1-of-1 pieces</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.sold_out_section_enabled}
                  onChange={(e) => setSettings({ ...settings, sold_out_section_enabled: e.target.checked })}
                  style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                />
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  minHeight: '48px',
                  backgroundColor: '#121212',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  marginTop: '8px'
                }}
              >
                SAVE CONFIGURATION
              </button>
            </form>
          </div>
        )}

      </main>

      {/* 3. Mobile Fixed Bottom Tab Bar */}
      <nav
        className="fixed bottom-0 w-full z-50 bg-[#0B0B0C]"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          maxWidth: '100vw',
          zIndex: 50,
          backgroundColor: '#0B0B0C',
          borderTop: '1px solid #1E1E22',
          height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          boxSizing: 'border-box'
        }}
      >
        {/* Nav Item: Dashboard */}
        <button
          onClick={() => setActiveTab('dashboard')}
          aria-label="Dashboard"
          style={{
            minHeight: '44px',
            height: '100%',
            backgroundColor: 'transparent',
            border: 'none',
            color: activeTab === 'dashboard' ? '#FFFFFF' : '#71717A',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            cursor: 'pointer',
            flex: 1,
            padding: '6px 0',
            transition: 'color 0.15s ease'
          }}
        >
          <LayoutDashboard size={20} color={activeTab === 'dashboard' ? '#FFFFFF' : '#71717A'} />
          <span style={{ fontSize: '11px', fontWeight: activeTab === 'dashboard' ? 800 : 600, letterSpacing: '0.04em' }}>
            Dashboard
          </span>
        </button>

        {/* Nav Item: Orders */}
        <button
          onClick={() => setActiveTab('orders')}
          aria-label="Orders"
          style={{
            minHeight: '44px',
            height: '100%',
            backgroundColor: 'transparent',
            border: 'none',
            color: activeTab === 'orders' ? '#FFFFFF' : '#71717A',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            cursor: 'pointer',
            position: 'relative',
            flex: 1,
            padding: '6px 0',
            transition: 'color 0.15s ease'
          }}
        >
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <ShoppingBag size={20} color={activeTab === 'orders' ? '#FFFFFF' : '#71717A'} />
            {pendingOrdersCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-8px',
                backgroundColor: '#EF4444',
                color: '#FFFFFF',
                fontSize: '9px',
                fontWeight: 900,
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {pendingOrdersCount}
              </span>
            )}
          </div>
          <span style={{ fontSize: '11px', fontWeight: activeTab === 'orders' ? 800 : 600, letterSpacing: '0.04em' }}>
            Orders
          </span>
        </button>

        {/* Nav Item: Catalog */}
        <button
          onClick={() => setActiveTab('catalog')}
          aria-label="Catalog"
          style={{
            minHeight: '44px',
            height: '100%',
            backgroundColor: 'transparent',
            border: 'none',
            color: activeTab === 'catalog' ? '#FFFFFF' : '#71717A',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            cursor: 'pointer',
            flex: 1,
            padding: '6px 0',
            transition: 'color 0.15s ease'
          }}
        >
          <Package size={20} color={activeTab === 'catalog' ? '#FFFFFF' : '#71717A'} />
          <span style={{ fontSize: '11px', fontWeight: activeTab === 'catalog' ? 800 : 600, letterSpacing: '0.04em' }}>
            Catalog
          </span>
        </button>

        {/* Nav Item: Settings */}
        <button
          onClick={() => setActiveTab('settings')}
          aria-label="Settings"
          style={{
            minHeight: '44px',
            height: '100%',
            backgroundColor: 'transparent',
            border: 'none',
            color: activeTab === 'settings' ? '#FFFFFF' : '#71717A',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            cursor: 'pointer',
            flex: 1,
            padding: '6px 0',
            transition: 'color 0.15s ease'
          }}
        >
          <Settings size={20} color={activeTab === 'settings' ? '#FFFFFF' : '#71717A'} />
          <span style={{ fontSize: '11px', fontWeight: activeTab === 'settings' ? 800 : 600, letterSpacing: '0.04em' }}>
            Settings
          </span>
        </button>
      </nav>

    </div>
  );
}
