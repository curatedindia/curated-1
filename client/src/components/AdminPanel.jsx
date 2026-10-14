import React, { useState, useEffect } from 'react';
import {
  Package,
  ShoppingBag,
  TrendingUp,
  Clock,
  AlertTriangle,
  Plus,
  CheckCircle,
  FileSpreadsheet,
  Settings,
  RefreshCw,
  Camera,
  Trash2,
  Edit,
  DollarSign,
  Truck,
  RotateCcw,
  ShieldCheck,
  Zap,
  Play
} from 'lucide-react';

export default function AdminPanel({ onExitAdmin }) {
  const [activeTab, setActiveTab] = useState('DASHBOARD'); // 'DASHBOARD' | 'PRODUCTS' | 'ADD_PRODUCT' | 'ORDERS' | 'OFFLINE_MODAL' | 'EXCEPTIONS' | 'LEDGER' | 'SETTINGS' | 'CONCURRENCY_TEST'
  const [dashboardData, setDashboardData] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Remembered defaults for fast mobile product entry (ADM-07)
  const [rememberedDefaults, setRememberedDefaults] = useState({
    category_id: 't-shirts',
    subcategory_id: 'plain',
    condition: 'New / Unused',
    source_type: 'Brand Surplus',
    source_name: 'Standard Sourcing Lot',
    lot_ref: 'LOT-2026-OCT',
    qc_passed: true,
    fit: 'Regular',
    fabric: '100% Cotton (220 GSM)'
  });

  // Fast Add Product Form state
  const [productForm, setProductForm] = useState({
    name: '',
    category_id: 't-shirts',
    subcategory_id: 'plain',
    description: 'Heavyweight handpicked piece in pristine condition.',
    fabric: '100% Cotton (220 GSM)',
    fit: 'Regular',
    care: 'Cold wash inside out, hang dry in shade.',
    condition: 'New / Unused',
    condition_notes: 'Flawless condition, verified neckline tension.',
    selling_price: 799,
    original_price: 1599,
    cost_price: 280,
    source_type: 'Brand Surplus',
    source_name: 'Standard Sourcing Lot',
    lot_ref: 'LOT-2026-OCT',
    acquisition_date: new Date().toISOString().split('T')[0],
    qc_passed: true,
    qc_notes: 'Inspected under high daylight',
    is_new_drop: true,
    status: 'ACTIVE',
    size: 'L',
    stock_on_hand: 1,
    measurements: { chest: 44, length: 29, shoulder: 20, sleeve: 9, unit: 'in' },
    images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80']
  });
  const [publishingErrors, setPublishingErrors] = useState([]);

  // Offline Sale Modal State (2 Taps - INV-19)
  const [offlineModalProduct, setOfflineModalProduct] = useState(null);
  const [offlineSaleForm, setOfflineSaleForm] = useState({
    actual_sale_price: 0,
    payment_mode: 'UPI',
    notes: '',
    force_override_hold: false
  });
  const [offlineHoldWarning, setOfflineHoldWarning] = useState(null);

  // Concurrency Test state (UAT-14)
  const [concurrencyResult, setConcurrencyResult] = useState(null);
  const [concurrencyRunning, setConcurrencyRunning] = useState(false);

  // Order Details Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [courierInput, setCourierInput] = useState({ courier: 'BlueDart Express', tracking_number: '', tracking_url: 'https://www.bluedart.com' });

  // Exception Case Modal
  const [exceptionModalCase, setExceptionModalCase] = useState(null);

  useEffect(() => {
    fetchAllAdminData();
  }, []);

  const fetchAllAdminData = async () => {
    setLoading(true);
    try {
      const [dashRes, prodRes, ordRes, ledRes, setRes, excRes] = await Promise.all([
        fetch('/api/admin/dashboard'),
        fetch('/api/products?is_admin=true'),
        fetch('/api/orders'),
        fetch('/api/inventory/ledger'),
        fetch('/api/settings'),
        fetch('/api/exceptions')
      ]);

      const [dashData, prodData, ordData, ledData, setData, excData] = await Promise.all([
        dashRes.json(),
        prodRes.json(),
        ordRes.json(),
        ledRes.json(),
        setRes.json(),
        excRes.json()
      ]);

      if (dashData.success) setDashboardData(dashData);
      if (prodData.success) setProducts(prodData.products);
      if (ordData.success) setOrders(ordData.orders);
      if (ledData.success) setLedger(ledData.transactions);
      if (setData.success) setSettings(setData.settings);
      if (excData.success) setExceptions(excData.exceptions);
    } catch (err) {
      console.error('Admin data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const showStatus = (msg) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 4000);
  };

  // Handle Image File Upload (Camera / Gallery)
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('image', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (data.success) {
        setProductForm((prev) => ({
          ...prev,
          images: [data.url, ...prev.images]
        }));
        showStatus('Image uploaded from device successfully!');
      }
    } catch (err) {
      showStatus('Upload failed');
    }
  };

  // Create Product with PC-12 Validator
  const handleSaveProduct = async (statusToSet = 'ACTIVE') => {
    setPublishingErrors([]);
    setLoading(true);

    const payload = {
      ...productForm,
      status: statusToSet,
      ...rememberedDefaults
    };

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.failedChecks) {
          setPublishingErrors(data.failedChecks);
        } else {
          setPublishingErrors([data.message || 'Error creating product']);
        }
        setLoading(false);
        return;
      }

      showStatus(`Created product ${data.product.sku} successfully!`);
      // Update remembered defaults for rapid subsequent entry (ADM-07)
      setRememberedDefaults((prev) => ({
        ...prev,
        category_id: productForm.category_id,
        subcategory_id: productForm.subcategory_id,
        condition: productForm.condition,
        source_type: productForm.source_type,
        source_name: productForm.source_name,
        lot_ref: productForm.lot_ref
      }));

      // Reset title & price for next entry
      setProductForm((prev) => ({
        ...prev,
        name: '',
        selling_price: 799
      }));

      fetchAllAdminData();
      setActiveTab('PRODUCTS');
    } catch (err) {
      setPublishingErrors(['Network error creating product']);
    } finally {
      setLoading(false);
    }
  };

  // 2-Tap Offline Sale ("Mark as Sold" - INV-19)
  const openOfflineModal = (product) => {
    const variant = product.variants?.[0];
    setOfflineModalProduct({ product, variant });
    setOfflineSaleForm({
      actual_sale_price: product.selling_price,
      payment_mode: 'UPI',
      notes: '',
      force_override_hold: false
    });
    setOfflineHoldWarning(null);
  };

  const handleConfirmOfflineSale = async () => {
    if (!offlineModalProduct) return;
    setLoading(true);

    try {
      const res = await fetch('/api/inventory/offline-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: offlineModalProduct.product.id,
          variant_id: offlineModalProduct.variant.id,
          actual_sale_price: offlineSaleForm.actual_sale_price,
          payment_mode: offlineSaleForm.payment_mode,
          notes: offlineSaleForm.notes,
          force_override_hold: offlineSaleForm.force_override_hold
        })
      });
      const data = await res.json();

      if (data.warning_hold && !offlineSaleForm.force_override_hold) {
        // Online hold warning (INV-22)
        setOfflineHoldWarning(data.message);
        setLoading(false);
        return;
      }

      if (!res.ok || !data.success) {
        showStatus(data.message || 'Offline sale error');
        setLoading(false);
        return;
      }

      showStatus(`Recorded offline sale ${data.order.order_number}! Stock decremented.`);
      setOfflineModalProduct(null);
      fetchAllAdminData();
    } catch (err) {
      showStatus('Network error recording offline sale.');
    } finally {
      setLoading(false);
    }
  };

  // Void Mistaken Offline Sale (INV-23)
  const handleVoidOfflineSale = async (orderId) => {
    const reason = prompt('Please specify mandatory reason for voiding this offline sale:');
    if (!reason) return;

    try {
      const res = await fetch('/api/inventory/void-offline-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, void_reason: reason })
      });
      const data = await res.json();
      if (data.success) {
        showStatus('Offline sale successfully voided and stock restored to ledger.');
        fetchAllAdminData();
      } else {
        showStatus(data.message || 'Error voiding sale');
      }
    } catch (err) {
      showStatus('Network error voiding sale');
    }
  };

  // Update Order Status to SHIPPED with Tracking
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_status: newStatus,
          courier: courierInput.courier,
          tracking_number: courierInput.tracking_number,
          tracking_url: courierInput.tracking_url
        })
      });
      const data = await res.json();
      if (data.success) {
        showStatus(`Order moved to ${newStatus}`);
        setSelectedOrder(null);
        fetchAllAdminData();
      }
    } catch (err) {
      showStatus('Error updating order');
    }
  };

  // Inspect Returned Exception Item (RET-10)
  const handleInspectReturn = async (excId, result) => {
    const notes = prompt(`Enter inspection notes for ${result}:`);
    try {
      const res = await fetch(`/api/exceptions/${excId}/inspect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result, notes })
      });
      const data = await res.json();
      if (data.success) {
        showStatus(`Return inspection processed: ${result}`);
        setExceptionModalCase(null);
        fetchAllAdminData();
      }
    } catch (err) {
      showStatus('Inspection error');
    }
  };

  // Save Settings (ADM-16)
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        showStatus('Store settings updated successfully!');
      }
    } catch (err) {
      showStatus('Settings update failed');
    }
  };

  // Run Concurrency Mutex Race Test (UAT-14: 20 Parallel Purchases on 1 Stock)
  const runConcurrencyTest = async () => {
    setConcurrencyRunning(true);
    setConcurrencyResult(null);
    try {
      const res = await fetch('/api/test/parallel-purchase', { method: 'POST' });
      const data = await res.json();
      setConcurrencyResult(data);
    } catch (err) {
      showStatus('Failed to run concurrency race test');
    } finally {
      setConcurrencyRunning(false);
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)', paddingBottom: '60px' }}>
      {/* Admin Top Navigation */}
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="brand-font" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--sage-light)' }}>
            CURATED CONTROL
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>| Single Admin Console</span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchAllAdminData} className="btn btn-secondary" style={{ height: '36px', padding: '0 12px' }}>
            <RefreshCw size={14} />
            <span>Sync</span>
          </button>
          <button onClick={onExitAdmin} className="btn btn-primary" style={{ height: '36px', padding: '0 14px' }}>
            Exit to Storefront
          </button>
        </div>
      </div>

      {/* Status Toast */}
      {statusMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: 'var(--sage-primary)',
          color: '#FFFFFF',
          padding: '12px 20px',
          borderRadius: 'var(--radius-sm)',
          fontWeight: 700,
          fontSize: '13px',
          boxShadow: 'var(--shadow-md)',
          zIndex: 400
        }}>
          {statusMessage}
        </div>
      )}

      {/* Tab Navigation Menu */}
      <div className="container" style={{ paddingTop: '20px' }}>
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '24px'
        }}>
          {[
            { id: 'DASHBOARD', label: 'Dashboard' },
            { id: 'PRODUCTS', label: `Catalog (${products.length})` },
            { id: 'ADD_PRODUCT', label: '+ Quick Product Entry' },
            { id: 'ORDERS', label: `Orders (${orders.length})` },
            { id: 'EXCEPTIONS', label: `Exceptions (${exceptions.length})` },
            { id: 'LEDGER', label: 'Ledger Audit' },
            { id: 'SETTINGS', label: 'Settings' },
            { id: 'CONCURRENCY_TEST', label: 'Race Test (UAT-14)' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
                background: activeTab === tab.id ? 'var(--sage-primary)' : 'var(--bg-secondary)',
                color: activeTab === tab.id ? '#FFFFFF' : 'var(--text-secondary)',
                border: `1px solid ${activeTab === tab.id ? 'var(--sage-primary)' : 'var(--border-subtle)'}`,
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ========================================================
            TAB 1: DASHBOARD
        ======================================================== */}
        {activeTab === 'DASHBOARD' && dashboardData && (
          <div>
            {/* KPI Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>LIVE PIECES</span>
                <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px' }}>
                  {dashboardData.stats?.live_pieces}
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL SOLD (UNITS)</span>
                <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--sage-light)', marginTop: '6px' }}>
                  {dashboardData.stats?.total_sold}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Online: {dashboardData.stats?.sold_online} • Offline: {dashboardData.stats?.sold_offline}
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GROSS REVENUE</span>
                <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--sage-light)', marginTop: '6px' }}>
                  ₹{dashboardData.stats?.gross_revenue?.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  AOV: ₹{dashboardData.stats?.aov?.toLocaleString('en-IN')}
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ORDERS TO PACK</span>
                <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--olive-light)', marginTop: '6px' }}>
                  {dashboardData.stats?.orders_to_pack}
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AGING STOCK (&gt;30D)</span>
                <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--accent-red)', marginTop: '6px' }}>
                  {dashboardData.stats?.aging_stock_count}
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Activity */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
              {/* Action Queue */}
              <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Truck size={18} color="var(--sage-light)" />
                  <span>Orders to Pack & Ship ({dashboardData.orders_to_pack_list?.length})</span>
                </h3>

                {dashboardData.orders_to_pack_list?.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>All confirmed orders have been dispatched.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {dashboardData.orders_to_pack_list?.map((ord) => (
                      <div key={ord.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700 }}>{ord.order_number} ({ord.customer?.name})</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ord.customer?.city} • ₹{ord.total}</div>
                        </div>
                        <button onClick={() => { setSelectedOrder(ord); setActiveTab('ORDERS'); }} className="btn btn-secondary" style={{ height: '32px', fontSize: '11px', padding: '0 10px' }}>
                          Pack & Ship
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Activity Log */}
              <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>
                  Recent System & Ledger Activity
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                  {dashboardData.recent_activity?.map((act) => (
                    <div key={act.id} style={{ fontSize: '12px', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--sage-light)', fontWeight: 600 }}>
                        <span>{act.action}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{new Date(act.time).toLocaleTimeString()}</span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>{act.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: PRODUCTS CATALOG MANAGEMENT
        ======================================================== */}
        {activeTab === 'PRODUCTS' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>CATALOG ({products.length})</h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <a href="/api/export/csv" className="btn btn-secondary" style={{ height: '40px' }}>
                  <FileSpreadsheet size={15} />
                  <span>Export CSV</span>
                </a>
                <button onClick={() => setActiveTab('ADD_PRODUCT')} className="btn btn-primary" style={{ height: '40px' }}>
                  <Plus size={16} />
                  <span>+ Add Product</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {products.map((prod) => {
                const isSold = prod.status === 'SOLD_OUT' || prod.total_on_hand <= 0;
                const isHeld = !isSold && prod.total_available === 0 && prod.total_reserved > 0;
                return (
                  <div
                    key={prod.id}
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '14px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    <img
                      src={prod.images?.[0]}
                      alt={prod.name}
                      style={{ width: '56px', height: '70px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }}
                    />

                    <div style={{ flexGrow: 1, minWidth: '220px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--sage-light)', fontWeight: 700, fontFamily: 'monospace' }}>
                          {prod.sku}
                        </span>
                        <span className={`subtle-badge ${isSold ? 'badge-sold' : isHeld ? 'badge-hold' : 'badge-new'}`}>
                          {prod.status} {isHeld && '(HELD)'}
                        </span>
                        {prod.is_new_drop && <span className="subtle-badge badge-preowned">NEW DROP</span>}
                      </div>
                      <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '3px' }}>
                        {prod.name}
                      </h4>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Source: {prod.source_type} ({prod.lot_ref}) • Cost: ₹{prod.cost_price} • Price: ₹{prod.selling_price} • Stock: {prod.total_on_hand}
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {/* Mark as Sold in 2 taps (INV-19) */}
                      {!isSold && (
                        <button
                          onClick={() => openOfflineModal(prod)}
                          className="btn btn-primary"
                          style={{ height: '36px', fontSize: '11.5px', padding: '0 12px' }}
                        >
                          <DollarSign size={14} />
                          <span>Mark as Sold</span>
                        </button>
                      )}

                      <button
                        onClick={async () => {
                          const newPrice = prompt(`Enter new selling price for ${prod.sku}:`, prod.selling_price);
                          if (newPrice && !isNaN(Number(newPrice))) {
                            await fetch(`/api/products/${prod.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ selling_price: Number(newPrice) })
                            });
                            fetchAllAdminData();
                          }
                        }}
                        className="btn btn-secondary"
                        style={{ height: '36px', fontSize: '11.5px', padding: '0 10px' }}
                      >
                        Edit Price
                      </button>

                      <button
                        onClick={async () => {
                          const addStock = prompt(`Add stock for ${prod.sku}:`, '1');
                          if (addStock && !isNaN(Number(addStock))) {
                            const variant = prod.variants?.[0];
                            if (variant) {
                              await fetch('/api/inventory/adjust', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ variant_id: variant.id, quantity_change: Number(addStock), reason: 'Restock' })
                              });
                              fetchAllAdminData();
                            }
                          }
                        }}
                        className="btn btn-secondary"
                        style={{ height: '36px', fontSize: '11.5px', padding: '0 10px' }}
                      >
                        Restock
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: QUICK MOBILE PRODUCT ENTRY (+ PC-12 VALIDATOR)
        ======================================================== */}
        {activeTab === 'ADD_PRODUCT' && (
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>
              QUICK MOBILE PRODUCT ENTRY
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Optimized for mobile drops (40–50 items). Remembers your last supplier, condition, and lot reference.
            </p>

            {/* Publishing Validation Errors (PC-12) */}
            {publishingErrors.length > 0 && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '16px',
                marginBottom: '20px',
                color: 'var(--accent-red)',
                fontSize: '13px'
              }}>
                <div style={{ fontWeight: 700, marginBottom: '6px' }}>PC-12 Publishing Gates Failed:</div>
                <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {publishingErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {/* Photo Upload from Camera or Gallery */}
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                  GARMENT PHOTOGRAPHY (CAMERA / GALLERY) *
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <label className="btn btn-secondary" style={{ cursor: 'pointer', height: '44px' }}>
                    <Camera size={18} color="var(--sage-light)" />
                    <span>Take Photo / Select File</span>
                    <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} style={{ display: 'none' }} />
                  </label>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {productForm.images?.length} image(s) loaded
                  </span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>GARMENT TITLE *</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="e.g. Heavyweight Mineral Washed Boxy Tee"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>CATEGORY *</label>
                  <select
                    value={productForm.category_id}
                    onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                  >
                    <option value="t-shirts">T-Shirts</option>
                    <option value="shirts">Shirts</option>
                    <option value="jackets">Jackets</option>
                    <option value="hoodies">Hoodies</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>CONDITION GRADE *</label>
                  <select
                    value={productForm.condition}
                    onChange={(e) => setProductForm({ ...productForm, condition: e.target.value })}
                  >
                    <option value="New / Unused">New / Unused</option>
                    <option value="Excellent - Pre-Owned">Excellent - Pre-Owned</option>
                    <option value="Very Good - Pre-Owned">Very Good - Pre-Owned</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>SELLING PRICE (₹) *</label>
                  <input
                    type="number"
                    value={productForm.selling_price}
                    onChange={(e) => setProductForm({ ...productForm, selling_price: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>ORIGINAL PRICE (₹)</label>
                  <input
                    type="number"
                    value={productForm.original_price}
                    onChange={(e) => setProductForm({ ...productForm, original_price: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>INTERNAL COST (₹)</label>
                  <input
                    type="number"
                    value={productForm.cost_price}
                    onChange={(e) => setProductForm({ ...productForm, cost_price: e.target.value })}
                  />
                </div>
              </div>

              {/* Exact Measurements Input */}
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  PHYSICAL MEASUREMENTS (INCHES) *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Chest (e.g. 44)"
                    value={productForm.measurements.chest}
                    onChange={(e) => setProductForm({
                      ...productForm,
                      measurements: { ...productForm.measurements, chest: Number(e.target.value) }
                    })}
                  />
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Length (e.g. 29)"
                    value={productForm.measurements.length}
                    onChange={(e) => setProductForm({
                      ...productForm,
                      measurements: { ...productForm.measurements, length: Number(e.target.value) }
                    })}
                  />
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Shoulder (e.g. 20)"
                    value={productForm.measurements.shoulder}
                    onChange={(e) => setProductForm({
                      ...productForm,
                      measurements: { ...productForm.measurements, shoulder: Number(e.target.value) }
                    })}
                  />
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Sleeve (e.g. 9)"
                    value={productForm.measurements.sleeve}
                    onChange={(e) => setProductForm({
                      ...productForm,
                      measurements: { ...productForm.measurements, sleeve: Number(e.target.value) }
                    })}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>CONDITION NOTES (DISCLOSE SMALL FLAWS) *</label>
                <input
                  type="text"
                  value={productForm.condition_notes}
                  onChange={(e) => setProductForm({ ...productForm, condition_notes: e.target.value })}
                  placeholder="e.g. Minor collar fade consistent with archival character."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>SOURCING TYPE (INTERNAL)</label>
                  <select
                    value={productForm.source_type}
                    onChange={(e) => setProductForm({ ...productForm, source_type: e.target.value })}
                  >
                    <option value="Brand Surplus">Brand Surplus</option>
                    <option value="Export Surplus">Export Surplus</option>
                    <option value="Curated Thrift">Curated Thrift</option>
                    <option value="Wholesale Vault">Wholesale Vault</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>LOT / BATCH REF</label>
                  <input
                    type="text"
                    value={productForm.lot_ref}
                    onChange={(e) => setProductForm({ ...productForm, lot_ref: e.target.value })}
                  />
                </div>
              </div>

              {/* QC Verification Toggle */}
              <div style={{ backgroundColor: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={productForm.qc_passed}
                    onChange={(e) => setProductForm({ ...productForm, qc_passed: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--sage-primary)' }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    QC Passed & Verified by Nikhil Pol (Mandatory for publishing)
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleSaveProduct('DRAFT')}
                  disabled={loading}
                  className="btn btn-secondary"
                  style={{ flex: 1, height: '48px' }}
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveProduct('ACTIVE')}
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ flex: 1, height: '48px' }}
                >
                  {loading ? 'Publishing...' : 'Publish to Live Store'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: ORDERS & PACKING FULFILLMENT
        ======================================================== */}
        {activeTab === 'ORDERS' && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px' }}>
              ORDERS & FULFILLMENT ({orders.length})
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--sage-light)', fontFamily: 'monospace' }}>
                          {ord.order_number}
                        </span>
                        <span className={`subtle-badge ${ord.channel === 'OFFLINE' ? 'badge-preowned' : 'badge-new'}`}>
                          {ord.channel}
                        </span>
                        <span className="subtle-badge badge-hold">
                          {ord.order_status}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                        Customer: {ord.customer?.name} ({ord.customer?.mobile})
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Placed: {new Date(ord.created_at).toLocaleString()} • City: {ord.customer?.city || 'In-Person'}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        ₹{ord.total?.toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: 600 }}>
                        {ord.payment_status} ({ord.payment_mode})
                      </div>
                    </div>
                  </div>

                  {/* Items list */}
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {ord.items?.map((it, idx) => (
                      <div key={idx} style={{ fontSize: '12.5px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>• {it.name} (Size {it.size})</span>
                        <span>₹{it.actual_sale_price || it.unit_price}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions Bar */}
                  <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {ord.channel === 'OFFLINE' && !ord.voided_at && (
                      <button
                        onClick={() => handleVoidOfflineSale(ord.id)}
                        className="btn btn-secondary"
                        style={{ height: '34px', fontSize: '11px', color: 'var(--accent-red)' }}
                      >
                        Void Mistaken Sale (INV-23)
                      </button>
                    )}

                    {ord.channel === 'ONLINE' && ord.order_status !== 'DELIVERED' && ord.order_status !== 'CANCELLED' && (
                      <button
                        onClick={() => {
                          setSelectedOrder(ord);
                          setCourierInput({
                            courier: ord.courier || 'BlueDart Express',
                            tracking_number: ord.tracking_number || '',
                            tracking_url: ord.tracking_url || 'https://www.bluedart.com'
                          });
                        }}
                        className="btn btn-primary"
                        style={{ height: '34px', fontSize: '11.5px' }}
                      >
                        <Truck size={14} />
                        <span>Update Dispatch & AWB</span>
                      </button>
                    )}

                    {ord.order_status === 'SHIPPED' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(ord.id, 'DELIVERED')}
                        className="btn btn-secondary"
                        style={{ height: '34px', fontSize: '11px', color: 'var(--accent-green)' }}
                      >
                        Mark Delivered
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 5: EXCEPTIONS & RETURNS TRIAGE (RET-03 to RET-10)
        ======================================================== */}
        {activeTab === 'EXCEPTIONS' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>EXCEPTIONS & RETURN CLAIMS ({exceptions.length})</h2>
              <button
                onClick={async () => {
                  const ordNum = prompt('Enter Order Number:');
                  const desc = prompt('Enter claim reason (e.g. Transit tear, wrong size):');
                  if (ordNum && desc) {
                    await fetch('/api/exceptions/create', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ order_number: ordNum, type: 'Undisclosed major defect', description: desc })
                    });
                    fetchAllAdminData();
                  }
                }}
                className="btn btn-secondary"
              >
                + Log Customer Claim
              </button>
            </div>

            {exceptions.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No exception cases logged.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {exceptions.map((exc) => (
                  <div key={exc.id} style={{ backgroundColor: 'var(--bg-secondary)', padding: '18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--sage-light)' }}>{exc.order_number}</span>
                        <span className="subtle-badge badge-alert" style={{ marginLeft: '8px' }}>{exc.type}</span>
                      </div>
                      <span className="subtle-badge badge-hold">{exc.status}</span>
                    </div>

                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.5 }}>
                      {exc.description}
                    </p>

                    {exc.status !== 'Resolved' && (
                      <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleInspectReturn(exc.id, 'PASS')}
                          className="btn btn-primary"
                          style={{ height: '34px', fontSize: '11px' }}
                        >
                          Inspection PASS (Restock to Ledger)
                        </button>
                        <button
                          onClick={() => handleInspectReturn(exc.id, 'FAIL')}
                          className="btn btn-secondary"
                          style={{ height: '34px', fontSize: '11px', color: 'var(--accent-red)' }}
                        >
                          Inspection FAIL (Scrap as Damaged)
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 6: IMMUTABLE LEDGER AUDIT (INV-02)
        ======================================================== */}
        {activeTab === 'LEDGER' && (
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>
              IMMUTABLE INVENTORY LEDGER (INV-02)
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Every stock delta is an immutable entry. Stock on hand is the sum of ledger history.
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--sage-light)' }}>
                    <th style={{ padding: '10px' }}>Timestamp</th>
                    <th style={{ padding: '10px' }}>SKU</th>
                    <th style={{ padding: '10px' }}>Delta</th>
                    <th style={{ padding: '10px' }}>Reason</th>
                    <th style={{ padding: '10px' }}>Channel</th>
                    <th style={{ padding: '10px' }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{new Date(tx.created_at).toLocaleString()}</td>
                      <td style={{ padding: '10px', fontWeight: 700 }}>{tx.sku}</td>
                      <td style={{ padding: '10px', fontWeight: 800, color: tx.quantity_change > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        {tx.quantity_change > 0 ? `+${tx.quantity_change}` : tx.quantity_change}
                      </td>
                      <td style={{ padding: '10px' }}>{tx.reason}</td>
                      <td style={{ padding: '10px' }}>{tx.channel}</td>
                      <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{tx.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 7: STORE SETTINGS
        ======================================================== */}
        {activeTab === 'SETTINGS' && settings && (
          <form onSubmit={handleSaveSettings} style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>STORE SETTINGS</h2>

            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>SOLD OUT SECTION VISIBILITY (D-09)</label>
                <select
                  value={settings.sold_out_section_enabled ? 'true' : 'false'}
                  onChange={(e) => setSettings({ ...settings, sold_out_section_enabled: e.target.value === 'true' })}
                >
                  <option value="true">ENABLED (Show social proof archive)</option>
                  <option value="false">DISABLED (Hide section until 15+ sales exist)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>FLAT SHIPPING (₹)</label>
                  <input
                    type="number"
                    value={settings.shipping_flat_rate}
                    onChange={(e) => setSettings({ ...settings, shipping_flat_rate: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>FREE SHIPPING THRESHOLD (₹)</label>
                  <input
                    type="number"
                    value={settings.shipping_free_threshold}
                    onChange={(e) => setSettings({ ...settings, shipping_free_threshold: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>HOLD DURATION MINUTES (INV-10)</label>
                <input
                  type="number"
                  value={settings.hold_duration_minutes}
                  onChange={(e) => setSettings({ ...settings, hold_duration_minutes: Number(e.target.value) })}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>HOMEPAGE HERO HEADLINE</label>
                <input
                  type="text"
                  value={settings.hero_headline}
                  onChange={(e) => setSettings({ ...settings, hero_headline: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>WHATSAPP SUPPORT NUMBER</label>
                <input
                  type="text"
                  value={settings.whatsapp_number}
                  onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ height: '46px', marginTop: '8px' }}>
                Save Settings
              </button>
            </div>
          </form>
        )}

        {/* ========================================================
            TAB 8: CONCURRENCY RACE CONDITION TEST (UAT-14)
        ======================================================== */}
        {activeTab === 'CONCURRENCY_TEST' && (
          <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>
              UAT-14: 20 PARALLEL PURCHASES RACE TEST
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
              Requirement <code>INV-18</code> &amp; <code>UAT-14</code> mandate proof that firing 20 concurrent purchase attempts at a single-stock unit produces exactly 1 successful order, 19 sold-out rejections, and zero negative stock.
            </p>

            <button
              onClick={runConcurrencyTest}
              disabled={concurrencyRunning}
              className="btn btn-primary"
              style={{ height: '50px', padding: '0 32px', fontSize: '14px', marginBottom: '28px' }}
            >
              <Play size={16} />
              <span>{concurrencyRunning ? 'Executing 20 Concurrent Threads...' : 'RUN CONCURRENCY TEST NOW'}</span>
            </button>

            {concurrencyResult && (
              <div style={{
                backgroundColor: 'var(--bg-secondary)',
                border: `1px solid ${concurrencyResult.test_passed ? 'var(--accent-green)' : 'var(--accent-red)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '24px',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <ShieldCheck size={24} color={concurrencyResult.test_passed ? 'var(--accent-green)' : 'var(--accent-red)'} />
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: concurrencyResult.test_passed ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {concurrencyResult.test_passed ? 'UAT-14 PASSED: ZERO DOUBLE-SALES' : 'TEST FAILED'}
                  </h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px', textAlign: 'center' }}>
                  <div style={{ backgroundColor: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TOTAL ATTEMPTS</div>
                    <div style={{ fontSize: '20px', fontWeight: 800 }}>{concurrencyResult.total_attempts}</div>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--accent-green)' }}>SUCCESSFUL</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-green)' }}>{concurrencyResult.successful_purchases}</div>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>FINAL STOCK</div>
                    <div style={{ fontSize: '20px', fontWeight: 800 }}>{concurrencyResult.final_stock_on_hand}</div>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', maxHeight: '180px', overflowY: 'auto' }}>
                  {concurrencyResult.details?.map((d) => (
                    <div key={d.attempt} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span>Thread #{d.attempt}</span>
                      <span style={{ fontWeight: 700, color: d.status === 'SUCCESS' ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                        {d.status} ({d.message})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2-TAP OFFLINE SALE MODAL (INV-19 to INV-24) */}
      {offlineModalProduct && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(32, 49, 36, 0.65)',
          backdropFilter: 'blur(8px)',
          zIndex: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-active)',
            borderRadius: 'var(--radius-sm)',
            maxWidth: '480px',
            width: '100%',
            padding: '24px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>
              MARK AS SOLD (OFFLINE SALE)
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              {offlineModalProduct.product.name} (SKU: {offlineModalProduct.product.sku})
            </p>

            {/* Hold Warning (INV-22) */}
            {offlineHoldWarning && (
              <div style={{
                backgroundColor: 'rgba(138, 154, 91, 0.15)',
                border: '1px solid rgba(138, 154, 91, 0.4)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                marginBottom: '16px',
                color: 'var(--olive-light)',
                fontSize: '12.5px',
                lineHeight: 1.5
              }}>
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>Hold Conflict Alert:</div>
                <p>{offlineHoldWarning}</p>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={offlineSaleForm.force_override_hold}
                    onChange={(e) => setOfflineSaleForm({ ...offlineSaleForm, force_override_hold: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Confirm Override (Customer payment will be auto-refunded)</span>
                </label>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  ACTUAL SALE PRICE (₹) - EDITABLE FOR BARGAINING
                </label>
                <input
                  type="number"
                  value={offlineSaleForm.actual_sale_price}
                  onChange={(e) => setOfflineSaleForm({ ...offlineSaleForm, actual_sale_price: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  PAYMENT METHOD
                </label>
                <select
                  value={offlineSaleForm.payment_mode}
                  onChange={(e) => setOfflineSaleForm({ ...offlineSaleForm, payment_mode: e.target.value })}
                >
                  <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card POS</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  OPTIONAL NOTE / BUYER INFO
                </label>
                <input
                  type="text"
                  value={offlineSaleForm.notes}
                  onChange={(e) => setOfflineSaleForm({ ...offlineSaleForm, notes: e.target.value })}
                  placeholder="e.g. Sold to Rohan in Bandra"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setOfflineModalProduct(null)} className="btn btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
              <button onClick={handleConfirmOfflineSale} disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>
                {loading ? 'Recording...' : 'Confirm Sale (2 Taps)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISPATCH / COURIER MODAL */}
      {selectedOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(32, 49, 36, 0.65)',
          backdropFilter: 'blur(8px)',
          zIndex: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-active)',
            borderRadius: 'var(--radius-sm)',
            maxWidth: '480px',
            width: '100%',
            padding: '24px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>
              UPDATE EXPRESS COURIER &amp; AWB
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Order #{selectedOrder.order_number} ({selectedOrder.customer?.name})
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>COURIER NAME *</label>
                <input
                  type="text"
                  value={courierInput.courier}
                  onChange={(e) => setCourierInput({ ...courierInput, courier: e.target.value })}
                  placeholder="BlueDart Express / Delhivery"
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>AWB TRACKING NUMBER *</label>
                <input
                  type="text"
                  value={courierInput.tracking_number}
                  onChange={(e) => setCourierInput({ ...courierInput, tracking_number: e.target.value })}
                  placeholder="e.g. BD891230495IN"
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>TRACKING URL *</label>
                <input
                  type="url"
                  value={courierInput.tracking_url}
                  onChange={(e) => setCourierInput({ ...courierInput, tracking_url: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setSelectedOrder(null)} className="btn btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
              <button
                onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'SHIPPED')}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Mark as Shipped
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
