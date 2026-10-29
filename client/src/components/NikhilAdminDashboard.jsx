import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Bell,
  TrendingUp,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  Trash2,
  PlusCircle,
  Camera,
  Send,
  Loader2,
  AlertTriangle,
  ExternalLink,
  LogOut,
  X,
  ShieldCheck,
  Lock,
  ChevronRight,
  Download
} from 'lucide-react';
import supabase from '../supabaseClient';

const REQUIRED_ADMIN_EMAIL = 'hello.curatedindia@gmail.com';

export default function NikhilAdminDashboard({ onExit }) {
  // Mobile Navigation Tabs: 'dashboard' | 'orders' | 'catalog' | 'drop-alerts'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Authentication & Guard State
  const [authChecking, setAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [authError, setAuthError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Real-Time Dashboard Stats State
  const [revenue, setRevenue] = useState(0);
  const [packedCount, setPackedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [catalogCount, setCatalogCount] = useState(0);
  const [revenueTimeframe, setRevenueTimeframe] = useState('month'); // 'day' | 'month' | 'year' | 'all'

  // Orders State & Receipt Modal
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'PACKED'
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Catalog State
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [actionError, setActionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Catalog Form State
  const fileInputRef = useRef(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [submittingProduct, setSubmittingProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    title: '',
    category: 't-shirts',
    conditionGrade: 'New / Unused',
    sellingPrice: '',
    originalPrice: '',
    deliveryCharge: 0,
    chest: '',
    length: '',
    shoulder: '',
    sleeve: '',
    conditionNotes: ''
  });

  // Drop Alerts Broadcast State
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState(null); // { type: 'success' | 'error', text: string }

  // ========================================================
  // REVENUE CALCULATION HELPER
  // Dynamic calculation based on timeframe and order created_at
  // ========================================================
  const calculateRevenue = useCallback((orderList, timeframe) => {
    const now = new Date();
    return orderList.reduce((sum, o) => {
      const orderDate = new Date(o.created_at);
      if (isNaN(orderDate.getTime())) {
        return sum + (parseFloat(o.total_amount) || 0);
      }

      let matches = true;
      if (timeframe === 'day') {
        const diffMs = now.getTime() - orderDate.getTime();
        matches = diffMs >= 0 && diffMs <= 24 * 60 * 60 * 1000;
      } else if (timeframe === 'month') {
        const diffMs = now.getTime() - orderDate.getTime();
        matches = diffMs >= 0 && diffMs <= 30 * 24 * 60 * 60 * 1000;
      } else if (timeframe === 'year') {
        matches = orderDate.getFullYear() === now.getFullYear();
      } else if (timeframe === 'all') {
        matches = true;
      }

      return matches ? sum + (parseFloat(o.total_amount) || 0) : sum;
    }, 0);
  }, []);

  const handleTimeframeChange = (newTf) => {
    setRevenueTimeframe(newTf);
    setRevenue(calculateRevenue(orders, newTf));
  };

  // ========================================================
  // DATA FETCHERS
  // ========================================================
  const fetchOrders = useCallback(async (currentTf = revenueTimeframe) => {
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders from Supabase:', error);
      } else if (Array.isArray(data)) {
        setOrders(data);
        let packed = 0;
        let pending = 0;
        data.forEach((o) => {
          if ((o.status || '').toUpperCase() === 'PACKED') packed += 1;
          else pending += 1;
        });
        setPackedCount(packed);
        setPendingCount(pending);
        setRevenue(calculateRevenue(data, currentTf));
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  }, [revenueTimeframe, calculateRevenue]);

  const fetchCatalog = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching catalog from Supabase:', error);
      } else if (Array.isArray(data)) {
        setProducts(data);
        setCatalogCount(data.length);
      }
    } catch (err) {
      console.error('Failed to fetch catalog:', err);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  // ========================================================
  // 1. STRICT ROUTE GUARD & AUTHENTICATION
  // If user.email is NOT exactly hello.curatedindia@gmail.com, redirect to /
  // ========================================================
  useEffect(() => {
    let isMounted = true;

    const enforceAdminSecurity = async (user) => {
      if (!user) {
        if (isMounted) {
          setCurrentUser(null);
          setAuthChecking(false);
        }
        return false;
      }

      const email = (user.email || '').toLowerCase().trim();
      if (email !== REQUIRED_ADMIN_EMAIL) {
        console.warn(`[SECURITY VIOLATION] Unauthorized access attempt by: ${email}`);
        alert(`Access Denied. Only ${REQUIRED_ADMIN_EMAIL} is authorized.`);
        try {
          await supabase.auth.signOut();
        } catch (e) {
          console.error(e);
        }
        window.location.replace('/');
        return false;
      }

      if (isMounted) {
        setCurrentUser(user);
        setAuthChecking(false);
        fetchOrders();
        fetchCatalog();
      }
      return true;
    };

    // Check existing active session
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

    // Real-time Supabase subscriptions for orders and products
    const ordersChannel = supabase
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          if (isMounted) fetchOrders();
        }
      )
      .subscribe();

    const productsChannel = supabase
      .channel('admin-products-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          if (isMounted) fetchCatalog();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
      ordersChannel?.unsubscribe();
      productsChannel?.unsubscribe();
    };
  }, [fetchOrders, fetchCatalog]);

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
    } catch {
      setAuthError('Failed to trigger admin authentication.');
      setIsSigningIn(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    setCurrentUser(null);
    window.location.replace('/');
  };

  // Filtered orders for Orders Tab
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

  // ========================================================
  // 3. THE 'TICK' SYSTEM: PACKED/PENDING TOGGLE
  // Must execute Supabase update instantly and use e.stopPropagation()
  // ========================================================
  const handleTogglePacked = async (order, e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }

    const isCurrentlyPacked = (order.status || '').toUpperCase() === 'PACKED';
    const newStatus = isCurrentlyPacked ? 'PENDING' : 'PACKED';

    // Instant local state update
    const updatedOrders = orders.map((o) =>
      o.id === order.id ? { ...o, status: newStatus } : o
    );
    setOrders(updatedOrders);

    // If modal is currently viewing this order, update it too
    if (selectedOrder && selectedOrder.id === order.id) {
      setSelectedOrder((prev) => ({ ...prev, status: newStatus }));
    }

    let packed = 0;
    let pending = 0;
    updatedOrders.forEach((o) => {
      if ((o.status || '').toUpperCase() === 'PACKED') packed += 1;
      else pending += 1;
    });
    setPackedCount(packed);
    setPendingCount(pending);
    setRevenue(calculateRevenue(updatedOrders, revenueTimeframe));

    setUpdatingOrderId(order.id);

    try {
      const { error: dbError } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', order.id);

      if (dbError) {
        throw new Error(dbError.message);
      }

      setSuccessMessage(`Order #${order.order_number || order.id.slice(0, 8)} updated to ${newStatus}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Failed to update order status in Supabase:', err);
      setActionError('Failed to update order status. Reverting changes.');
      const reverted = orders.map((o) =>
        o.id === order.id ? { ...o, status: order.status } : o
      );
      setOrders(reverted);
      setTimeout(() => setActionError(''), 4000);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // ========================================================
  // 4. CATALOG TAB: QUICK MOBILE PRODUCT ENTRY & DELETION
  // ========================================================
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        alert('File size exceeds the 50MB limit. Please select an image under 50MB.');
        e.target.value = '';
        if (fileInputRef.current) fileInputRef.current.value = '';
        setImageFile(null);
        setImagePreview('');
        return;
      }
      setActionError('');
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleProductFormChange = (e) => {
    const { name, value } = e.target;
    setProductForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setActionError('');
    setSuccessMessage('');

    if (!imageFile) {
      setActionError('Please select or capture a product image.');
      return;
    }

    if (!productForm.title.trim()) {
      setActionError('Please enter a garment title.');
      return;
    }

    if (!productForm.sellingPrice || parseFloat(productForm.sellingPrice) <= 0) {
      setActionError('Please enter a valid selling price.');
      return;
    }

    setSubmittingProduct(true);
    try {
      const fileExt = imageFile.name.split('.').pop() || 'jpg';
      const cleanFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const storagePath = `products/${cleanFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(storagePath, imageFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(storagePath);

      if (!publicUrl) {
        throw new Error('Failed to obtain image public URL from Supabase.');
      }

      const categoryCode = productForm.category.toUpperCase().slice(0, 2);
      const generatedSku = `CUR-${categoryCode}-${Math.floor(100 + Math.random() * 900)}`;
      const generatedSlug = productForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const newProductPayload = {
        sku: generatedSku,
        name: productForm.title.trim(),
        slug: generatedSlug,
        category_id: productForm.category,
        condition: productForm.conditionGrade,
        condition_notes: productForm.conditionNotes.trim() || 'Pristine authentic 1-of-1 piece.',
        selling_price: parseFloat(productForm.sellingPrice),
        original_price: productForm.originalPrice ? parseFloat(productForm.originalPrice) : null,
        delivery_charge: parseFloat(productForm.deliveryCharge) || 0,
        cost_price: 0,
        measurements: {
          chest: parseFloat(productForm.chest) || 0,
          length: parseFloat(productForm.length) || 0,
          shoulder: parseFloat(productForm.shoulder) || 0,
          sleeve: parseFloat(productForm.sleeve) || 0,
          unit: 'in'
        },
        images: [publicUrl],
        status: 'ACTIVE',
        is_new_drop: true,
        total_on_hand: 1,
        total_available: 1,
        pieces_sold: 0,
        created_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('products')
        .insert([newProductPayload]);

      if (insertError) {
        throw new Error(`Database insert failed: ${insertError.message}`);
      }

      setSuccessMessage(`✓ '${productForm.title}' published successfully!`);
      setTimeout(() => setSuccessMessage(''), 4000);

      setProductForm({
        title: '',
        category: 't-shirts',
        conditionGrade: 'New / Unused',
        sellingPrice: '',
        originalPrice: '',
        deliveryCharge: 0,
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
      setActionError(err.message || 'Failed to add product to Supabase.');
    } finally {
      setSubmittingProduct(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    const confirmDelete = window.confirm(`Permanently delete "${product.name}" (${product.sku || product.id}) from Supabase?`);
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
      setCatalogCount((prev) => Math.max(0, prev - 1));
      setSuccessMessage(`✓ Removed "${product.name}" from catalog.`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Delete error:', err);
      setActionError(err.message || 'Failed to delete product from Supabase.');
    }
  };

  // ========================================================
  // 5. DROP ALERTS TAB: BROADCAST TO NEWSLETTER
  // ========================================================
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastSubject.trim()) {
      setBroadcastStatus({ type: 'error', text: 'Please enter a subject line for the drop alert.' });
      return;
    }
    if (!broadcastMessage.trim()) {
      setBroadcastStatus({ type: 'error', text: 'Please enter the broadcast message body.' });
      return;
    }

    setBroadcastSending(true);
    setBroadcastStatus(null);

    const adminEmail = currentUser?.email || REQUIRED_ADMIN_EMAIL;

    try {
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail,
          subject: broadcastSubject.trim(),
          message: broadcastMessage.trim()
        })
      });

      let data = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(res.ok ? text : `Server returned ${res.status}.`);
      }

      if (res.ok && data.success) {
        setBroadcastStatus({
          type: 'success',
          text: `Sent! Alert delivered to ${data.count !== undefined ? data.count : 'all'} subscribers via private BCC.`
        });
        setBroadcastSubject('');
        setBroadcastMessage('');
      } else {
        setBroadcastStatus({
          type: 'error',
          text: data.error || data.message || 'Failed to send broadcast alert.'
        });
      }
    } catch (err) {
      console.error('Broadcast error:', err);
      setBroadcastStatus({
        type: 'error',
        text: err.message || 'Network error while broadcasting drop alert.'
      });
    } finally {
      setBroadcastSending(false);
    }
  };

  // ========================================================
  // RENDER: LOADING CHECK
  // ========================================================
  if (authChecking) {
    return (
      <div className="min-h-screen w-full bg-[#121212] text-white flex flex-col items-center justify-center p-6">
        <div className="w-9 h-9 border-2 border-zinc-700 border-t-white rounded-full animate-spin mb-4" />
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
          Verifying Admin Credentials...
        </p>
      </div>
    );
  }

  // ========================================================
  // RENDER: SECURE ADMIN LOGIN GATE
  // ========================================================
  if (!currentUser) {
    return (
      <div className="min-h-screen w-full bg-[#09090B] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#121212] border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Lock size={20} className="text-white" />
          </div>
          <h1 className="font-extrabold text-base sm:text-lg tracking-wider text-white uppercase font-mono">
            CURATED // ADMIN
          </h1>
          <p className="text-xs text-zinc-400 mt-1 mb-6">
            Restricted strictly to {REQUIRED_ADMIN_EMAIL}
          </p>

          {authError && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-400 text-xs mb-4 flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <button
            onClick={handleAdminGoogleLogin}
            disabled={isSigningIn}
            className="w-full min-h-[48px] bg-white text-zinc-900 font-bold text-xs tracking-wider rounded-xl flex items-center justify-center gap-3 cursor-pointer hover:bg-zinc-100 transition-colors disabled:opacity-60 uppercase"
          >
            {isSigningIn ? (
              <span>VERIFYING...</span>
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
  // RENDER: MOBILE-FIRST ADMIN SUITE
  // Fixed Bottom Bar with 4 tabs: Dashboard, Orders, Catalog, Drop Alerts
  // ========================================================
  return (
    <div className="min-h-screen w-full bg-[#F8F9FA] text-[#121212] relative overflow-x-hidden antialiased">
      
      {/* 1. Mobile Top Header */}
      <header className="sticky top-0 z-40 bg-[#121212]/95 backdrop-blur-md text-white border-b border-zinc-800/80 px-4 py-3">
        <div className="w-full max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm tracking-wider uppercase font-mono">
              NIKHIL ADMIN
            </span>
            <span className="bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck size={11} className="text-emerald-400" /> SECURE
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (onExit) onExit();
                else window.location.href = '/';
              }}
              className="bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/80 text-white rounded-lg px-2.5 py-1 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ExternalLink size={12} />
              <span>SHOP</span>
            </button>

            <button
              onClick={handleAdminLogout}
              title="Sign Out"
              className="bg-red-600/90 hover:bg-red-600 text-white rounded-lg p-1.5 text-xs font-bold flex items-center justify-center cursor-pointer transition-colors"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Tab Content Container */}
      <main
        className="w-full max-w-xl mx-auto px-4 py-4"
        style={{
          paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 16px))'
        }}
      >
        
        {/* Global Notifications */}
        {actionError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold mb-3 flex items-center gap-2 shadow-xs">
            <AlertTriangle size={15} className="shrink-0 text-red-600" />
            <span>{actionError}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold mb-3 flex items-center gap-2 shadow-xs">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ========================================================
            TAB 1: REAL-TIME DASHBOARD
        ======================================================== */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-col gap-4">
            
            {/* Header & Timeframe Filter */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h1 className="text-sm font-extrabold uppercase tracking-wider font-mono text-zinc-900">
                  OVERVIEW
                </h1>

                <button
                  onClick={() => {
                    fetchOrders();
                    fetchCatalog();
                  }}
                  className="px-2.5 py-1 bg-white border border-zinc-200 hover:border-zinc-300 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                  title="Refresh metrics"
                >
                  <RefreshCw size={12} className={loadingOrders || loadingProducts ? 'animate-spin' : ''} />
                  <span>REFRESH</span>
                </button>
              </div>

              {/* Native Clean Segmented Control */}
              <div className="grid grid-cols-4 bg-zinc-200/60 p-0.5 rounded-xl border border-zinc-200/80 gap-1">
                {[
                  { id: 'day', label: 'Day' },
                  { id: 'month', label: 'Month' },
                  { id: 'year', label: 'Year' },
                  { id: 'all', label: 'All' }
                ].map((tf) => (
                  <button
                    key={tf.id}
                    onClick={() => handleTimeframeChange(tf.id)}
                    className={`py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      revenueTimeframe === tf.id
                        ? 'bg-[#121212] text-white shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-900 bg-transparent'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Total Revenue Display Card */}
            <div className="bg-[#121212] text-white rounded-2xl p-5 shadow-sm border border-zinc-800 relative overflow-hidden">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase">
                  REVENUE ({revenueTimeframe.toUpperCase()})
                </span>
                <div className="w-7 h-7 rounded-full bg-emerald-950/80 border border-emerald-800 flex items-center justify-center">
                  <TrendingUp size={14} className="text-emerald-400" />
                </div>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                ₹{revenue.toLocaleString('en-IN')}
              </div>
            </div>

            {/* 2-Column Counts Grid: PACKED vs PENDING */}
            <div className="grid grid-cols-2 gap-3">
              
              {/* Packed Orders Card */}
              <div
                onClick={() => {
                  setActiveTab('orders');
                  setOrderStatusFilter('PACKED');
                }}
                className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs cursor-pointer hover:border-zinc-300 transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                    PACKED
                  </span>
                  <CheckCircle2 size={16} className="text-emerald-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2">
                  {packedCount}
                </div>
              </div>

              {/* Pending Orders Card */}
              <div
                onClick={() => {
                  setActiveTab('orders');
                  setOrderStatusFilter('PENDING');
                }}
                className={`bg-white rounded-2xl p-4 shadow-xs cursor-pointer transition-all flex flex-col justify-between ${
                  pendingCount > 0
                    ? 'border border-amber-300/80 bg-amber-50/15'
                    : 'border border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${
                    pendingCount > 0 ? 'text-amber-700' : 'text-zinc-500'
                  }`}>
                    PENDING
                  </span>
                  <Clock size={16} className={pendingCount > 0 ? 'text-amber-600' : 'text-zinc-400'} />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-zinc-900 mt-2">
                  {pendingCount}
                </div>
              </div>

            </div>

            {/* Catalog Count Summary Card */}
            <div
              onClick={() => setActiveTab('catalog')}
              className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs flex items-center justify-between cursor-pointer hover:border-zinc-300 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-100 rounded-xl text-zinc-800 flex items-center justify-center shrink-0">
                  <Package size={18} />
                </div>
                <div>
                  <div className="text-sm font-black text-zinc-900">
                    {catalogCount} Catalog Pieces
                  </div>
                  <div className="text-xs text-zinc-400">
                    Active inventory
                  </div>
                </div>
              </div>
              <ChevronRight size={18} className="text-zinc-400" />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2.5 mt-0.5">
              <button
                onClick={() => setActiveTab('catalog')}
                className="min-h-[46px] bg-[#121212] text-white rounded-xl text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer hover:bg-zinc-800 transition-colors shadow-xs"
              >
                <PlusCircle size={15} />
                <span>ADD PRODUCT</span>
              </button>

              <button
                onClick={() => setActiveTab('drop-alerts')}
                className="min-h-[46px] bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-xl text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <Bell size={15} />
                <span>DROP ALERT</span>
              </button>
            </div>

          </div>
        )}

        {/* ========================================================
            TAB 2: ORDERS TAB (STACKED CARDS + DIGITAL RECEIPT MODAL)
        ======================================================== */}
        {activeTab === 'orders' && (
          <div className="flex flex-col gap-3.5">
            
            {/* Header & Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold uppercase tracking-wider font-mono text-zinc-900">
                  ORDERS
                </h1>
                <span className="bg-zinc-200/80 text-zinc-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {orders.length}
                </span>
              </div>

              <button
                onClick={() => fetchOrders()}
                disabled={loadingOrders}
                className="px-2.5 py-1 bg-white border border-zinc-200 hover:border-zinc-300 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <RefreshCw size={12} className={loadingOrders ? 'animate-spin' : ''} />
                <span>REFRESH</span>
              </button>
            </div>

            {/* Search Input - Clean & Non-overlapping */}
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <Search size={15} />
              </div>
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search orders..."
                className="w-full h-10 bg-white border border-zinc-200 focus:border-zinc-800 rounded-xl pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none shadow-xs transition-colors"
              />
            </div>

            {/* Segmented Filter Pills */}
            <div className="grid grid-cols-3 bg-zinc-200/60 p-0.5 rounded-xl border border-zinc-200/80 gap-1">
              {['ALL', 'PENDING', 'PACKED'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setOrderStatusFilter(filter)}
                  className={`py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                    orderStatusFilter === filter
                      ? 'bg-[#121212] text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900 bg-transparent'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Stacked Mobile Order Cards */}
            {loadingOrders ? (
              <div className="py-12 text-center text-zinc-500 text-xs">
                <Loader2 size={22} className="animate-spin mx-auto mb-2 text-zinc-500" />
                Loading orders...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white border border-zinc-200 rounded-2xl p-8 text-center text-zinc-500 shadow-xs">
                <ShoppingBag size={28} className="mx-auto mb-2 text-zinc-300" />
                <p className="font-bold text-sm text-zinc-900">No matching orders</p>
                <p className="text-xs text-zinc-400 mt-1">
                  Customer orders will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredOrders.map((order) => {
                  const isPacked = (order.status || '').toUpperCase() === 'PACKED';
                  const isUpdating = updatingOrderId === order.id;
                  const dateStr = order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'N/A';

                  const firstItem = order.items?.[0];
                  const itemImg = order.product_image_url || firstItem?.image || firstItem?.image_url || firstItem?.images?.[0];

                  return (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className={`bg-white border rounded-2xl p-4 shadow-xs flex flex-col gap-3 cursor-pointer hover:border-zinc-300 transition-all ${
                        isPacked ? 'border-emerald-200/80 bg-emerald-50/10' : 'border-zinc-200'
                      }`}
                    >
                      {/* Top Row: Order ID & Date */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded-md">
                          #{order.order_number || order.id.slice(0, 8)}
                        </span>
                        <span className="text-xs font-medium text-zinc-400">
                          {dateStr}
                        </span>
                      </div>

                      {/* Middle Row: Customer Details & Total */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {itemImg ? (
                            <img
                              src={itemImg}
                              alt="Garment"
                              className="w-[52px] h-[64px] object-cover rounded-lg bg-zinc-100 shrink-0 border border-zinc-200 shadow-2xs"
                            />
                          ) : (
                            <div className="w-[52px] h-[64px] rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 text-zinc-400 border border-zinc-200">
                              <Package size={18} />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-sm text-zinc-900 truncate">
                              {order.customer_name || 'Customer'}
                            </div>
                            <div className="text-xs text-zinc-500 truncate mt-0.5">
                              {order.customer_email || 'No email provided'}
                            </div>
                            {firstItem?.name && (
                              <div className="text-[11px] text-zinc-600 truncate mt-0.5">
                                {firstItem.name} {order.items?.length > 1 ? `(+${order.items.length - 1} more)` : ''}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-black text-base text-zinc-900">
                            ₹{(parseFloat(order.total_amount) || 0).toLocaleString('en-IN')}
                          </div>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mt-0.5">
                            {order.payment_status || 'PAID'}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Row: iOS Toggle Switch with e.stopPropagation() */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isUpdating) handleTogglePacked(order, e);
                        }}
                        className={`min-h-[44px] flex items-center justify-between px-3.5 py-2 rounded-xl border transition-colors cursor-pointer select-none ${
                          isPacked
                            ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800'
                            : 'bg-zinc-100/80 border-zinc-200 text-zinc-600'
                        }`}
                      >
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {isPacked ? 'PACKED ✓' : 'PENDING'}
                        </span>

                        {/* Pixel-Perfect iOS Toggle Switch */}
                        <div
                          className={`w-12 h-6 rounded-full relative transition-colors duration-200 shrink-0 ${
                            isPacked ? 'bg-emerald-600' : 'bg-zinc-300'
                          }`}
                        >
                          <div
                            className={`w-[18px] h-[18px] rounded-full bg-white shadow-xs absolute top-[3px] transition-all duration-200 ${
                              isPacked ? 'left-[27px]' : 'left-[3px]'
                            }`}
                          />
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
            TAB 3: CATALOG TAB (QUICK PRODUCT ENTRY & DELETION)
        ======================================================== */}
        {activeTab === 'catalog' && (
          <div className="flex flex-col gap-4">
            
            {/* 1. Quick Mobile Product Entry Form */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex items-center gap-2 pb-3 mb-3.5 border-b border-zinc-100">
                <PlusCircle size={16} className="text-zinc-900 shrink-0" />
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-900 font-mono">
                  ADD NEW PRODUCT
                </h2>
              </div>

              <form onSubmit={handleAddProduct} className="flex flex-col gap-3.5">
                
                {/* Image Upload Area: No capture attribute so native camera/gallery selection appears */}
                <div>
                  <label className="text-xs font-bold text-zinc-900 block mb-1 uppercase tracking-wider">
                    PRODUCT IMAGE *
                  </label>
                  
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full min-h-[140px] border-2 border-dashed border-zinc-300 hover:border-zinc-400 rounded-xl bg-zinc-50 flex flex-col items-center justify-center p-4 cursor-pointer transition-colors"
                  >
                    {imagePreview ? (
                      <div className="relative w-full h-40">
                        <img
                          src={imagePreview}
                          alt="Product Preview"
                          className="w-full h-full object-contain rounded-lg"
                        />
                        <div className="absolute bottom-2 right-2 bg-black/85 text-white text-[10px] font-bold px-2 py-1 rounded-md">
                          TAP TO CHANGE
                        </div>
                      </div>
                    ) : (
                      <>
                        <Camera size={26} className="text-zinc-400 mb-1.5" />
                        <span className="text-sm font-bold text-zinc-800">
                          UPLOAD PRODUCT PHOTO
                        </span>
                        <span className="text-[11px] text-zinc-400 mt-0.5">
                          Camera or Gallery (Max 50MB)
                        </span>
                      </>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>

                {/* Title */}
                <div>
                  <label className="text-xs font-bold text-zinc-900 block mb-1 uppercase tracking-wider">
                    GARMENT TITLE *
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    value={productForm.title}
                    onChange={handleProductFormChange}
                    placeholder="e.g. Heavyweight Mineral Washed Boxy Tee"
                    className="w-full h-11 bg-white border border-zinc-200 focus:border-zinc-800 rounded-xl px-3 text-sm text-zinc-900 focus:outline-none shadow-xs transition-colors"
                  />
                </div>

                {/* Category & Condition Grade */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-zinc-900 block mb-1 uppercase tracking-wider">
                      CATEGORY *
                    </label>
                    <select
                      name="category"
                      value={productForm.category}
                      onChange={handleProductFormChange}
                      className="w-full h-11 bg-white border border-zinc-200 focus:border-zinc-800 rounded-xl px-3 text-sm text-zinc-900 focus:outline-none shadow-xs transition-colors"
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
                    <label className="text-xs font-bold text-zinc-900 block mb-1 uppercase tracking-wider">
                      CONDITION GRADE *
                    </label>
                    <select
                      name="conditionGrade"
                      value={productForm.conditionGrade}
                      onChange={handleProductFormChange}
                      className="w-full h-11 bg-white border border-zinc-200 focus:border-zinc-800 rounded-xl px-3 text-sm text-zinc-900 focus:outline-none shadow-xs transition-colors"
                    >
                      <option value="New / Unused">New / Unused</option>
                      <option value="Pristine">Pristine</option>
                      <option value="Excellent - Pre-Owned">Excellent - Pre-Owned</option>
                      <option value="Vintage Distressed">Vintage Distressed</option>
                      <option value="Good Pre-Owned">Good Pre-Owned</option>
                    </select>
                  </div>
                </div>

                {/* Selling Price & Original Price */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-zinc-900 block mb-1 uppercase tracking-wider">
                      SELLING PRICE (₹) *
                    </label>
                    <input
                      type="number"
                      name="sellingPrice"
                      required
                      min="1"
                      value={productForm.sellingPrice}
                      onChange={handleProductFormChange}
                      placeholder="1599"
                      className="w-full h-11 bg-white border border-zinc-200 focus:border-zinc-800 rounded-xl px-3 text-sm text-zinc-900 focus:outline-none shadow-xs transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-500 block mb-1 uppercase tracking-wider">
                      ORIGINAL PRICE (₹)
                    </label>
                    <input
                      type="number"
                      name="originalPrice"
                      min="1"
                      value={productForm.originalPrice}
                      onChange={handleProductFormChange}
                      placeholder="2999"
                      className="w-full h-11 bg-white border border-zinc-200 focus:border-zinc-800 rounded-xl px-3 text-sm text-zinc-900 focus:outline-none shadow-xs transition-colors"
                    />
                  </div>
                </div>

                {/* Delivery Charge */}
                <div>
                  <label className="text-xs font-bold text-zinc-500 block mb-1 uppercase tracking-wider">
                    DELIVERY CHARGE (₹)
                  </label>
                  <input
                    type="number"
                    name="deliveryCharge"
                    min="0"
                    value={productForm.deliveryCharge}
                    onChange={handleProductFormChange}
                    placeholder="0"
                    className="w-full h-11 bg-white border border-zinc-200 focus:border-zinc-800 rounded-xl px-3 text-sm text-zinc-900 focus:outline-none shadow-xs transition-colors"
                  />
                </div>

                {/* Measurements Grid (2x2) */}
                <div>
                  <label className="text-xs font-bold text-zinc-900 block mb-1 uppercase tracking-wider">
                    MEASUREMENTS (INCHES)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">Chest</span>
                      <input
                        type="number"
                        step="0.5"
                        name="chest"
                        value={productForm.chest}
                        onChange={handleProductFormChange}
                        placeholder="46"
                        className="w-full h-10 bg-white border border-zinc-200 rounded-lg px-2.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-800"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">Length</span>
                      <input
                        type="number"
                        step="0.5"
                        name="length"
                        value={productForm.length}
                        onChange={handleProductFormChange}
                        placeholder="29"
                        className="w-full h-10 bg-white border border-zinc-200 rounded-lg px-2.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-800"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">Shoulder</span>
                      <input
                        type="number"
                        step="0.5"
                        name="shoulder"
                        value={productForm.shoulder}
                        onChange={handleProductFormChange}
                        placeholder="21"
                        className="w-full h-10 bg-white border border-zinc-200 rounded-lg px-2.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-800"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">Sleeve</span>
                      <input
                        type="number"
                        step="0.5"
                        name="sleeve"
                        value={productForm.sleeve}
                        onChange={handleProductFormChange}
                        placeholder="10"
                        className="w-full h-10 bg-white border border-zinc-200 rounded-lg px-2.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Condition Notes */}
                <div>
                  <label className="text-xs font-bold text-zinc-900 block mb-1 uppercase tracking-wider">
                    CONDITION NOTES
                  </label>
                  <textarea
                    rows={2}
                    name="conditionNotes"
                    value={productForm.conditionNotes}
                    onChange={handleProductFormChange}
                    placeholder="Flawless archival piece, heavy collar ribbing."
                    className="w-full p-2.5 bg-white border border-zinc-200 focus:border-zinc-800 rounded-xl text-sm text-zinc-900 focus:outline-none shadow-xs transition-colors"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submittingProduct}
                  className="w-full h-12 bg-[#121212] text-white rounded-xl text-xs font-extrabold tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer hover:bg-zinc-800 transition-colors disabled:opacity-60 shadow-xs mt-1"
                >
                  {submittingProduct ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>UPLOADING TO SUPABASE...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle size={15} />
                      <span>PUBLISH 1-OF-1 PIECE</span>
                    </>
                  )}
                </button>

              </form>
            </div>

            {/* 2. Existing Catalog List & Deletion */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-zinc-900 font-mono">
                    PRODUCTS
                  </h2>
                  <span className="bg-zinc-200/80 text-zinc-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {products.length}
                  </span>
                </div>

                <button
                  onClick={fetchCatalog}
                  disabled={loadingProducts}
                  className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RefreshCw size={11} className={loadingProducts ? 'animate-spin' : ''} />
                  <span>REFRESH</span>
                </button>
              </div>

              {loadingProducts ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  <Loader2 size={18} className="animate-spin mx-auto mb-2 text-zinc-500" />
                  Loading products...
                </div>
              ) : products.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  No products in catalog yet.
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {products.map((item) => {
                    const img = Array.isArray(item.images)
                      ? (item.images[0] || item.image_url)
                      : (item.images || item.image_url || '');

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2.5 border border-zinc-200 rounded-xl bg-white gap-3 hover:border-zinc-300 transition-colors"
                      >
                        {img ? (
                          <img
                            src={img}
                            alt={item.name}
                            className="w-[52px] h-[64px] object-cover rounded-lg bg-zinc-100 shrink-0 border border-zinc-200 shadow-2xs"
                          />
                        ) : (
                          <div className="w-[52px] h-[64px] rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-400 shrink-0 border border-zinc-200">
                            <Package size={18} />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">
                            {item.sku || item.category_id}
                          </span>
                          <div className="text-xs font-bold text-zinc-900 truncate mt-0.5">
                            {item.name}
                          </div>
                          <div className="text-xs font-black text-zinc-900 mt-0.5">
                            ₹{(parseFloat(item.selling_price) || 0).toLocaleString('en-IN')}
                          </div>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteProduct(item)}
                          title="Delete piece"
                          aria-label={`Delete ${item.name}`}
                          className="w-10 h-10 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-200 rounded-xl flex items-center justify-center cursor-pointer transition-colors shrink-0"
                        >
                          <Trash2 size={15} />
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
            TAB 4: DROP ALERTS TAB (BROADCAST BLAST)
        ======================================================== */}
        {activeTab === 'drop-alerts' && (
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2 min-w-0">
                <Bell size={16} className="text-zinc-900 shrink-0" />
                <h1 className="text-sm font-extrabold uppercase tracking-wider text-zinc-900 font-mono truncate">
                  DROP ALERTS
                </h1>
              </div>
              <span className="text-[10px] font-bold tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-200 px-2 py-0.5 rounded-full uppercase shrink-0">
                EMAIL BLAST
              </span>
            </div>

            <p className="text-xs text-zinc-500 mb-4">
              Send a drop announcement to all email subscribers.
            </p>

            {/* Status Feedback */}
            {broadcastStatus?.type === 'success' && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold mb-3.5 flex items-center gap-2 shadow-xs">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                <span>{broadcastStatus.text}</span>
              </div>
            )}

            {broadcastStatus?.type === 'error' && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-red-700 text-xs font-semibold mb-3.5 flex items-center gap-2 shadow-xs">
                <AlertTriangle size={16} className="shrink-0 text-red-600" />
                <span>{broadcastStatus.text}</span>
              </div>
            )}

            <form onSubmit={handleSendBroadcast} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1.5 uppercase tracking-wider">
                  SUBJECT *
                </label>
                <input
                  type="text"
                  required
                  value={broadcastSubject}
                  onChange={(e) => setBroadcastSubject(e.target.value)}
                  disabled={broadcastSending}
                  placeholder="e.g. DROP 05: ARCHIVAL PIECES ARE LIVE"
                  className="w-full h-11 bg-white border border-zinc-200 focus:border-zinc-800 rounded-xl px-3.5 text-sm text-zinc-900 focus:outline-none disabled:bg-zinc-100 shadow-xs transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1.5 uppercase tracking-wider">
                  MESSAGE CONTENT *
                </label>
                <textarea
                  rows={5}
                  required
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  disabled={broadcastSending}
                  placeholder="Enter the drop alert announcement for subscribers..."
                  className="w-full p-3.5 bg-white border border-zinc-200 focus:border-zinc-800 rounded-xl text-sm text-zinc-900 focus:outline-none disabled:bg-zinc-100 resize-y shadow-xs transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={broadcastSending}
                className="w-full h-12 bg-[#121212] text-white rounded-xl text-xs font-extrabold tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer hover:bg-zinc-800 transition-colors disabled:opacity-60 shadow-xs mt-1"
              >
                {broadcastSending ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>SEND DROP ALERT BLAST</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

      </main>

      {/* ========================================================
          3. DIGITAL RECEIPT MODAL OVERLAY (DARK-THEMED TICKET STYLE)
          Directly matching Image 2 reference:
          - Centered Total Payment
          - Sleek 2x2 grid cards (Ref Number, Payment Time, Customer Name, Phone Number)
          - Shipping Address & Customer Email in matching subtle dark cards
          - "Get PDF Receipt" action button with download icon
          - Scalloped circular perforated receipt bottom tear
      ======================================================== */}
      {selectedOrder && (
        <div
          onClick={() => setSelectedOrder(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-none"
        >
          {/* Ticket Card Container */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm sm:max-w-md my-auto flex flex-col drop-shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Ticket Card Body */}
            <div className="bg-[#141518] text-white rounded-t-3xl pt-7 px-5 pb-2 relative border-t border-x border-zinc-800/60 flex flex-col max-h-[85vh]">
              
              {/* Top Right Subtle Close Button */}
              <button
                onClick={() => setSelectedOrder(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/60 cursor-pointer transition-colors"
                aria-label="Close receipt"
              >
                <X size={18} />
              </button>

              {/* Scrollable Receipt Body */}
              <div className="overflow-y-auto flex-1 overscroll-contain pr-0.5 space-y-3.5">
                
                {/* 1. Centered Total Payment Section */}
                <div className="text-center pt-1 pb-1">
                  <span className="text-xs text-zinc-400 font-medium tracking-wide">
                    Total Payment
                  </span>
                  <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-1">
                    ₹{(parseFloat(selectedOrder.total_amount) || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      (selectedOrder.status || '').toUpperCase() === 'PACKED'
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                        : 'bg-zinc-800 text-amber-300 border border-zinc-700'
                    }`}>
                      {selectedOrder.status === 'PACKED' ? 'PACKED ✓' : 'PENDING PACKING'}
                    </span>
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                      {selectedOrder.payment_status || 'PAID'}
                    </span>
                  </div>
                </div>

                {/* Optional Product Piece Bar */}
                {(() => {
                  const firstItem = selectedOrder.items?.[0] || {};
                  const productThumb = selectedOrder.product_image_url || firstItem.image || firstItem.image_url || firstItem.images?.[0];
                  const productTitle = firstItem.name;

                  if (!productTitle && !productThumb) return null;

                  return (
                    <div className="flex items-center gap-3 bg-zinc-800/35 border border-zinc-800/90 rounded-2xl p-2.5 text-left">
                      {productThumb ? (
                        <img
                          src={productThumb}
                          alt={productTitle || 'Piece'}
                          className="w-10 h-12 object-cover rounded-lg bg-zinc-800 border border-zinc-700/60 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-12 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-400 shrink-0">
                          <Package size={16} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">
                          {productTitle || 'Archival Streetwear Piece'}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          {firstItem.size || 'One Size'} • 1-of-1 Piece
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. 2x2 Grid: Ref Number, Payment Time, Customer Name, Phone Number */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Cell 1: Ref Number */}
                  <div className="bg-zinc-800/35 border border-zinc-800/90 p-3 sm:p-3.5 rounded-2xl text-left">
                    <span className="text-[11px] text-zinc-400 font-medium block">
                      Ref Number
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-semibold text-white truncate block mt-1">
                      #{selectedOrder.order_number || selectedOrder.id.slice(0, 8)}
                    </span>
                  </div>

                  {/* Cell 2: Payment Time */}
                  <div className="bg-zinc-800/35 border border-zinc-800/90 p-3 sm:p-3.5 rounded-2xl text-left">
                    <span className="text-[11px] text-zinc-400 font-medium block">
                      Payment Time
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-white truncate block mt-1">
                      {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      }) : 'N/A'}
                    </span>
                  </div>

                  {/* Cell 3: Customer Name */}
                  <div className="bg-zinc-800/35 border border-zinc-800/90 p-3 sm:p-3.5 rounded-2xl text-left">
                    <span className="text-[11px] text-zinc-400 font-medium block">
                      Customer Name
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-white truncate block mt-1">
                      {selectedOrder.customer_name || 'Customer'}
                    </span>
                  </div>

                  {/* Cell 4: Phone Number */}
                  <div className="bg-zinc-800/35 border border-zinc-800/90 p-3 sm:p-3.5 rounded-2xl text-left">
                    <span className="text-[11px] text-zinc-400 font-medium block">
                      Phone Number
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-white truncate block mt-1">
                      {selectedOrder.phone_number || selectedOrder.shipping_address?.phone || selectedOrder.customer_phone || selectedOrder.phone || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* 3. Shipping Address & Customer Email */}
                <div className="flex flex-col gap-2.5">
                  {/* Shipping Address */}
                  <div className="bg-zinc-800/35 border border-zinc-800/90 p-3 sm:p-3.5 rounded-2xl text-left">
                    <span className="text-[11px] text-zinc-400 font-medium block mb-1">
                      Shipping Address
                    </span>
                    <div className="text-xs font-medium text-zinc-200 leading-relaxed">
                      {(() => {
                        const addr = selectedOrder.shipping_address;
                        if (!addr) return 'No shipping address recorded';
                        if (typeof addr === 'string') return addr;
                        if (typeof addr === 'object') {
                          const line1 = addr.address || addr.street || addr.line1 || '';
                          const city = addr.city || '';
                          const state = addr.state || '';
                          const pin = addr.pincode || addr.postal_code || addr.zip || '';
                          const parts = [line1, city, state, pin].filter(Boolean);
                          return parts.length > 0 ? parts.join(', ') : 'No physical address details';
                        }
                        return 'No shipping address recorded';
                      })()}
                    </div>
                  </div>

                  {/* Customer Email */}
                  <div className="bg-zinc-800/35 border border-zinc-800/90 p-3 sm:p-3.5 rounded-2xl text-left">
                    <span className="text-[11px] text-zinc-400 font-medium block mb-1">
                      Customer Email
                    </span>
                    <div className="text-xs font-mono font-medium text-zinc-200 break-all">
                      {selectedOrder.customer_email || selectedOrder.email || 'No email address on file'}
                    </div>
                  </div>
                </div>

                {/* 4. Action Button: "Get PDF Receipt" (Matching Image 2) */}
                <div className="pt-2 pb-1">
                  <button
                    onClick={() => window.print()}
                    className="w-full py-3 flex items-center justify-center gap-2 text-zinc-300 hover:text-white font-medium text-xs sm:text-sm cursor-pointer transition-colors group"
                  >
                    <Download size={16} className="text-zinc-400 group-hover:text-white transition-colors" />
                    <span>Get PDF Receipt</span>
                  </button>
                </div>

              </div>

            </div>

            {/* Scalloped Perforated Bottom Tear (Matching Image 2 Semicircular Teeth) */}
            <div className="w-full overflow-hidden leading-none select-none">
              <svg
                viewBox="0 0 400 10"
                preserveAspectRatio="none"
                className="w-full h-2.5 sm:h-3 text-[#141518] fill-current block -mt-px filter drop-shadow-[0_4px_4px_rgba(0,0,0,0.3)]"
              >
                <path d="M 0 0 a 8 8 0 0 0 16 0 a 8 8 0 0 0 16 0 a 8 8 0 0 0 16 0 a 8 8 0 0 0 16 0 a 8 8 0 0 0 16 0 a 8 8 0 0 0 16 0 a 8 8 0 0 0 16 0 a 8 8 0 0 0 16 0 a 8 8 0 0 0 16 0 a 8 8 0 0 0 16 0 a 8 8 0 0 0 16 0 a 8 8 0 0 0 16 0 a 8 8 0 0 0 16 0 a 8 8 0 0 0 16 0 a 8 8 0 0 0 16 0 a 8 8 0 0 0 16 0 a 8 8 0 0 0 16 0 a 8 8 0 0 0 16 0 a 8 8 0 0 0 16 0 a 8 8 0 0 0 16 0 a 8 8 0 0 0 16 0 a 8 8 0 0 0 16 0 a 8 8 0 0 0 16 0 a 8 8 0 0 0 16 0 a 8 8 0 0 0 16 0 L 0 0 Z" />
              </svg>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          4. MOBILE-FIRST FIXED BOTTOM NAVIGATION BAR
          Tabs: Dashboard, Orders, Catalog, Alerts
          With iPhone Safe-Area-Inset Support
      ======================================================== */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B0B0C]/95 backdrop-blur-md border-t border-zinc-800/80"
        style={{
          height: 'calc(62px + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)'
        }}
      >
        <div className="w-full max-w-md mx-auto h-full flex items-center justify-around px-2">
          {/* Tab 1: Dashboard */}
          <button
            onClick={() => setActiveTab('dashboard')}
            aria-label="Dashboard"
            className={`flex-1 h-full flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
              activeTab === 'dashboard' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <LayoutDashboard size={19} className={activeTab === 'dashboard' ? 'text-white' : 'text-zinc-500'} />
            <span className={`text-[10px] tracking-wider uppercase whitespace-nowrap ${activeTab === 'dashboard' ? 'font-black' : 'font-medium'}`}>
              Dashboard
            </span>
          </button>

          {/* Tab 2: Orders */}
          <button
            onClick={() => setActiveTab('orders')}
            aria-label="Orders"
            className={`flex-1 h-full flex flex-col items-center justify-center gap-1 cursor-pointer relative transition-colors ${
              activeTab === 'orders' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <div className="relative">
              <ShoppingBag size={19} className={activeTab === 'orders' ? 'text-white' : 'text-zinc-500'} />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                  {pendingCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] tracking-wider uppercase whitespace-nowrap ${activeTab === 'orders' ? 'font-black' : 'font-medium'}`}>
              Orders
            </span>
          </button>

          {/* Tab 3: Catalog */}
          <button
            onClick={() => setActiveTab('catalog')}
            aria-label="Catalog"
            className={`flex-1 h-full flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
              activeTab === 'catalog' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Package size={19} className={activeTab === 'catalog' ? 'text-white' : 'text-zinc-500'} />
            <span className={`text-[10px] tracking-wider uppercase whitespace-nowrap ${activeTab === 'catalog' ? 'font-black' : 'font-medium'}`}>
              Catalog
            </span>
          </button>

          {/* Tab 4: Alerts */}
          <button
            onClick={() => setActiveTab('drop-alerts')}
            aria-label="Alerts"
            className={`flex-1 h-full flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
              activeTab === 'drop-alerts' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Bell size={19} className={activeTab === 'drop-alerts' ? 'text-white' : 'text-zinc-500'} />
            <span className={`text-[10px] tracking-wider uppercase whitespace-nowrap ${activeTab === 'drop-alerts' ? 'font-black' : 'font-medium'}`}>
              Alerts
            </span>
          </button>
        </div>
      </nav>

    </div>
  );
}
