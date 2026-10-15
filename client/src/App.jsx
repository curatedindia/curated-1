import React, { useState, useEffect } from 'react';
import supabase from './supabaseClient';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProductCard from './components/ProductCard';
import ProductDetailModal from './components/ProductDetailModal';
import CartDrawer from './components/CartDrawer';
import CheckoutModal from './components/CheckoutModal';
import SearchModal from './components/SearchModal';
import TrackOrderView from './components/TrackOrderView';
import SoldOutView from './components/SoldOutView';
import AboutView from './components/AboutView';
import ContactView from './components/ContactView';
import PolicyModal from './components/PolicyModal';
import AdminPanel from './components/AdminPanel';
import StayTunedSection from './components/StayTunedSection';
import CurvedLoop from './components/CurvedLoop';
import {
  ArrowRight,
  ShieldCheck,
  Search as SearchIcon,
  Package,
  Truck,
  CreditCard,
  Sparkles,
  Check,
  Eye
} from 'lucide-react';

const CURATED_INITIAL_PRODUCTS = [
  {
    id: 'prod-001',
    sku: 'CUR-TS-001',
    name: 'Heavyweight Washed Vintage Boxy Tee',
    slug: 'heavyweight-washed-vintage-boxy-tee',
    category_id: 't-shirts',
    subcategory_id: 'oversized',
    description: 'Handpicked heavyweight cotton tee with a natural mineral wash. Dropped shoulders, reinforced double-needle collar, and zero side seams. Sourced from export surplus sample run.',
    fabric: '100% Ring-Spun Heavyweight Cotton (240 GSM)',
    fit: 'Oversized Boxy',
    care: 'Machine wash cold inside out, hang dry only.',
    condition: 'New / Unused',
    condition_notes: 'Pristine unworn condition. Crisp neckline with zero stretching.',
    selling_price: 899,
    original_price: 1899,
    is_new_drop: true,
    status: 'ACTIVE',
    images: ['/products/man_boxy_tee.jpg'],
    variants: [
      {
        id: 'var-001',
        product_id: 'prod-001',
        size: 'L',
        measurements: { chest: 46, length: 29.5, shoulder: 21, sleeve: 9.5, unit: 'in' },
        on_hand: 1,
        available: 1,
        stock_on_hand: 1,
        reserved: 0
      }
    ],
    total_on_hand: 1,
    total_available: 1,
    pieces_sold: 0
  },
  {
    id: 'prod-003',
    sku: 'CUR-SH-001',
    name: 'Oversized Minimalist Utility Work Shirt',
    slug: 'oversized-minimalist-utility-work-shirt',
    category_id: 'shirts',
    subcategory_id: 'workwear',
    description: 'Relaxed drop-shoulder utility shirt in a crisp monochrome twill. Dual chest bellows pockets, matte buttons, and clean boxy drape.',
    fabric: 'Heavyweight Cotton Twill (210 GSM)',
    fit: 'Boxy / Relaxed',
    care: 'Machine wash cold with like colors, hang dry.',
    condition: 'New / Unused',
    condition_notes: 'Crisp hand feel, reinforced collar and pocket stitching.',
    selling_price: 1299,
    original_price: 2499,
    is_new_drop: true,
    status: 'ACTIVE',
    images: ['/products/man_utility_shirt.jpg'],
    variants: [
      {
        id: 'var-003',
        product_id: 'prod-003',
        size: 'XL',
        measurements: { chest: 48, length: 30, shoulder: 22, sleeve: 24.5, unit: 'in' },
        on_hand: 1,
        available: 1,
        stock_on_hand: 1,
        reserved: 0
      }
    ],
    total_on_hand: 1,
    total_available: 1,
    pieces_sold: 0
  },
  {
    id: 'prod-006',
    sku: 'CUR-HD-001',
    name: 'Pigment-Dyed French Terry Drop-Shoulder Hoodie',
    slug: 'pigment-dyed-french-terry-drop-shoulder-hoodie',
    category_id: 'hoodies',
    subcategory_id: 'heavyweight',
    description: 'Ultra-heavyweight 420 GSM French Terry hoodie in matte black. Dropped shoulders, double-layer hood without drawstrings, and tailored boxy hem.',
    fabric: '100% French Terry Cotton (420 GSM)',
    fit: 'Oversized / Dropped Shoulder',
    care: 'Machine wash cold inside out, hang dry only.',
    condition: 'New / Unused',
    condition_notes: 'Flawless heavyweight structure with dense ribbing.',
    selling_price: 1599,
    original_price: 3299,
    is_new_drop: true,
    status: 'ACTIVE',
    images: ['/products/man_street_hoodie.jpg'],
    variants: [
      {
        id: 'var-006',
        product_id: 'prod-006',
        size: 'L',
        measurements: { chest: 48, length: 28, shoulder: 23, sleeve: 25, unit: 'in' },
        on_hand: 1,
        available: 1,
        stock_on_hand: 1,
        reserved: 0
      }
    ],
    total_on_hand: 1,
    total_available: 1,
    pieces_sold: 0
  },
  {
    id: 'prod-sold-001',
    sku: 'CUR-HD-002',
    name: 'Acid-Washed Distressed Heavyweight Hoodie',
    slug: 'acid-washed-distressed-heavyweight-hoodie',
    category_id: 'hoodies',
    subcategory_id: 'archival',
    description: 'Archival mineral acid-washed charcoal black hoodie with subtle edge grinding and sun-faded patina. One of one vintage piece.',
    fabric: '100% Heavyweight Cotton Terry (400 GSM)',
    fit: 'Relaxed Vintage Fit',
    care: 'Dry clean or gentle hand wash cold.',
    condition: 'Excellent - Pre-Owned',
    condition_notes: 'Natural vintage fade, distressed cuffs, verified authentic archival garment.',
    selling_price: 1699,
    original_price: 3499,
    is_new_drop: false,
    status: 'SOLD_OUT',
    images: ['/products/man_sold_hoodie.jpg'],
    variants: [
      {
        id: 'var-sold-001',
        product_id: 'prod-sold-001',
        size: 'M',
        measurements: { chest: 44, length: 27, shoulder: 20.5, sleeve: 24, unit: 'in' },
        on_hand: 0,
        available: 0,
        stock_on_hand: 0,
        reserved: 0
      }
    ],
    total_on_hand: 0,
    total_available: 0,
    pieces_sold: 1
  },
  {
    id: 'prod-sold-002',
    sku: 'CUR-SH-002',
    name: 'Archival Faded Black Twill Workwear Overshirt',
    slug: 'archival-faded-black-twill-workwear-overshirt',
    category_id: 'shirts',
    subcategory_id: 'vintage',
    description: 'Boxy twill utility workwear shirt with dual chest flap pockets and tonal buttons in vintage faded black.',
    fabric: 'Heavy Duty 100% Cotton Twill',
    fit: 'Boxy Overshirt',
    care: 'Machine wash cold with like colors, hang dry.',
    condition: 'Excellent - Pre-Owned',
    condition_notes: 'Clean vintage wash with beautifully softened twill fabric. All buttons intact.',
    selling_price: 1399,
    original_price: 2799,
    is_new_drop: false,
    status: 'SOLD_OUT',
    images: ['/products/man_sold_shirt.jpg'],
    variants: [
      {
        id: 'var-sold-002',
        product_id: 'prod-sold-002',
        size: 'L',
        measurements: { chest: 46, length: 29, shoulder: 21, sleeve: 25, unit: 'in' },
        on_hand: 0,
        available: 0,
        stock_on_hand: 0,
        reserved: 0
      }
    ],
    total_on_hand: 0,
    total_available: 0,
    pieces_sold: 1
  }
];

