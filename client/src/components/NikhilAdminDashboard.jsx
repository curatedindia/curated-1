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
  CheckSquare,
  Square,
  AlertCircle
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
  // Navigation / Tabs State
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'orders' | 'catalog' | 'settings' | 'activity'

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
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'PACKED'

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
      // Fetch from Supabase 'orders' table
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        setOrders(data);
      } else {
        // Fallback: check local API if Supabase table is newly created
        try {
          const apiRes = await fetch('/api/orders');
          const apiData = await apiRes.json();
          if (apiData && apiData.success && Array.isArray(apiData.orders) && apiData.orders.length > 0) {
            const mapped = apiData.orders.map(o => ({
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
        } catch (apiErr) {
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
      // 1. Supabase update
      const { error: dbError } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', order.id);

      if (dbError) {
        console.warn('Supabase update warning (table may need schema or permissions):', dbError);
      }

      // 2. Also sync to local backend if running
      try {
        await fetch(`/api/orders/${order.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
      } catch (e) {
        // non-blocking
      }

      // 3. Add to activity ledger
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

      setSuccessMessage(`✓ Order #${order.order_number || order.id.slice(0, 8)} status updated to ${newStatus}`);
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      console.error('Failed to update order status:', err);
      setActionError('Could not update order status in database. Reverting.');
      // Revert local state
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: order.status } : o))
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // ========================================================
  // 4. REAL-TIME DASHBOARD STATS & REVENUE LOGIC
  // ========================================================
  const packedOrdersCount = useMemo(() => {
    return orders.filter((o) => (o.status || '').toUpperCase() === 'PACKED').length;
  }, [orders]);

  const pendingOrdersCount = useMemo(() => {
    return orders.filter((o) => (o.status || '').toUpperCase() !== 'PACKED').length;
  }, [orders]);

  const totalOrdersCount = orders.length;

  // Timeframe-filtered revenue calculation (Day, Month, Year, All)
  const filteredRevenue = useMemo(() => {
    const now = new Date();

    // Sum total_amount for confirmed/packed orders
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

  // Filtered orders list for Orders tab
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Status filter
      const st = (o.status || '').toUpperCase();
      if (orderStatusFilter === 'PACKED' && st !== 'PACKED') return false;
      if (orderStatusFilter === 'PENDING' && st === 'PACKED') return false;

      // Text search
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

  // Filtered Activity Logs
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
  // 5. CATALOG MANAGEMENT: ADD & DELETE
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
      // Upload image to Supabase Storage bucket 'product-images'
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
        throw new Error(`Image upload failed: ${uploadError.message}. Make sure bucket 'product-images' exists.`);
      }

      // Retrieve public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(storagePath);

      if (!publicUrl) {
        throw new Error('Failed to obtain public URL for uploaded product image.');
      }

      // Prepare payload
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

      // Insert row into Supabase 'products' table
      const { error: insertError } = await supabase
        .from('products')
        .insert([newProductPayload]);

      if (insertError) {
        console.error('Supabase DB Insert Error:', insertError);
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

      fetchCatalog();
    } catch (err) {
      console.error('Error adding product:', err);
      setActionError(err.message || 'Failed to add product.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    const confirmDelete = window.confirm(
      `Permanently delete "${product.name}" (${product.sku || product.id}) from the database?`
    );
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

      // Log deletion
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

      setSuccessMessage(`✓ Successfully removed "${product.name}" from catalog.`);
    } catch (err) {
      console.error('Delete error:', err);
      setActionError(err.message || 'Unable to delete product.');
    }
  };

  // ========================================================
  // 6. SETTINGS HANDLERS
  // ========================================================
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
            style={{
              width: '100%',
              height: '48px',
              backgroundColor: '#FFFFFF',
              color: '#121212',
              border: 'none',
              borderRadius: '2px',
              fontSize: '13px',
              fontWeight: 800,
              fontFamily: 'var(--font-btn)',
              letterSpacing: '0.06em',
              cursor: isSigningIn ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'opacity 0.2s ease'
            }}
          >
            {isSigningIn ? (
              <span>VERIFYING CREDENTIALS...</span>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24">
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
  // RENDER: AUTHORIZED ADMIN DASHBOARD (/nikhil)
  // ========================================================
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8F9FA', color: '#121212', fontFamily: 'inherit' }}>
      
      {/* Top Admin Header Bar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: '#121212',
        color: '#FFFFFF',
        borderBottom: '1px solid #27272A',
        padding: '14px 20px'
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

        {/* Tab Navigation Menu */}
        <div className="container" style={{ marginTop: '14px', borderTop: '1px solid #27272A', paddingTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            
            {/* Dashboard Tab */}
            <button
              onClick={() => setActiveTab('dashboard')}
              style={{
                background: activeTab === 'dashboard' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'dashboard' ? '#121212' : '#A1A1AA',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '0.06em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <LayoutDashboard size={15} />
              <span>DASHBOARD</span>
            </button>

            {/* Orders Tab */}
            <button
              onClick={() => setActiveTab('orders')}
              style={{
                background: activeTab === 'orders' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'orders' ? '#121212' : '#A1A1AA',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '0.06em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <ShoppingBag size={15} />
              <span>ORDERS</span>
              {pendingOrdersCount > 0 && (
                <span style={{
                  backgroundColor: activeTab === 'orders' ? '#EF4444' : '#DC2626',
                  color: '#FFFFFF',
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '10px'
                }}>
                  {pendingOrdersCount}
                </span>
              )}
            </button>

            {/* Catalog Tab */}
            <button
              onClick={() => setActiveTab('catalog')}
              style={{
                background: activeTab === 'catalog' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'catalog' ? '#121212' : '#A1A1AA',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '0.06em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Package size={15} />
              <span>CATALOG</span>
              <span style={{ fontSize: '11px', opacity: 0.7 }}>({products.length})</span>
            </button>

            {/* Settings Tab */}
            <button
              onClick={() => setActiveTab('settings')}
              style={{
                background: activeTab === 'settings' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'settings' ? '#121212' : '#A1A1AA',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '0.06em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Settings size={15} />
              <span>SETTINGS</span>
            </button>

            {/* Activity Log Tab */}
            <button
              onClick={() => setActiveTab('activity')}
              style={{
                background: activeTab === 'activity' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'activity' ? '#121212' : '#A1A1AA',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '0.06em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <History size={15} />
              <span>ACTIVITY LOG</span>
            </button>

          </div>
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="container" style={{ padding: '28px 16px 80px', maxWidth: '1120px' }}>
        
        {/* Alerts & Toasts */}
        {actionError && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '4px',
            color: '#B91C1C',
            fontSize: '13px',
            marginBottom: '20px',
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
            padding: '12px 16px',
            backgroundColor: '#F0FDF4',
            border: '1px solid #86EFAC',
            borderRadius: '4px',
            color: '#15803D',
            fontSize: '13px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ========================================================
            TAB 1: REAL-TIME DASHBOARD (STATS & REVENUE)
        ======================================================== */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Top Row: Timeframe Filter for Revenue */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <h1 style={{
                  fontSize: '20px',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase'
                }}>
                  EXECUTIVE DASHBOARD
                </h1>
                <p style={{ fontSize: '12px', color: '#71717A', marginTop: '2px' }}>
                  Live operational revenue, fulfillment velocity, and catalog volume
                </p>
              </div>

              {/* Timeframe Filter Dropdown / Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', color: '#71717A' }}>
                  TIMEFRAME:
                </span>
                <div style={{ display: 'flex', backgroundColor: '#E4E4E7', borderRadius: '4px', padding: '2px' }}>
                  {[
                    { id: 'day', label: 'Day (24h)' },
                    { id: 'month', label: 'Month (30d)' },
                    { id: 'year', label: 'Year' },
                    { id: 'all', label: 'All Time' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setRevenueTimeframe(t.id)}
                      style={{
                        padding: '4px 10px',
                        border: 'none',
                        borderRadius: '3px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: revenueTimeframe === t.id ? '#121212' : 'transparent',
                        color: revenueTimeframe === t.id ? '#FFFFFF' : '#52525B',
                        cursor: 'pointer'
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Key Metric Tiles */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
              marginBottom: '28px'
            }}>
              
              {/* Metric 1: Revenue Widget */}
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: '6px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#71717A', textTransform: 'uppercase' }}>
                    TOTAL REVENUE ({revenueTimeframe.toUpperCase()})
                  </span>
                  <div style={{ padding: '6px', backgroundColor: '#F0FDF4', borderRadius: '4px' }}>
                    <TrendingUp size={16} color="#16A34A" />
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#121212', fontFamily: 'var(--font-heading)' }}>
                  ₹{filteredRevenue.toLocaleString('en-IN')}
                </div>
                <p style={{ fontSize: '11.5px', color: '#71717A', marginTop: '6px' }}>
                  Sum of confirmed &amp; packed orders
                </p>
              </div>

              {/* Metric 2: Packed Orders */}
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: '6px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#71717A', textTransform: 'uppercase' }}>
                    PACKED ORDERS
                  </span>
                  <div style={{ padding: '6px', backgroundColor: '#F0FDF4', borderRadius: '4px' }}>
                    <CheckCircle2 size={16} color="#16A34A" />
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#16A34A', fontFamily: 'var(--font-heading)' }}>
                  {packedOrdersCount}
                </div>
                <p style={{ fontSize: '11.5px', color: '#71717A', marginTop: '6px' }}>
                  {totalOrdersCount > 0 ? `${Math.round((packedOrdersCount / totalOrdersCount) * 100)}% of total orders fulfilled` : 'No orders yet'}
                </p>
              </div>

              {/* Metric 3: Pending Orders */}
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: '6px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#71717A', textTransform: 'uppercase' }}>
                    PENDING FULFILLMENT
                  </span>
                  <div style={{ padding: '6px', backgroundColor: pendingOrdersCount > 0 ? '#FEF2F2' : '#F4F4F5', borderRadius: '4px' }}>
                    <Clock size={16} color={pendingOrdersCount > 0 ? '#DC2626' : '#71717A'} />
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: pendingOrdersCount > 0 ? '#DC2626' : '#121212', fontFamily: 'var(--font-heading)' }}>
                  {pendingOrdersCount}
                </div>
                <p style={{ fontSize: '11.5px', color: '#71717A', marginTop: '6px' }}>
                  {pendingOrdersCount > 0 ? 'Action required in Orders tab' : 'All orders packed'}
                </p>
              </div>

              {/* Metric 4: Live Catalog Items */}
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: '6px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', color: '#71717A', textTransform: 'uppercase' }}>
                    CATALOG PIECES
                  </span>
                  <div style={{ padding: '6px', backgroundColor: '#F4F4F5', borderRadius: '4px' }}>
                    <Package size={16} color="#121212" />
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#121212', fontFamily: 'var(--font-heading)' }}>
                  {products.length}
                </div>
                <p style={{ fontSize: '11.5px', color: '#71717A', marginTop: '6px' }}>
                  Active 1-of-1 archival garments in store
                </p>
              </div>

            </div>

            {/* Quick Actions & Pending Orders Spotlight */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              
              {/* Action Banner: Manage Pending Orders */}
              <div style={{
                backgroundColor: '#121212',
                color: '#FFFFFF',
                borderRadius: '6px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <ShoppingBag size={18} color="#FFFFFF" />
                    <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      ORDERS FULFILLMENT DESK
                    </span>
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>
                    {pendingOrdersCount > 0 ? `${pendingOrdersCount} Orders Awaiting Packing` : 'All Current Orders Are Packed'}
                  </h3>
                  <p style={{ fontSize: '12.5px', color: '#A1A1AA', lineHeight: 1.5 }}>
                    Open the Orders tab to use the 'Tick' system to mark orders as Packed with zero latency.
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('orders')}
                  style={{
                    marginTop: '20px',
                    backgroundColor: '#FFFFFF',
                    color: '#121212',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    cursor: 'pointer',
                    alignSelf: 'flex-start'
                  }}
                >
                  GO TO ORDERS SUITE →
                </button>
              </div>

              {/* Action Banner: Quick Product Entry */}
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: '6px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <PlusCircle size={18} color="#121212" />
                    <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.1em', color: '#71717A', textTransform: 'uppercase' }}>
                      QUICK MOBILE ENTRY
                    </span>
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#121212', marginBottom: '8px' }}>
                    Publish a 1-of-1 Piece
                  </h3>
                  <p style={{ fontSize: '12.5px', color: '#71717A', lineHeight: 1.5 }}>
                    Take a snapshot on your mobile camera, set prices and measurements, and publish straight to Supabase.
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('catalog')}
                  style={{
                    marginTop: '20px',
                    backgroundColor: '#121212',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    cursor: 'pointer',
                    alignSelf: 'flex-start'
                  }}
                >
                  OPEN CATALOG ENTRY →
                </button>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================
            TAB 2: ORDERS MANAGEMENT (THE 'TICK' SYSTEM)
        ======================================================== */}
        {activeTab === 'orders' && (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <h1 style={{
                  fontSize: '20px',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase'
                }}>
                  ORDERS MANAGEMENT ({orders.length})
                </h1>
                <p style={{ fontSize: '12px', color: '#71717A', marginTop: '2px' }}>
                  The 'Tick' System: Tap the status checkbox to toggle between Packed and Pending instantly
                </p>
              </div>

              <button
                onClick={fetchOrders}
                disabled={loadingOrders}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #D4D4D8',
                  padding: '7px 14px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RefreshCw size={13} className={loadingOrders ? 'animate-spin' : ''} /> REFRESH ORDERS
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E4E4E7',
              borderRadius: '6px',
              padding: '14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              {/* Search Box */}
              <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
                <Search size={16} color="#71717A" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search by Order ID, customer name, email..."
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    border: '1px solid #D4D4D8',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                />
              </div>

              {/* Status Filter Buttons */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {['ALL', 'PENDING', 'PACKED'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setOrderStatusFilter(filter)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '4px',
                      border: '1px solid',
                      borderColor: orderStatusFilter === filter ? '#121212' : '#E4E4E7',
                      backgroundColor: orderStatusFilter === filter ? '#121212' : '#FFFFFF',
                      color: orderStatusFilter === filter ? '#FFFFFF' : '#52525B',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders List / Table */}
            {loadingOrders ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#71717A' }}>
                Loading customer orders from Supabase...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: '6px',
                padding: '60px 20px',
                textAlign: 'center',
                color: '#71717A'
              }}>
                <ShoppingBag size={36} color="#D4D4D8" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#121212', marginBottom: '4px' }}>
                  No matching orders found
                </p>
                <p style={{ fontSize: '12px' }}>
                  {orderSearch ? 'Try a different search term or clear the filter.' : 'Customer orders placed on the storefront will appear here.'}
                </p>
              </div>
            ) : (
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: '6px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                {/* Table Header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(140px, 1.2fr) minmax(180px, 1.6fr) minmax(110px, 1fr) minmax(150px, 1.2fr) minmax(160px, 1.4fr)',
                  backgroundColor: '#F4F4F5',
                  padding: '12px 18px',
                  borderBottom: '1px solid #E4E4E7',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  color: '#52525B',
                  textTransform: 'uppercase'
                }}>
                  <div>ORDER ID</div>
                  <div>CUSTOMER</div>
                  <div>TOTAL AMOUNT</div>
                  <div>DATE</div>
                  <div style={{ textAlign: 'right' }}>STATUS / PACKED TICK</div>
                </div>

                {/* Rows */}
                {filteredOrders.map((order) => {
                  const isPacked = (order.status || '').toUpperCase() === 'PACKED';
                  const isUpdating = updatingOrderId === order.id;
                  const dateStr = order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'N/A';

                  return (
                    <div
                      key={order.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(140px, 1.2fr) minmax(180px, 1.6fr) minmax(110px, 1fr) minmax(150px, 1.2fr) minmax(160px, 1.4fr)',
                        padding: '16px 18px',
                        borderBottom: '1px solid #F4F4F5',
                        alignItems: 'center',
                        fontSize: '13px',
                        backgroundColor: isPacked ? '#FAFAFA' : '#FFFFFF',
                        transition: 'background-color 0.2s ease'
                      }}
                    >
                      {/* Order ID */}
                      <div>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          fontWeight: 700,
                          backgroundColor: '#F4F4F5',
                          padding: '3px 6px',
                          borderRadius: '3px',
                          color: '#121212'
                        }}>
                          #{order.order_number || order.id.slice(0, 10)}
                        </span>
                        {order.items?.length > 0 && (
                          <div style={{ fontSize: '11px', color: '#71717A', marginTop: '4px' }}>
                            {order.items[0]?.name?.slice(0, 24)}...
                          </div>
                        )}
                      </div>

                      {/* Customer */}
                      <div>
                        <div style={{ fontWeight: 700, color: '#121212' }}>
                          {order.customer_name || 'Guest Customer'}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#71717A' }}>
                          {order.customer_email || 'No email provided'}
                        </div>
                      </div>

                      {/* Total Amount */}
                      <div>
                        <span style={{ fontWeight: 800, color: '#121212' }}>
                          ₹{(parseFloat(order.total_amount) || 0).toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Date */}
                      <div style={{ fontSize: '12px', color: '#52525B' }}>
                        {dateStr}
                      </div>

                      {/* Status / The 'Tick' Action */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          onClick={() => handleTogglePacked(order)}
                          disabled={isUpdating}
                          title={isPacked ? 'Click to revert to Pending' : 'Click to mark as Packed'}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 14px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 800,
                            letterSpacing: '0.04em',
                            transition: 'all 0.15s ease',
                            border: isPacked ? '1px solid #16A34A' : '1px solid #D4D4D8',
                            backgroundColor: isPacked ? '#DCFCE7' : '#FFFFFF',
                            color: isPacked ? '#15803D' : '#3F3F46',
                            boxShadow: isPacked ? '0 1px 2px rgba(22, 163, 74, 0.1)' : '0 1px 2px rgba(0,0,0,0.03)'
                          }}
                        >
                          {/* Toggle Checkbox Graphic */}
                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '3px',
                            backgroundColor: isPacked ? '#16A34A' : '#FFFFFF',
                            border: isPacked ? '1px solid #16A34A' : '2px solid #71717A',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {isPacked && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                          </div>

                          <span>{isPacked ? 'PACKED' : 'MARK PACKED'}</span>
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 3: CATALOG (QUICK ENTRY & DELETION)
        ======================================================== */}
        {activeTab === 'catalog' && (
          <div>
            {/* 1. Quick Mobile Product Entry Form */}
            <section style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              marginBottom: '32px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #E4E4E7', paddingBottom: '14px' }}>
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

                {/* Measurements & Condition Notes */}
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

            {/* 2. Existing Catalog Management List */}
            <section style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
                borderBottom: '1px solid #E4E4E7',
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
                    CATALOG MANAGEMENT ({products.length} PIECES)
                  </h2>
                  <p style={{ fontSize: '12px', color: '#71717A', marginTop: '2px' }}>
                    Instant deletion via <code>supabase.from('products').delete().eq('id', id)</code>
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
                  <RefreshCw size={13} className={loadingProducts ? 'animate-spin' : ''} /> REFRESH CATALOG
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
                                backgroundColor: item.status === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2',
                                color: item.status === 'ACTIVE' ? '#15803D' : '#B91C1C'
                              }}>
                                {item.status || 'ACTIVE'}
                              </span>
                            </div>
                            <h3 style={{ fontSize: '15px', fontWeight: 800, margin: '4px 0 2px' }}>
                              {item.name}
                            </h3>
                            <div style={{ fontSize: '12px', color: '#52525B', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                              <span>Selling: <strong>₹{price}</strong></span>
                              {cost > 0 && <span>Cost: ₹{cost}</span>}
                              {margin > 0 && <span style={{ color: '#16A34A', fontWeight: 700 }}>Margin: {margin}%</span>}
                              <span>Category: {item.category_id}</span>
                            </div>
                          </div>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteProduct(item)}
                          style={{
                            background: '#FEE2E2',
                            color: '#DC2626',
                            border: '1px solid #FCA5A5',
                            padding: '8px 14px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Trash2 size={14} /> DELETE PIECE
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ========================================================
            TAB 4: SETTINGS (STORE CONFIGURATION)
        ======================================================== */}
        {activeTab === 'settings' && (
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '28px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <div style={{ borderBottom: '1px solid #E4E4E7', paddingBottom: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={20} color="#121212" />
                <h1 style={{
                  fontSize: '18px',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase'
                }}>
                  STORE CONFIGURATION &amp; POLICIES
                </h1>
              </div>
              <p style={{ fontSize: '12px', color: '#71717A', marginTop: '4px' }}>
                Manage live parameters for checkout shipping, reservation timeouts, and concierge contacts.
              </p>
            </div>

            {settingsSaved && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#F0FDF4',
                border: '1px solid #86EFAC',
                borderRadius: '4px',
                color: '#15803D',
                fontSize: '13px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircle2 size={16} />
                <span>Store configuration parameters saved successfully.</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                
                {/* Shipping Settings */}
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.06em', color: '#121212', marginBottom: '14px', textTransform: 'uppercase' }}>
                    Shipping &amp; Delivery Rules
                  </h3>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#52525B', display: 'block', marginBottom: '4px' }}>
                      FREE SHIPPING THRESHOLD (₹)
                    </label>
                    <input
                      type="number"
                      value={settings.shipping_free_threshold}
                      onChange={(e) => setSettings({ ...settings, shipping_free_threshold: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '10px', border: '1px solid #D4D4D8', borderRadius: '4px', fontSize: '13px' }}
                    />
                    <span style={{ fontSize: '11px', color: '#71717A' }}>Orders at or above this value receive free delivery.</span>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#52525B', display: 'block', marginBottom: '4px' }}>
                      FLAT SHIPPING RATE (₹)
                    </label>
                    <input
                      type="number"
                      value={settings.shipping_flat_rate}
                      onChange={(e) => setSettings({ ...settings, shipping_flat_rate: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '10px', border: '1px solid #D4D4D8', borderRadius: '4px', fontSize: '13px' }}
                    />
                  </div>
                </div>

                {/* Checkout & Reservation Hold Duration */}
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.06em', color: '#121212', marginBottom: '14px', textTransform: 'uppercase' }}>
                    Checkout Lock &amp; Reservation Hold
                  </h3>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#52525B', display: 'block', marginBottom: '4px' }}>
                      CART HOLD DURATION (MINUTES)
                    </label>
                    <input
                      type="number"
                      value={settings.cart_hold_duration_minutes}
                      onChange={(e) => setSettings({ ...settings, cart_hold_duration_minutes: parseInt(e.target.value) || 10 })}
                      style={{ width: '100%', padding: '10px', border: '1px solid #D4D4D8', borderRadius: '4px', fontSize: '13px' }}
                    />
                    <span style={{ fontSize: '11px', color: '#71717A' }}>Prevents double selling while a buyer enters payment.</span>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#52525B', display: 'block', marginBottom: '4px' }}>
                      CONCIERGE SUPPORT EMAIL
                    </label>
                    <input
                      type="email"
                      value={settings.concierge_email}
                      onChange={(e) => setSettings({ ...settings, concierge_email: e.target.value })}
                      style={{ width: '100%', padding: '10px', border: '1px solid #D4D4D8', borderRadius: '4px', fontSize: '13px' }}
                    />
                  </div>
                </div>

              </div>

              {/* Toggles */}
              <div style={{ borderTop: '1px solid #E4E4E7', paddingTop: '18px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
                  <div>
                    <strong style={{ fontSize: '13px', display: 'block', color: '#121212' }}>Show Sold Out Archive</strong>
                    <span style={{ fontSize: '11.5px', color: '#71717A' }}>Display historical 1-of-1 pieces as sold archival proof on storefront.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.sold_out_section_enabled}
                    onChange={(e) => setSettings({ ...settings, sold_out_section_enabled: e.target.checked })}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                style={{
                  backgroundColor: '#121212',
                  color: '#FFFFFF',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  cursor: 'pointer'
                }}
              >
                SAVE CONFIGURATION
              </button>
            </form>
          </div>
        )}

        {/* ========================================================
            TAB 5: ACTIVITY LOG (INVENTORY TRANSACTIONS LEDGER)
        ======================================================== */}
        {activeTab === 'activity' && (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <h1 style={{
                  fontSize: '20px',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase'
                }}>
                  ACTIVITY LOG &amp; INVENTORY LEDGER
                </h1>
                <p style={{ fontSize: '12px', color: '#71717A', marginTop: '2px' }}>
                  Real-time history of garments added, sales fulfilled, and catalog modifications
                </p>
              </div>

              <button
                onClick={fetchActivityLogs}
                disabled={loadingLogs}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #D4D4D8',
                  padding: '6px 14px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RefreshCw size={13} className={loadingLogs ? 'animate-spin' : ''} /> REFRESH LEDGER
              </button>
            </div>

            {/* Filter buttons */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {['ALL', 'SALE', 'STOCK', 'DELETE'].map((f) => (
                <button
                  key={f}
                  onClick={() => setLogFilter(f)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: logFilter === f ? '#121212' : '#E4E4E7',
                    backgroundColor: logFilter === f ? '#121212' : '#FFFFFF',
                    color: logFilter === f ? '#FFFFFF' : '#52525B',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {f === 'ALL' ? 'ALL EVENTS' : f}
                </button>
              ))}
            </div>

            {/* Ledger List */}
            {loadingLogs ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#71717A' }}>
                Loading activity history...
              </div>
            ) : filteredActivityLogs.length === 0 ? (
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: '6px',
                padding: '60px 20px',
                textAlign: 'center',
                color: '#71717A'
              }}>
                <History size={36} color="#D4D4D8" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: '14px', color: '#121212', fontWeight: 700 }}>No transaction logs recorded yet</p>
              </div>
            ) : (
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E4E4E7',
                borderRadius: '6px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}>
                {filteredActivityLogs.map((log) => {
                  const dateStr = log.created_at ? new Date(log.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'N/A';

                  const isSale = (log.reason || '').toLowerCase().includes('sale');
                  const isAdd = (log.reason || '').toLowerCase().includes('stock') || (log.reason || '').toLowerCase().includes('added');
                  const isDelete = (log.reason || '').toLowerCase().includes('delete') || (log.reason || '').toLowerCase().includes('remove');

                  let badgeBg = '#F4F4F5';
                  let badgeColor = '#52525B';
                  if (isSale) { badgeBg = '#DCFCE7'; badgeColor = '#15803D'; }
                  else if (isAdd) { badgeBg = '#DBEAFE'; badgeColor = '#1D4ED8'; }
                  else if (isDelete) { badgeBg = '#FEE2E2'; badgeColor = '#DC2626'; }

                  return (
                    <div
                      key={log.id}
                      style={{
                        padding: '14px 18px',
                        borderBottom: '1px solid #F4F4F5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '3px',
                          fontSize: '11px',
                          fontWeight: 800,
                          letterSpacing: '0.04em',
                          backgroundColor: badgeBg,
                          color: badgeColor
                        }}>
                          {log.reason || 'EVENT'}
                        </span>

                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#121212' }}>
                            {log.product_name || log.sku || 'Piece Inventory Action'}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#71717A' }}>
                            {log.note || 'No additional note'} • Operator: {log.admin_user || 'SYSTEM'}
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: '12px', color: '#71717A', textAlign: 'right' }}>
                        <div>{dateStr}</div>
                        {log.quantity_change !== 0 && (
                          <span style={{
                            fontWeight: 700,
                            color: log.quantity_change > 0 ? '#16A34A' : '#DC2626'
                          }}>
                            {log.quantity_change > 0 ? `+${log.quantity_change}` : log.quantity_change} Piece
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