const DEFAULT_SETTINGS = {
  store_name: 'CURATED',
  sold_out_section_enabled: true,
  shipping_free_threshold: 1499,
  shipping_flat_rate: 99,
  hero_headline: 'CURATED | SEARCHED • FILTERED • QUALITY CHECKED • HANDPICKED'
};

export default function App() {
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'shop' | 'new-drops' | 'sold-out' | 'track-order' | 'about' | 'contact' | 'admin' | 'policy-*'
  const [products, setProducts] = useState(CURATED_INITIAL_PRODUCTS);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);

  // Filters & Sorting state
  const [categoryFilter, setCategoryFilter] = useState('');
  const [fitFilter, setFitFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Interactive Homepage Tab (Future Saints section-tab-collections)
  const [homeTab, setHomeTab] = useState('all');

  // Modals & Drawers
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [policyModalType, setPolicyModalType] = useState(null);

  // Cart state persisted in localStorage (CK-01)
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('curated_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Authenticated user via Supabase Google OAuth
  const [authUser, setAuthUser] = useState(null);

  // Sync cart items to localStorage whenever updated
  useEffect(() => {
    localStorage.setItem('curated_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Handle URL routing for /checkout and Supabase Google OAuth callback
  useEffect(() => {
    const handleLocationChange = () => {
      const pathname = window.location.pathname.replace(/\/+$/, '');
      const hash = window.location.hash;
      const search = window.location.search;

      // Automatically redirect/open checkout if user lands on /checkout or returns from OAuth
      if (pathname === '/checkout' || hash.includes('access_token') || search.includes('code=')) {
        setCurrentView('checkout');
        setCheckoutModalOpen(true);
      } else if (pathname === '' || pathname === '/') {
        if (currentView === 'checkout') {
          setCurrentView('home');
          setCheckoutModalOpen(false);
        }
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);

    // Supabase auth state change listener (catches OAuth redirect completion)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setAuthUser(session.user);
        const path = window.location.pathname.replace(/\/+$/, '');
        if (path === '/checkout' || window.location.hash.includes('access_token')) {
          setCurrentView('checkout');
          setCheckoutModalOpen(true);
        }
      } else if (event === 'SIGNED_OUT') {
        setAuthUser(null);
      }
    });

    // Check initial active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuthUser(session.user);
      }
    });

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleOpenCheckout = () => {
    setCartDrawerOpen(false);
    setCheckoutModalOpen(true);
    setCurrentView('checkout');
    if (window.location.pathname !== '/checkout') {
      window.history.pushState({}, '', '/checkout');
    }
  };

  const handleCloseCheckout = () => {
    setCheckoutModalOpen(false);
    if (currentView === 'checkout') {
      setCurrentView('home');
    }
    if (window.location.pathname === '/checkout') {
      window.history.pushState({}, '', '/');
    }
  };

  useEffect(() => {
    fetchProductsAndSettings();
  }, [categoryFilter, fitFilter, conditionFilter, sortBy]);

  const fetchProductsAndSettings = async () => {
    setLoading(true);
    try {
      let url = `/api/products?sort=${sortBy}`;
      if (categoryFilter) url += `&category=${encodeURIComponent(categoryFilter)}`;
      if (fitFilter) url += `&fit=${encodeURIComponent(fitFilter)}`;
      if (conditionFilter) url += `&condition=${encodeURIComponent(conditionFilter)}`;

      const [prodRes, setRes] = await Promise.all([
        fetch(url),
        fetch('/api/settings')
      ]);

      const [prodData, setData] = await Promise.all([
        prodRes.json(),
        setRes.json()
      ]);

      if (prodData && prodData.success && Array.isArray(prodData.products) && prodData.products.length > 0) {
        setProducts(prodData.products);
      }
      if (setData && setData.success && setData.settings) {
        setSettings(setData.settings);
      }
    } catch (err) {
      console.error('Error fetching storefront data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product, variant) => {
    setCartItems((prev) => {
      const exists = prev.find((it) => it.variant_id === variant.id);
      if (exists) return prev; // 1-of-1 rule, max quantity is 1
      return [
        ...prev,
        {
          product_id: product.id,
          variant_id: variant.id,
          name: product.name,
          sku: product.sku,
          size: variant.size,
          quantity: 1,
          unit_price: product.selling_price,
          image: product.images?.[0]
        }
      ];
    });
    setCartDrawerOpen(true);
  };

  const handleRemoveFromCart = (variantId) => {
    setCartItems((prev) => prev.filter((it) => it.variant_id !== variantId));
  };

  const handleOrderSuccess = () => {
    setCartItems([]);
    fetchProductsAndSettings();
  };

  // Filtered views
  const newDropProducts = products.filter((p) => p.is_new_drop && p.total_available > 0);
  const availableShopProducts = products.filter((p) => p.total_available > 0);

  // Tab-filtered products for Homepage Tab Collections
  const tabProducts = homeTab === 'all'
    ? availableShopProducts
    : availableShopProducts.filter((p) => p.category_id?.toLowerCase() === homeTab.toLowerCase());

  // Category counts
  const countForCategory = (catId) =>
    availableShopProducts.filter((p) => p.category_id?.toLowerCase() === catId.toLowerCase()).length;

  const isPolicyView = currentView.startsWith('policy-');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
      {/* Universal Navigation */}
      {currentView !== 'admin' && (
        <Navbar
          currentView={currentView}
          setCurrentView={setCurrentView}
          cartCount={cartItems.length}
          onOpenCart={() => setCartDrawerOpen(true)}
          onOpenSearch={() => setSearchModalOpen(true)}
          soldOutEnabled={settings?.sold_out_section_enabled}
          isAdmin={false}
          setIsAdmin={() => setCurrentView('admin')}
        />
      )}

      {/* Main Content Areas */}
      <main style={{ flexGrow: 1 }}>
        {/* ========================================================
            VIEW: ADMIN CONTROL CENTER
        ======================================================== */}
        {currentView === 'admin' && (
          <AdminPanel onExitAdmin={() => { setCurrentView('home'); fetchProductsAndSettings(); }} />
        )}

        {/* ========================================================
            VIEW: HOMEPAGE (Future Saints Architecture)
        ======================================================== */}
        {currentView === 'home' && (
          <div>
            <h1 className="sr-only">
              {settings?.hero_headline || 'CURATED | SEARCHED • FILTERED • QUALITY CHECKED • HANDPICKED'}
            </h1>

            {/* 2. Running Marquee Ticker Band (Matte Black & Crystal White) */}
            <div style={{
              backgroundColor: '#121212',
              color: '#FFFFFF',
              padding: '12px 0',
              overflow: 'hidden',
              borderTop: '1px solid #27272A',
              borderBottom: '1px solid #27272A'
            }}>
              <div className="fs-ticker-wrapper">
                <div className="fs-ticker-content" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '36px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase'
                }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((repeatIdx) => (
                    <React.Fragment key={repeatIdx}>
                      <span>SEARCHED</span>
                      <span style={{ color: '#FFFFFF' }}>✦</span>
                      <span>FILTERED</span>
                      <span style={{ color: '#FFFFFF' }}>✦</span>
                      <span>QUALITY CHECKED</span>
                      <span style={{ color: '#FFFFFF' }}>✦</span>
                      <span>HANDPICKED</span>
                      <span style={{ color: '#FFFFFF' }}>✦</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. New Launch / Drops Spotlight (Future Saints section_collection_xmFbWG) */}
            <section style={{ padding: '64px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="container">
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  marginBottom: '28px',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}>
                  <div>
                    <span style={{
                      fontSize: '11px',
                      fontFamily: 'var(--font-subheading)',
                      fontWeight: 800,
                      letterSpacing: '0.14em',
                      color: '#121212',
                      textTransform: 'uppercase'
                    }}>
                      WEEKLY BATCH DROP
                    </span>
                    <h2 style={{
                      fontSize: '28px',
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 800,
                      marginTop: '4px',
                      textTransform: 'uppercase'
                    }}>
                      NEW LAUNCH
                    </h2>
                    <p style={{
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      marginTop: '4px',
                      maxWidth: '560px'
                    }}>
                      Built for effortless style and all-day comfort. Authentic fits, dropped shoulders, and a laid-back streetwear fit.
                    </p>
                  </div>

                  <button
                    onClick={() => { setCurrentView('new-drops'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-btn)',
                      fontWeight: 700,
                      fontSize: '12.5px',
                      letterSpacing: '0.06em',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: 0
                    }}
                  >
                    <span>SHOP NOW</span>
                    <ArrowRight size={15} />
                  </button>
                </div>

                <div className="product-grid">
                  {(newDropProducts.length > 0 ? newDropProducts : availableShopProducts).slice(0, 4).map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      onSelectProduct={(p) => setSelectedProduct(p)}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* 4. Interactive Category Tabs Collection (Future Saints section-tab-collections) */}
            <section style={{ padding: '64px 0', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)' }}>
              <div className="container">
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                  marginBottom: '28px'
                }}>
                  {/* Category Filter Pills / Tabs */}
                  <div className="mobile-scroll-row">
                    {[
                      { id: 'all', label: 'ALL PIECES' },
                      { id: 't-shirts', label: 'T-SHIRTS' },
                      { id: 'shirts', label: 'SHIRTS' },
                      { id: 'jackets', label: 'JACKETS' },
                      { id: 'hoodies', label: 'HOODIES' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setHomeTab(tab.id)}
                        style={{
                          padding: '8px 18px',
                          fontSize: '12px',
                          fontFamily: 'var(--font-btn)',
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: homeTab === tab.id ? '#121212' : '#FFFFFF',
                          color: homeTab === tab.id ? '#FFFFFF' : 'var(--text-primary)',
                          border: `1px solid ${homeTab === tab.id ? '#121212' : 'var(--border-subtle)'}`,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      if (homeTab !== 'all') setCategoryFilter(homeTab);
                      setCurrentView('shop');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-btn)',
                      fontWeight: 700,
                      fontSize: '12.5px',
                      letterSpacing: '0.06em',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0
                    }}
                  >
                    <span>SEE ALL</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                <div className="product-grid">
                  {tabProducts.slice(0, 8).map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      onSelectProduct={(p) => setSelectedProduct(p)}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* 5. Explore Full Range: Visual Collections Grid (Future Saints section_collections_list_CpfGte) */}
            <section style={{ padding: '72px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="container">
                <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-subheading)',
                    fontWeight: 800,
                    letterSpacing: '0.14em',
                    color: '#121212',
                    textTransform: 'uppercase'
                  }}>
                    CATALOGUE
                  </span>
                  <h2 style={{
                    fontSize: '30px',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 800,
                    marginTop: '4px',
                    textTransform: 'uppercase'
                  }}>
                    EXPLORE FULL RANGE
                  </h2>
                </div>

                <div className="category-cards-grid">
                  {[
                    {
                      id: 't-shirts',
                      name: 'T-SHIRTS',
                      sub: 'Heavyweight, Boxy & Archival',
                      img: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80',
                      count: countForCategory('t-shirts')
                    },
                    {
                      id: 'shirts',
                      name: 'SHIRTS',
                      sub: 'Utility, Twill & Linen',
                      img: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=600&q=80',
                      count: countForCategory('shirts')
                    },
                    {
                      id: 'jackets',
                      name: 'JACKETS',
                      sub: 'Chore, Bombers & Workwear',
                      img: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80',
                      count: countForCategory('jackets')
                    },
                    {
                      id: 'hoodies',
                      name: 'HOODIES',
                      sub: 'French Terry & Drop-Shoulder',
                      img: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80',
                      count: countForCategory('hoodies')
                    }
                  ].map((cat) => (
                    <div
                      key={cat.id}
                      onClick={() => {
                        setCategoryFilter(cat.id);
                        setCurrentView('shop');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="category-card-item"
                      style={{
                        position: 'relative',
                        height: '280px',
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: '1px solid var(--border-subtle)',
                        transition: 'transform 0.25s ease, border-color 0.25s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--text-primary)';
                        e.currentTarget.style.transform = 'translateY(-3px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <img
                        src={cat.img}
                        alt={cat.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(17, 17, 19, 0.85) 0%, rgba(17, 17, 19, 0.2) 60%, transparent 100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        padding: '20px',
                        color: '#FFFFFF'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <h3 style={{
                            fontSize: '20px',
                            fontFamily: 'var(--font-heading)',
                            fontWeight: 800,
                            letterSpacing: '0.04em',
                            color: '#FFFFFF'
                          }}>
                            {cat.name}
                          </h3>
                          <span style={{ fontSize: '12px', fontFamily: 'var(--font-subheading)', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 700 }}>
                            {cat.count} PIECES
                          </span>
                        </div>
                        <p style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.75)', marginTop: '2px' }}>
                          {cat.sub}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 6. Drop Notification Section ("STAY TUNED") */}
            <StayTunedSection />


            {/* 8. Genuine Archival Proof (SF-28) */}
            {settings?.sold_out_section_enabled && (
              <section style={{
                padding: '60px 0',
                backgroundColor: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-subtle)',
                textAlign: 'center'
              }}>
                <div className="container" style={{ maxWidth: '640px' }}>
                  <ShieldCheck size={32} color="#121212" style={{ margin: '0 auto 10px' }} />
                  <h3 style={{
                    fontSize: '20px',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 800,
                    marginBottom: '16px',
                    textTransform: 'uppercase'
                  }}>
                    GENUINE ARCHIVAL PROOF
                  </h3>
                  <button
                    onClick={() => { setCurrentView('sold-out'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="btn btn-primary"
                    style={{ height: '42px', padding: '0 22px', fontSize: '12px' }}
                  >
                    EXPLORE THE SOLD OUT ARCHIVE →
                  </button>
                </div>
              </section>
            )}
          </div>
        )}

        {/* ========================================================
            VIEW: SHOP (ALL OR CATEGORY FILTERED)
        ======================================================== */}
        {currentView === 'shop' && (
          <div className="container" style={{ padding: '40px 16px 60px' }}>
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <h1 style={{
                    fontSize: '28px',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 800,
                    textTransform: 'uppercase'
                  }}>
                    {categoryFilter ? `${categoryFilter.toUpperCase()}` : 'ALL AVAILABLE PIECES'}
                  </h1>
                </div>

                {/* Sort Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontFamily: 'var(--font-subheading)', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                    SORT BY:
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{ minHeight: '38px', width: 'auto', padding: '6px 12px', fontSize: '12px' }}
                  >
                    <option value="newest">Newest First</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                  </select>
                </div>
              </div>

              {/* Faceted Filter Pills */}
              <div className="mobile-scroll-row" style={{ alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
                {['', 't-shirts', 'shirts', 'jackets', 'hoodies'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11px',
                      fontFamily: 'var(--font-btn)',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      background: categoryFilter === cat ? '#121212' : '#FFFFFF',
                      color: categoryFilter === cat ? '#FFFFFF' : 'var(--text-primary)',
                      border: `1px solid ${categoryFilter === cat ? '#121212' : 'var(--border-subtle)'}`,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                  >
                    {cat ? cat.toUpperCase() : 'ALL SILHOUETTES'}
                  </button>
                ))}

                <select
                  value={conditionFilter}
                  onChange={(e) => setConditionFilter(e.target.value)}
                  style={{ width: 'auto', minHeight: '34px', padding: '4px 10px', fontSize: '11px', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
                >
                  <option value="">Condition: All</option>
                  <option value="New / Unused">New / Unused</option>
                  <option value="Excellent - Pre-Owned">Excellent</option>
                  <option value="Very Good - Pre-Owned">Very Good</option>
                </select>

                {(categoryFilter || conditionFilter || fitFilter) && (
                  <button
                    onClick={() => { setCategoryFilter(''); setConditionFilter(''); setFitFilter(''); }}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-red)', fontSize: '11.5px', cursor: 'pointer', padding: '4px 8px', fontFamily: 'var(--font-btn)', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    Clear Filters ×
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                Loading pieces...
              </div>
            ) : availableShopProducts.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                maxWidth: '480px',
                margin: '40px auto'
              }}>
                <Package size={40} strokeWidth={1} style={{ margin: '0 auto 14px', opacity: 0.4 }} />
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>No Available Pieces</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>
                  Try relaxing your active category or condition filters.
                </p>
                <button onClick={() => { setCategoryFilter(''); setConditionFilter(''); }} className="btn btn-primary">
                  RESET FILTERS
                </button>
              </div>
            ) : (
              <div className="product-grid">
                {availableShopProducts.map((prod) => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    onSelectProduct={(p) => setSelectedProduct(p)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            VIEW: NEW DROPS (SF-20)
        ======================================================== */}
        {currentView === 'new-drops' && (
          <div className="container" style={{ padding: '50px 16px 70px' }}>
            <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 40px' }}>
              <span style={{
                fontSize: '11px',
                fontFamily: 'var(--font-subheading)',
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: 'var(--text-primary)',
                textTransform: 'uppercase'
              }}>
                LIMITED BATCH ARCHIVE
              </span>
              <h1 style={{
                fontSize: '32px',
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                marginTop: '4px',
                textTransform: 'uppercase'
              }}>
                NEW DROPS ARCHIVE
              </h1>
            </div>

            <div className="product-grid">
              {(newDropProducts.length > 0 ? newDropProducts : availableShopProducts).map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  onSelectProduct={(p) => setSelectedProduct(p)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            VIEW: SOLD OUT ARCHIVE (SF-23)
        ======================================================== */}
        {currentView === 'sold-out' && (
          <SoldOutView
            onSelectProduct={(p) => setSelectedProduct(p)}
            onExploreNewDrops={() => setCurrentView('new-drops')}
          />
        )}

        {/* ========================================================
            VIEW: TRACK ORDER (SF-33)
        ======================================================== */}
        {currentView === 'track-order' && <TrackOrderView />}

        {/* ========================================================
            VIEW: ABOUT & PHILOSOPHY (SF-30)
        ======================================================== */}
        {currentView === 'about' && (
          <AboutView onExploreShop={() => { setCurrentView('shop'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
        )}

        {/* ========================================================
            VIEW: CONTACT & CONCIERGE (SF-31)
        ======================================================== */}
        {currentView === 'contact' && <ContactView settings={settings} />}

        {/* ========================================================
            VIEW: CHECKOUT (/checkout)
        ======================================================== */}
        {currentView === 'checkout' && !checkoutModalOpen && (
          <div className="container" style={{ padding: '80px 20px', maxWidth: '640px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '24px', fontFamily: 'var(--font-heading)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '16px' }}>
              CHECKOUT
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
              {cartItems.length > 0
                ? `You have ${cartItems.length} curated piece${cartItems.length > 1 ? 's' : ''} in your bag.`
                : 'Your bag is currently empty.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              {cartItems.length > 0 ? (
                <button
                  onClick={handleOpenCheckout}
                  className="btn btn-primary"
                  style={{ height: '46px', padding: '0 28px' }}
                >
                  RESUME SECURE CHECKOUT
                </button>
              ) : (
                <button
                  onClick={() => { setCurrentView('shop'); window.history.pushState({}, '', '/'); }}
                  className="btn btn-primary"
                  style={{ height: '46px', padding: '0 28px' }}
                >
                  EXPLORE SHOP
                </button>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            VIEW: POLICIES
        ======================================================== */}
        {isPolicyView && (
          <div className="container" style={{ padding: '60px 16px', maxWidth: '720px' }}>
            <PolicyModal
              type={currentView}
              onClose={() => setCurrentView('home')}
              settings={settings}
            />
          </div>
        )}
      </main>

      {/* Global Modals & Drawers */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
          onNavigateToShop={() => { setSelectedProduct(null); setCurrentView('shop'); }}
          onNavigateToNewDrops={() => { setSelectedProduct(null); setCurrentView('new-drops'); }}
          onOpenPolicy={() => setPolicyModalType('no-return')}
          settings={settings}
        />
      )}

      <CartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        cartItems={cartItems}
        onRemoveItem={handleRemoveFromCart}
        onProceedToCheckout={handleOpenCheckout}
        settings={settings}
      />

      <CheckoutModal
        isOpen={checkoutModalOpen}
        onClose={handleCloseCheckout}
        cartItems={cartItems}
        onOrderSuccess={handleOrderSuccess}
        onOpenPolicy={() => setPolicyModalType('no-return')}
        settings={settings}
        authUser={authUser}
      />

      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSelectProduct={(p) => setSelectedProduct(p)}
        onExploreShop={() => { setSearchModalOpen(false); setCurrentView('shop'); }}
      />

      {policyModalType && (
        <PolicyModal
          type={policyModalType}
          onClose={() => setPolicyModalType(null)}
          settings={settings}
        />
      )}

      {/* Global Footer */}
      {currentView !== 'admin' && (
        <Footer
          setCurrentView={setCurrentView}
          setCategoryFilter={setCategoryFilter}
          settings={settings}
          onOpenPolicy={() => setPolicyModalType('no-return')}
        />
      )}
    </div>
  );
}
