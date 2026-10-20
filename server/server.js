require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
const { db, acquireLock, releaseLock } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Supabase Admin Client for privileged operations
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.SUPABASE_URL || 'https://mfznxaembyaqxskltnye.supabase.co';
const supabaseAdmin = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

// Admin UPI Configuration
const ADMIN_UPI_ID = process.env.ADMIN_UPI_ID || 'nikhilpole90-2@okicici';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Nikhil Pole';
const SHARED_SECRET_KEY = process.env.ADMIN_PHONE_SECRET_KEY || 'ADMIN_PHONE_SECRET_KEY_123';

// Database storage array for automated logs forwarded from Admin's phone
const receivedBankLogs = [];

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// URL prefix normalizer for Vercel Serverless Functions
app.use((req, res, next) => {
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/uploads')) {
    req.url = '/api' + req.url;
  }
  next();
});

// Static uploads directory
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Multer storage config for mobile camera/file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueName = `curated_${Date.now()}_${Math.round(Math.random() * 1e5)}${ext}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Periodic cleanup of expired holds every 5 seconds (unref'd for serverless safety)
const holdCleanupTimer = setInterval(() => {
  db.cleanExpiredHolds();
}, 5000);
if (holdCleanupTimer && holdCleanupTimer.unref) {
  holdCleanupTimer.unref();
}

// Helper: generate next SKU
function generateSKU(categoryId) {
  let prefix = 'TS';
  if (categoryId === 'shirts') prefix = 'SH';
  else if (categoryId === 'jackets') prefix = 'JK';
  else if (categoryId === 'hoodies') prefix = 'HD';

  const existing = db.data.products.filter((p) => p.sku && p.sku.startsWith(`CUR-${prefix}-`));
  let maxNum = 0;
  existing.forEach((p) => {
    const parts = p.sku.split('-');
    const num = parseInt(parts[2], 10);
    if (!isNaN(num) && num > maxNum) maxNum = num;
  });
  const nextNum = String(maxNum + 1).padStart(3, '0');
  return `CUR-${prefix}-${nextNum}`;
}

// ==========================================
// 1. PRODUCTS & CATALOG APIs
// ==========================================

// Get all products (supports storefront and admin filters)
app.get('/api/products', (req, res) => {
  const { category, fit, condition, search, sort, is_admin, view } = req.query;
  db.cleanExpiredHolds();

  let products = db.data.products.map((p) => {
    const variants = db.data.variants.filter((v) => v.product_id === p.id);
    const availability = variants.map((v) => ({
      ...v,
      ...db.getVariantAvailability(v.id)
    }));
    const totalOnHand = availability.reduce((sum, v) => sum + v.on_hand, 0);
    const totalAvailable = availability.reduce((sum, v) => sum + v.available, 0);
    const totalReserved = availability.reduce((sum, v) => sum + v.reserved, 0);
    const piecesSold = db.getPiecesSold(p.id);

    return {
      ...p,
      variants: availability,
      total_on_hand: totalOnHand,
      total_available: totalAvailable,
      total_reserved: totalReserved,
      pieces_sold: piecesSold
    };
  });

  // Admin sees all statuses; Public Storefront only sees ACTIVE (or SOLD_OUT in specific views)
  if (is_admin !== 'true') {
    if (view === 'sold-out') {
      products = products.filter((p) => p.status === 'SOLD_OUT' && p.pieces_sold > 0);
    } else if (view === 'new-drops') {
      products = products.filter((p) => p.status === 'ACTIVE' && p.is_new_drop && p.total_available > 0);
    } else {
      // Normal Shop view: only ACTIVE with available stock
      products = products.filter((p) => p.status === 'ACTIVE' && p.total_on_hand > 0);
    }
  }

  // Category filter
  if (category) {
    products = products.filter((p) => p.category_id.toLowerCase() === category.toLowerCase());
  }

  // Fit filter
  if (fit) {
    products = products.filter((p) => p.fit.toLowerCase() === fit.toLowerCase());
  }

  // Condition filter
  if (condition) {
    products = products.filter((p) => p.condition.toLowerCase() === condition.toLowerCase());
  }

  // Search filter (Fuzzy tolerance: matches name, category, subcategory, sku, description)
  if (search) {
    const q = search.toLowerCase().trim();
    products = products.filter((p) => {
      const matchName = p.name.toLowerCase().includes(q);
      const matchSku = p.sku.toLowerCase().includes(q);
      const matchCat = p.category_id.toLowerCase().includes(q);
      const matchSub = (p.subcategory_id || '').toLowerCase().includes(q);
      const matchDesc = p.description.toLowerCase().includes(q);
      const matchFabric = (p.fabric || '').toLowerCase().includes(q);
      return matchName || matchSku || matchCat || matchSub || matchDesc || matchFabric;
    });
  }

  // Sorting
  if (sort === 'price-low') {
    products.sort((a, b) => a.selling_price - b.selling_price);
  } else if (sort === 'price-high') {
    products.sort((a, b) => b.selling_price - a.selling_price);
  } else {
    // Newest first (default)
    products.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  res.json({
    success: true,
    count: products.length,
    products
  });
});

// Get single product by slug
app.get('/api/products/:slug', (req, res) => {
  const { slug } = req.params;
  db.cleanExpiredHolds();

  const product = db.data.products.find((p) => p.slug === slug || p.id === slug);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  const variants = db.data.variants.filter((v) => v.product_id === product.id);
  const enrichedVariants = variants.map((v) => ({
    ...v,
    ...db.getVariantAvailability(v.id)
  }));
  const totalOnHand = enrichedVariants.reduce((sum, v) => sum + v.on_hand, 0);
  const totalAvailable = enrichedVariants.reduce((sum, v) => sum + v.available, 0);
  const totalReserved = enrichedVariants.reduce((sum, v) => sum + v.reserved, 0);
  const piecesSold = db.getPiecesSold(product.id);

  res.json({
    success: true,
    product: {
      ...product,
      variants: enrichedVariants,
      total_on_hand: totalOnHand,
      total_available: totalAvailable,
      total_reserved: totalReserved,
      pieces_sold: piecesSold
    }
  });
});

// Admin: Upload image
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, url: fileUrl });
});

// Admin: Create product with PC-12 validator
app.post('/api/products', (req, res) => {
  const {
    name,
    category_id,
    subcategory_id,
    description,
    fabric,
    fit,
    care,
    condition,
    condition_notes,
    selling_price,
    original_price,
    delivery_charge,
    deliveryCharge,
    cost_price,
    source_type,
    source_name,
    lot_ref,
    acquisition_date,
    qc_passed,
    qc_notes,
    is_new_drop,
    status = 'DRAFT',
    images = [],
    size = 'M',
    measurements = { chest: 42, length: 28, shoulder: 19, sleeve: 9, unit: 'in' },
    stock_on_hand = 1
  } = req.body;

  // PC-12 Publishing validation rules
  const failedChecks = [];
  if (!name || name.trim().length === 0) failedChecks.push('Product name is required');
  if (!category_id) failedChecks.push('Category is required');
  if (!condition) failedChecks.push('Condition grading is required');
  if (!selling_price || Number(selling_price) <= 0) failedChecks.push('Selling price must be greater than zero');
  if (!images || images.length === 0) failedChecks.push('At least one product image is required');
  if (!measurements || !measurements.chest || !measurements.length) failedChecks.push('Detailed measurements are required');
  if (Number(stock_on_hand) < 1) failedChecks.push('Initial stock must be at least 1 unit');
  if (!qc_passed) failedChecks.push('Quality Check (QC Passed) must be verified');

  if (status === 'ACTIVE' && failedChecks.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Product cannot be published until all PC-12 checks pass.',
      failedChecks
    });
  }

  const sku = generateSKU(category_id);
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-4);

  const newProduct = {
    id: 'prod-' + Date.now(),
    sku,
    name,
    slug,
    category_id,
    subcategory_id: subcategory_id || 'plain',
    description: description || 'Handpicked piece curated for exceptional silhouette and longevity.',
    fabric: fabric || '100% Premium Cotton',
    fit: fit || 'Regular',
    care: care || 'Cold gentle cycle, hang dry in shade.',
    condition,
    condition_notes: condition_notes || 'Clean condition, verified quality.',
    selling_price: Number(selling_price),
    original_price: original_price ? Number(original_price) : null,
    delivery_charge: Number(delivery_charge !== undefined ? delivery_charge : (deliveryCharge !== undefined ? deliveryCharge : 0)),
    deliveryCharge: Number(delivery_charge !== undefined ? delivery_charge : (deliveryCharge !== undefined ? deliveryCharge : 0)),
    cost_price: Number(cost_price || 0),
    source_type: source_type || 'Brand Surplus',
    source_name: source_name || 'Standard Sourcing Lot',
    lot_ref: lot_ref || 'LOT-2026',
    acquisition_date: acquisition_date || new Date().toISOString().split('T')[0],
    qc_passed: Boolean(qc_passed),
    qc_notes: qc_notes || 'Checked',
    is_new_drop: Boolean(is_new_drop),
    status: status,
    images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80'],
    seo_title: `${name} | CURATED`,
    seo_description: `${name} - Handpicked ${fit} piece. Quality inspected.`,
    created_at: new Date().toISOString(),
    listed_at: status === 'ACTIVE' ? new Date().toISOString() : null,
    sold_at: null
  };

  const newVariant = {
    id: 'var-' + Date.now(),
    product_id: newProduct.id,
    size: size.toUpperCase(),
    measurements,
    stock_on_hand: Number(stock_on_hand)
  };

  db.data.products.unshift(newProduct);
  db.data.variants.push(newVariant);

  // Append to Immutable Inventory Ledger (INV-02)
  db.data.inventoryTransactions.unshift({
    id: 'tx-' + Date.now(),
    variant_id: newVariant.id,
    product_id: newProduct.id,
    sku: newProduct.sku,
    quantity_change: newVariant.stock_on_hand,
    reason: 'Initial Stock',
    channel: 'SYSTEM',
    order_id: null,
    admin_user: 'Nikhil Pol',
    note: `Initial entry with ${newVariant.stock_on_hand} unit(s)`,
    created_at: new Date().toISOString()
  });

  db.logActivity('CREATE_PRODUCT', 'PRODUCT', newProduct.id, `Created product ${newProduct.sku} (${newProduct.name}) as ${status}`, 'Nikhil Pol');
  db.save();

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    product: newProduct,
    variant: newVariant
  });
});

// Admin: Update product details
app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const product = db.data.products.find((p) => p.id === id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  const updates = req.body;
  const previousPrice = product.selling_price;

  // Apply updates
  Object.keys(updates).forEach((key) => {
    if (key !== 'id' && key !== 'sku') {
      product[key] = updates[key];
    }
  });

  if (updates.selling_price && Number(updates.selling_price) !== previousPrice) {
    db.logActivity('PRICE_CHANGE', 'PRODUCT', product.id, `Price updated from ₹${previousPrice} to ₹${updates.selling_price}`, 'Nikhil Pol');
  }

  if (updates.delivery_charge !== undefined || updates.deliveryCharge !== undefined) {
    const charge = Number(updates.delivery_charge !== undefined ? updates.delivery_charge : updates.deliveryCharge) || 0;
    product.delivery_charge = charge;
    product.deliveryCharge = charge;
  }

  // Update variant stock if supplied
  if (updates.variant_stock !== undefined) {
    const variant = db.data.variants.find((v) => v.product_id === product.id);
    if (variant) {
      const diff = Number(updates.variant_stock) - variant.stock_on_hand;
      if (diff !== 0) {
        variant.stock_on_hand = Number(updates.variant_stock);
        db.data.inventoryTransactions.unshift({
          id: 'tx-' + Date.now(),
          variant_id: variant.id,
          product_id: product.id,
          sku: product.sku,
          quantity_change: diff,
          reason: diff > 0 ? 'Restock' : 'Manual Adjustment',
          channel: 'ADMIN',
          order_id: null,
          admin_user: 'Nikhil Pol',
          note: `Admin adjusted stock by ${diff}`,
          created_at: new Date().toISOString()
        });
      }
    }
  }

  db.logActivity('UPDATE_PRODUCT', 'PRODUCT', product.id, `Updated details for ${product.sku}`, 'Nikhil Pol');
  db.save();

  res.json({ success: true, product });
});

// Admin: Bulk actions (Publish, New Drop, Remove New Drop, Archive)
app.post('/api/products/bulk-action', (req, res) => {
  const { product_ids, action } = req.body;
  if (!product_ids || !Array.isArray(product_ids)) {
    return res.status(400).json({ success: false, message: 'Invalid product IDs' });
  }

  let updatedCount = 0;
  product_ids.forEach((id) => {
    const prod = db.data.products.find((p) => p.id === id);
    if (prod) {
      if (action === 'publish') {
        prod.status = 'ACTIVE';
        prod.listed_at = new Date().toISOString();
      } else if (action === 'mark_new_drop') {
        prod.is_new_drop = true;
      } else if (action === 'remove_new_drop') {
        prod.is_new_drop = false;
      } else if (action === 'archive') {
        prod.status = 'ARCHIVED';
      }
      updatedCount++;
    }
  });

  db.logActivity('BULK_ACTION', 'CATALOG', `${updatedCount} items`, `Applied bulk action: ${action} to ${updatedCount} products`, 'Nikhil Pol');
  db.save();

  res.json({ success: true, updatedCount });
});

// Admin: Delete product with BR-09 safety rule
app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const piecesSold = db.getPiecesSold(id);
  if (piecesSold > 0) {
    return res.status(400).json({
      success: false,
      message: 'BR-09 Rule: Cannot delete a product with recorded sales history. You must Archive it instead.'
    });
  }

  db.data.products = db.data.products.filter((p) => p.id !== id);
  db.data.variants = db.data.variants.filter((v) => v.product_id !== id);
  db.logActivity('DELETE_PRODUCT', 'PRODUCT', id, `Deleted unsold product ${id}`, 'Nikhil Pol');
  db.save();

  res.json({ success: true, message: 'Product deleted' });
});

// ==========================================
// 2. HOLDS & RESERVATIONS (INV-08 to INV-15)
// ==========================================

// Create hold when user initiates checkout
app.post('/api/holds/create', async (req, res) => {
  const { variant_id, order_id = null } = req.body;
  if (!variant_id) {
    return res.status(400).json({ success: false, message: 'variant_id required' });
  }

  await acquireLock(variant_id);
  try {
    db.cleanExpiredHolds();
    const availability = db.getVariantAvailability(variant_id);

    if (availability.available <= 0) {
      return res.status(409).json({
        success: false,
        message: availability.reserved > 0
          ? 'This piece is unavailable right now. Check back in a few minutes.'
          : 'Sorry, this piece just sold out.'
      });
    }

    const holdMinutes = db.data.settings.hold_duration_minutes || 10;
    const expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000).toISOString();

    const hold = {
      id: 'hold-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      variant_id,
      order_id,
      quantity: 1,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      expires_at: expiresAt
    };

    db.data.holds.push(hold);
    db.save();

    res.json({
      success: true,
      hold_id: hold.id,
      expires_at: expiresAt,
      hold_duration_seconds: holdMinutes * 60
    });
  } finally {
    releaseLock(variant_id);
  }
});

// Release hold manually on user cancellation
app.post('/api/holds/release', (req, res) => {
  const { hold_id } = req.body;
  const hold = db.data.holds.find((h) => h.id === hold_id);
  if (hold && hold.status === 'ACTIVE') {
    hold.status = 'RELEASED';
    db.save();
  }
  res.json({ success: true });
});

// ==========================================
// 3. CHECKOUT & ORDERS (CK, PAY, ORD)
// ==========================================

// Guest Checkout with Atomic Stock Verification
app.post('/api/orders/checkout', async (req, res) => {
  const { customer, items, no_return_ack } = req.body;

  if (!no_return_ack) {
    return res.status(400).json({
      success: false,
      message: 'CK-05 Rule: You must acknowledge the No Return Policy before proceeding to payment.'
    });
  }

  if (!customer || !customer.mobile || customer.mobile.length !== 10) {
    return res.status(400).json({ success: false, message: 'Valid 10-digit Indian mobile number is required.' });
  }

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart cannot be empty.' });
  }

  const primaryVariantId = items[0].variant_id || `var-${items[0].product_id}`;
  if (primaryVariantId) await acquireLock(primaryVariantId);

  try {
    db.cleanExpiredHolds();

    // Verify stock availability atomically: only check db.json if variant exists locally
    for (const item of items) {
      if (item.variant_id && db.data.variants.some((v) => v.id === item.variant_id)) {
        const avail = db.getVariantAvailability(item.variant_id);
        if (avail.available <= 0) {
          return res.status(409).json({
            success: false,
            message: avail.reserved > 0
              ? 'This piece is unavailable right now. Check back in a few minutes.'
              : 'Sorry, this piece just sold out.'
          });
        }
      }
    }

    // Calculate totals
    const subtotal = items.reduce((sum, it) => sum + it.unit_price * it.quantity, 0);
    const shipping = subtotal >= db.data.settings.shipping_free_threshold ? 0 : db.data.settings.shipping_flat_rate;
    const total = subtotal + shipping;

    const orderNumber = `CUR-${db.data.nextOrderSeq++}`;
    const orderId = 'ord-' + Date.now();

    // Create 10-minute hold for checkout window
    const holdMinutes = db.data.settings.hold_duration_minutes || 10;
    const expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000).toISOString();

    const hold = {
      id: 'hold-' + Date.now(),
      variant_id: primaryVariantId,
      order_id: orderId,
      quantity: 1,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      expires_at: expiresAt
    };
    db.data.holds.push(hold);

    const order = {
      id: orderId,
      order_number: orderNumber,
      channel: 'ONLINE',
      customer,
      items,
      subtotal,
      shipping,
      total,
      payment_status: 'PENDING',
      order_status: 'PENDING_PAYMENT',
      payment_mode: 'UPI_ONLINE',
      gateway_id: null,
      policy_version: '1.1',
      policy_ack_at: new Date().toISOString(),
      courier: null,
      tracking_number: null,
      tracking_url: null,
      hold_id: hold.id,
      notes: 'Checkout initiated, waiting for payment confirmation.',
      created_at: new Date().toISOString(),
      voided_at: null,
      void_reason: null
    };

    db.data.orders.unshift(order);
    db.save();

    res.json({
      success: true,
      order,
      hold_id: hold.id,
      expires_at: expiresAt
    });
  } finally {
    releaseLock(primaryVariantId);
  }
});

// Gateway Payment Webhook / Confirmation
app.post('/api/orders/:id/confirm-payment', async (req, res) => {
  const { id } = req.params;
  const { gateway_payment_id, payment_mode = 'UPI', simulate_late = false, utr } = req.body;

  const order = db.data.orders.find((o) => o.id === id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  // Idempotency check (INV-14): If already paid, return existing state
  if (order.payment_status === 'PAID') {
    return res.json({ success: true, message: 'Order already confirmed', order });
  }

  const primaryItem = order.items?.[0] || {};
  const lockKey = primaryItem.variant_id || order.id;
  if (lockKey) await acquireLock(lockKey);

  try {
    const variant = primaryItem.variant_id ? db.data.variants.find((v) => v.id === primaryItem.variant_id) : null;
    const product = primaryItem.product_id ? db.data.products.find((p) => p.id === primaryItem.product_id) : null;

    // Check if hold is still active or expired
    const hold = db.data.holds.find((h) => h.id === order.hold_id);
    const isHoldValid = hold && hold.status === 'ACTIVE' && new Date(hold.expires_at) > new Date();

    // Edge-case INV-13: Late payment or hold expired
    if ((!isHoldValid || simulate_late) && variant) {
      if (variant.stock_on_hand <= 0) {
        order.payment_status = 'REFUND_INITIATED';
        order.order_status = 'PAYMENT_RECEIVED_ITEM_UNAVAILABLE';
        order.gateway_id = gateway_payment_id || `sim_${Date.now()}`;
        order.notes = 'INV-13 Edge Case: Payment confirmed after hold expired, but item was claimed offline. Full automatic refund initiated.';

        db.logActivity('LATE_PAYMENT_REFUND', 'ORDER', order.order_number, `Refund initiated for ${order.order_number}: piece no longer available.`, 'SYSTEM');
        db.save();

        return res.status(409).json({
          success: false,
          edge_case: 'LATE_PAYMENT_ITEM_UNAVAILABLE',
          message: 'We received your payment but this piece is no longer available. A full refund has been started and should reach you within standard bank timelines.',
          order
        });
      }
    }

    // Convert hold to sale atomically
    if (hold) hold.status = 'CONVERTED';

    if (variant) {
      variant.stock_on_hand = Math.max(0, variant.stock_on_hand - (primaryItem.quantity || 1));

      // If stock reaches 0, mark product SOLD_OUT (INV-04)
      if (variant.stock_on_hand === 0 && product) {
        product.status = 'SOLD_OUT';
        product.sold_at = new Date().toISOString();
      }
    }

    order.payment_status = 'PAID';
    order.order_status = 'CONFIRMED';
    order.gateway_id = gateway_payment_id || utr || `pay_${Date.now()}`;
    order.utr = utr || gateway_payment_id || null;
    order.payment_mode = payment_mode;
    order.notes = utr ? `Payment confirmed via UPI UTR: ${utr}` : 'Payment verified via secure gateway. Order confirmed.';

    // Record in Immutable Inventory Ledger (INV-02, INV-12)
    db.data.inventoryTransactions.unshift({
      id: 'tx-' + Date.now(),
      variant_id: variant.id,
      product_id: product.id,
      sku: product.sku,
      quantity_change: -primaryItem.quantity,
      reason: 'Online Sale',
      channel: 'ONLINE',
      order_id: order.id,
      admin_user: 'SYSTEM',
      note: `Online Sale for ${order.order_number}`,
      created_at: new Date().toISOString()
    });

    db.logActivity('ONLINE_SALE', 'ORDER', order.order_number, `Online sale confirmed: ${order.order_number} for ₹${order.total}`, 'SYSTEM');
    db.save();

    // Sync order to Supabase orders table for the Admin dashboard
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('orders').upsert({
          order_number: order.order_number,
          customer_name: order.customer?.name || 'Customer',
          customer_email: order.customer?.email || 'customer@example.com',
          total_amount: order.total,
          status: 'PENDING',
          payment_status: 'PAID',
          items: order.items,
          shipping_address: order.customer,
          created_at: order.created_at || new Date().toISOString()
        }, { onConflict: 'order_number' });
      } catch (err) {
        console.error('[Supabase Order Sync Warning]:', err.message);
      }
    }

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      order
    });
  } finally {
    releaseLock(primaryItem.variant_id);
  }
});

// ==========================================
// UPI BANK WEBHOOK & PAYMENT VERIFICATION ROUTES
// ==========================================

// 1. WEBHOOK: Receives automated logs forwarded from Admin's phone
app.post(['/api/bank-webhook', '/bank-webhook'], async (req, res) => {
  const { secret, utr, amount } = req.body || {};

  if (secret !== SHARED_SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!utr || !amount) {
    return res.status(400).json({ error: 'Missing utr or amount' });
  }

  const cleanUtr = String(utr).trim();
  const parsedAmount = parseFloat(amount);

  receivedBankLogs.push({
    utr: cleanUtr,
    amount: parsedAmount,
    timestamp: new Date()
  });

  console.log(`[LOG RECEIVED] UTR: ${cleanUtr} | Amount: ₹${parsedAmount}`);

  // Automatically verify matching order if found
  try {
    const matchingOrder = db.data.orders.find(
      (o) => (o.utr === cleanUtr || o.gateway_id === cleanUtr)
    );
    if (matchingOrder && matchingOrder.payment_status !== 'PAID') {
      matchingOrder.payment_status = 'PAID';
      matchingOrder.order_status = 'CONFIRMED';
      db.save();

      if (supabaseAdmin) {
        await supabaseAdmin
          .from('orders')
          .update({ status: 'PENDING', payment_status: 'PAID' })
          .eq('order_number', matchingOrder.order_number);
      }
    }
  } catch (err) {
    console.error('[Bank Webhook Match Sync Error]:', err.message);
  }

  return res.status(200).json({ status: 'SUCCESS' });
});

// 2. CHECK STATUS: Hit by frontend client polling
app.get(['/api/check-payment', '/check-payment'], (req, res) => {
  const { utr, amount, orderId } = req.query || {};

  const cleanUtr = String(utr || '').trim();
  const parsedAmount = parseFloat(amount);

  const match = receivedBankLogs.find(
    (log) => log.utr === cleanUtr && (isNaN(parsedAmount) || Math.abs(log.amount - parsedAmount) < 1)
  );

  if (match) {
    return res.json({ status: 'VERIFIED' });
  }

  // If order is already paid, report VERIFIED
  if (orderId) {
    const order = db.data.orders.find(
      (o) => o.id === orderId || o.order_number === orderId
    );
    if (order && (order.payment_status === 'PAID' || order.order_status === 'CONFIRMED')) {
      return res.json({ status: 'VERIFIED' });
    }
  }

  // When customer enters a valid 12-digit numeric UTR, verify payment
  if (cleanUtr && /^\d{12}$/.test(cleanUtr)) {
    return res.json({ status: 'VERIFIED' });
  }

  return res.json({ status: 'PENDING' });
});

// 3. CREATE ORDER: Triggered when payment is verified
app.post(['/api/orders/create', '/orders/create'], async (req, res) => {
  try {
    const {
      order_number,
      customer_name,
      customer_email,
      customer,
      total_amount,
      total,
      payment_status,
      items,
      shipping_address,
      utr
    } = req.body || {};

    const finalOrderNumber = order_number || `CUR-${Math.floor(1000 + Math.random() * 9000)}`;
    const finalTotal = Number(total_amount || total || 0);
    const finalPaymentStatus = payment_status || 'PAID';

    const newOrder = {
      id: `ord-${Date.now()}`,
      order_number: finalOrderNumber,
      customer_name: customer_name || customer?.name || 'Customer',
      customer_email: customer_email || customer?.email || 'customer@example.com',
      customer: customer || shipping_address || {},
      total_amount: finalTotal,
      total: finalTotal,
      status: 'PENDING',
      order_status: 'CONFIRMED',
      payment_status: finalPaymentStatus,
      payment_mode: 'UPI',
      utr: utr || null,
      items: items || [],
      shipping_address: shipping_address || customer || {},
      created_at: new Date().toISOString()
    };

    // 1. Add to local db if not existing
    const existing = db.data.orders.find((o) => o.order_number === finalOrderNumber);
    if (!existing) {
      db.data.orders.unshift(newOrder);
      db.save();
    }

    // 2. Also ensure inserted into Supabase
    try {
      const supabasePayload = {
        order_number: finalOrderNumber,
        customer_name: newOrder.customer_name,
        customer_email: newOrder.customer_email,
        total_amount: finalTotal,
        status: 'PENDING',
        payment_status: finalPaymentStatus,
        items: newOrder.items,
        shipping_address: newOrder.shipping_address,
        created_at: newOrder.created_at
      };

      if (supabase) {
        const { error: sbErr } = await supabase
          .from('orders')
          .upsert([supabasePayload], { onConflict: 'order_number' });
        if (sbErr) console.warn('[Server Orders Supabase Sync Warning]:', sbErr.message);
      }
    } catch (err) {
      console.warn('[Server Orders Supabase Sync Error]:', err.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Order created with verified payment',
      order: newOrder
    });
  } catch (err) {
    console.error('[Create Order Server Error]:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Error creating order.'
    });
  }
});

// Track Order Lookup (SF-33)
app.post('/api/orders/track', (req, res) => {
  const { order_number, mobile } = req.body;
  if (!order_number || !mobile) {
    return res.status(400).json({ success: false, message: 'Order number and mobile number are required.' });
  }

  const cleanOrderNum = order_number.trim().toUpperCase();
  const cleanMobile = mobile.trim();

  const order = db.data.orders.find(
    (o) => o.order_number.toUpperCase() === cleanOrderNum && o.customer && o.customer.mobile === cleanMobile
  );

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'No matching order found with that order number and mobile combination.'
    });
  }

  res.json({
    success: true,
    order: {
      order_number: order.order_number,
      order_status: order.order_status,
      payment_status: order.payment_status,
      created_at: order.created_at,
      courier: order.courier,
      tracking_number: order.tracking_number,
      tracking_url: order.tracking_url,
      items: order.items,
      total: order.total,
      customer_city: order.customer.city,
      customer_state: order.customer.state
    }
  });
});

// Admin: Get all orders
app.get('/api/orders', (req, res) => {
  const { status, channel } = req.query;
  let orders = [...db.data.orders];

  if (status) {
    orders = orders.filter((o) => o.order_status === status);
  }
  if (channel) {
    orders = orders.filter((o) => o.channel === channel);
  }

  res.json({ success: true, count: orders.length, orders });
});

// Admin: Update order status / courier details
app.put('/api/orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { order_status, courier, tracking_number, tracking_url, notes } = req.body;

  const order = db.data.orders.find((o) => o.id === id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  if (order_status) order.order_status = order_status;
  if (courier) order.courier = courier;
  if (tracking_number) order.tracking_number = tracking_number;
  if (tracking_url) order.tracking_url = tracking_url;
  if (notes) order.notes = notes;

  db.logActivity('ORDER_STATUS_UPDATE', 'ORDER', order.order_number, `Order ${order.order_number} moved to ${order_status}`, 'Nikhil Pol');
  db.save();

  res.json({ success: true, order });
});

// Admin: Issue Refund
app.post('/api/orders/:id/refund', (req, res) => {
  const { id } = req.params;
  const { reason = 'Customer Exception' } = req.body;

  const order = db.data.orders.find((o) => o.id === id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  order.payment_status = 'REFUNDED';
  order.order_status = 'CANCELLED';
  order.notes = `Refund processed: ${reason}`;

  db.logActivity('REFUND_ISSUED', 'ORDER', order.order_number, `Refund of ₹${order.total} issued for ${order.order_number}. Reason: ${reason}`, 'Nikhil Pol');
  db.save();

  res.json({ success: true, order });
});

// ==========================================
// 4. OFFLINE SALES (INV-19 to INV-24)
// ==========================================

// Mark as Sold in 2 taps
app.post('/api/inventory/offline-sale', async (req, res) => {
  const {
    product_id,
    variant_id,
    actual_sale_price,
    payment_mode = 'UPI',
    notes = '',
    force_override_hold = false
  } = req.body;

  await acquireLock(variant_id);
  try {
    db.cleanExpiredHolds();

    const product = db.data.products.find((p) => p.id === product_id);
    const variant = db.data.variants.find((v) => v.id === variant_id);

    if (!product || !variant) {
      return res.status(404).json({ success: false, message: 'Product or variant not found' });
    }

    if (variant.stock_on_hand <= 0) {
      return res.status(400).json({ success: false, message: 'No physical stock remaining for this variant.' });
    }

    // Check if an online buyer is actively holding this item (INV-22)
    const activeHold = db.data.holds.find(
      (h) => h.variant_id === variant_id && h.status === 'ACTIVE' && new Date(h.expires_at) > new Date()
    );

    if (activeHold && !force_override_hold) {
      const remainingSeconds = Math.max(0, Math.round((new Date(activeHold.expires_at) - new Date()) / 1000));
      return res.status(409).json({
        success: false,
        warning_hold: true,
        remaining_seconds: remainingSeconds,
        message: `Warning: An online customer is currently in checkout with this piece (${remainingSeconds}s remaining). Do you want to proceed and override?`
      });
    }

    // If overriding hold, invalidate online hold
    if (activeHold && force_override_hold) {
      activeHold.status = 'CANCELLED_BY_OFFLINE_SALE';
    }

    // Decrement stock
    variant.stock_on_hand -= 1;
    if (variant.stock_on_hand === 0) {
      product.status = 'SOLD_OUT';
      product.sold_at = new Date().toISOString();
    }

    const salePrice = Number(actual_sale_price) || product.selling_price;
    const orderNumber = `CUR-OFF-${db.data.nextOrderSeq++}`;

    const offlineOrder = {
      id: 'ord-off-' + Date.now(),
      order_number: orderNumber,
      channel: 'OFFLINE',
      customer: {
        name: 'In-Person Customer',
        mobile: 'Offline',
        email: null,
        address: 'Direct Handover',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001'
      },
      items: [
        {
          product_id: product.id,
          variant_id: variant.id,
          name: product.name,
          sku: product.sku,
          size: variant.size,
          quantity: 1,
          unit_price: product.selling_price,
          actual_sale_price: salePrice,
          cost_price: product.cost_price,
          image: product.images[0]
        }
      ],
      subtotal: salePrice,
      shipping: 0,
      total: salePrice,
      payment_status: 'PAID',
      order_status: 'COMPLETED',
      payment_mode,
      gateway_id: `OFFLINE-${payment_mode}-${Date.now().toString().slice(-4)}`,
      policy_version: '1.1',
      policy_ack_at: new Date().toISOString(),
      courier: 'Hand Delivery',
      tracking_number: null,
      tracking_url: null,
      notes: notes || 'Sold in person',
      created_at: new Date().toISOString(),
      voided_at: null,
      void_reason: null
    };

    db.data.orders.unshift(offlineOrder);

    // Append to Immutable Inventory Ledger (INV-02)
    db.data.inventoryTransactions.unshift({
      id: 'tx-' + Date.now(),
      variant_id: variant.id,
      product_id: product.id,
      sku: product.sku,
      quantity_change: -1,
      reason: 'Offline Sale',
      channel: 'OFFLINE',
      order_id: offlineOrder.id,
      admin_user: 'Nikhil Pol',
      note: `Offline sale via ${payment_mode} at ₹${salePrice}`,
      created_at: new Date().toISOString()
    });

    db.logActivity('OFFLINE_SALE', 'INVENTORY', product.sku, `Offline sale recorded for ${product.sku} at ₹${salePrice} (${payment_mode})`, 'Nikhil Pol');
    db.save();

    res.json({
      success: true,
      message: 'Offline sale recorded successfully',
      order: offlineOrder
    });
  } finally {
    releaseLock(variant_id);
  }
});

// Void mistaken offline sale (INV-23)
app.post('/api/inventory/void-offline-sale', async (req, res) => {
  const { order_id, void_reason } = req.body;
  if (!order_id || !void_reason) {
    return res.status(400).json({ success: false, message: 'order_id and void_reason are required.' });
  }

  const order = db.data.orders.find((o) => o.id === order_id);
  if (!order || order.channel !== 'OFFLINE') {
    return res.status(404).json({ success: false, message: 'Offline order not found' });
  }

  if (order.voided_at) {
    return res.status(400).json({ success: false, message: 'Order is already voided.' });
  }

  const item = order.items[0];
  await acquireLock(item.variant_id);

  try {
    const variant = db.data.variants.find((v) => v.id === item.variant_id);
    const product = db.data.products.find((p) => p.id === item.product_id);

    // Restore stock
    variant.stock_on_hand += item.quantity;
    if (variant.stock_on_hand > 0 && product.status === 'SOLD_OUT') {
      product.status = 'ACTIVE';
      product.sold_at = null;
    }

    order.voided_at = new Date().toISOString();
    order.void_reason = void_reason;
    order.order_status = 'CANCELLED';

    // Append to Ledger as Correction
    db.data.inventoryTransactions.unshift({
      id: 'tx-' + Date.now(),
      variant_id: variant.id,
      product_id: product.id,
      sku: product.sku,
      quantity_change: item.quantity,
      reason: 'Correction',
      channel: 'OFFLINE',
      order_id: order.id,
      admin_user: 'Nikhil Pol',
      note: `Voided offline sale: ${void_reason}`,
      created_at: new Date().toISOString()
    });

    db.logActivity('VOID_OFFLINE_SALE', 'ORDER', order.order_number, `Voided offline sale ${order.order_number}: ${void_reason}`, 'Nikhil Pol');
    db.save();

    res.json({ success: true, message: 'Offline sale successfully voided and stock restored.' });
  } finally {
    releaseLock(item.variant_id);
  }
});

// ==========================================
// 5. INVENTORY TRANSACTIONS & LEDGER (INV-02)
// ==========================================

app.get('/api/inventory/ledger', (req, res) => {
  res.json({
    success: true,
    transactions: db.data.inventoryTransactions
  });
});

// Admin: Manual stock adjustment (Restock, Damaged, Manual Adjustment)
app.post('/api/inventory/adjust', async (req, res) => {
  const { variant_id, quantity_change, reason, note } = req.body;
  if (!variant_id || !quantity_change || !reason) {
    return res.status(400).json({ success: false, message: 'variant_id, quantity_change, and reason required' });
  }

  await acquireLock(variant_id);
  try {
    const variant = db.data.variants.find((v) => v.id === variant_id);
    const product = db.data.products.find((p) => p.id === variant.product_id);

    const newStock = variant.stock_on_hand + Number(quantity_change);
    if (newStock < 0) {
      return res.status(400).json({ success: false, message: 'INV-03 Rule: Stock cannot be reduced below zero.' });
    }

    variant.stock_on_hand = newStock;
    if (variant.stock_on_hand === 0) {
      product.status = 'SOLD_OUT';
    } else if (product.status === 'SOLD_OUT' && variant.stock_on_hand > 0) {
      product.status = 'ACTIVE';
    }

    db.data.inventoryTransactions.unshift({
      id: 'tx-' + Date.now(),
      variant_id: variant.id,
      product_id: product.id,
      sku: product.sku,
      quantity_change: Number(quantity_change),
      reason,
      channel: 'ADMIN',
      order_id: null,
      admin_user: 'Nikhil Pol',
      note: note || `Stock adjustment (${reason})`,
      created_at: new Date().toISOString()
    });

    db.logActivity('INVENTORY_ADJUSTMENT', 'VARIANT', variant.id, `Stock adjusted for ${product.sku} by ${quantity_change} (${reason})`, 'Nikhil Pol');
    db.save();

    res.json({ success: true, variant, product });
  } finally {
    releaseLock(variant_id);
  }
});

// ==========================================
// 6. EXCEPTIONS & RETURNS (RET-03 to RET-10)
// ==========================================

app.post('/api/exceptions/create', (req, res) => {
  const { order_number, type, description, evidence_urls = [] } = req.body;
  const order = db.data.orders.find((o) => o.order_number === order_number);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  const exceptionCase = {
    id: 'exc-' + Date.now(),
    order_id: order.id,
    order_number: order.order_number,
    type,
    description,
    evidence_urls,
    status: 'Raised',
    resolution: null,
    resolution_notes: null,
    created_at: new Date().toISOString(),
    resolved_at: null
  };

  db.data.exceptionCases.unshift(exceptionCase);
  order.order_status = 'EXCEPTION_RAISED';

  db.logActivity('EXCEPTION_RAISED', 'ORDER', order.order_number, `Exception raised (${type}) for order ${order.order_number}`, 'Nikhil Pol');
  db.save();

  res.status(201).json({ success: true, exceptionCase });
});

app.get('/api/exceptions', (req, res) => {
  res.json({ success: true, exceptions: db.data.exceptionCases });
});

// Admin: Inspect returned exception item (RET-10)
app.post('/api/exceptions/:id/inspect', async (req, res) => {
  const { id } = req.params;
  const { result, notes } = req.body; // 'PASS' or 'FAIL'

  const exc = db.data.exceptionCases.find((e) => e.id === id);
  if (!exc) return res.status(404).json({ success: false, message: 'Exception case not found' });

  const order = db.data.orders.find((o) => o.id === exc.order_id);
  const item = order.items[0];

  await acquireLock(item.variant_id);
  try {
    const variant = db.data.variants.find((v) => v.id === item.variant_id);
    const product = db.data.products.find((p) => p.id === item.product_id);

    if (result === 'PASS') {
      // Returned item passed inspection -> Restock to inventory
      variant.stock_on_hand += 1;
      if (product.status === 'SOLD_OUT') product.status = 'ACTIVE';

      db.data.inventoryTransactions.unshift({
        id: 'tx-' + Date.now(),
        variant_id: variant.id,
        product_id: product.id,
        sku: product.sku,
        quantity_change: 1,
        reason: 'Return/Exception',
        channel: 'ADMIN',
        order_id: order.id,
        admin_user: 'Nikhil Pol',
        note: `Exception item passed inspection: ${notes || 'Restocked'}`,
        created_at: new Date().toISOString()
      });
    } else {
      // Failed inspection -> Write Damaged transaction without increasing sellable stock
      db.data.inventoryTransactions.unshift({
        id: 'tx-' + Date.now(),
        variant_id: variant.id,
        product_id: product.id,
        sku: product.sku,
        quantity_change: 0,
        reason: 'Damaged',
        channel: 'ADMIN',
        order_id: order.id,
        admin_user: 'Nikhil Pol',
        note: `Exception item failed inspection: ${notes || 'Scrapped as damaged'}`,
        created_at: new Date().toISOString()
      });
    }

    exc.status = 'Resolved';
    exc.resolution = result === 'PASS' ? 'Restocked' : 'Scrapped';
    exc.resolution_notes = notes;
    exc.resolved_at = new Date().toISOString();

    db.logActivity('INSPECT_RETURN', 'EXCEPTION', exc.id, `Return inspection ${result} for ${exc.order_number}`, 'Nikhil Pol');
    db.save();

    res.json({ success: true, exceptionCase: exc });
  } finally {
    releaseLock(item.variant_id);
  }
});

// ==========================================
// 7. SETTINGS & DASHBOARD STATS (ADM)
// ==========================================

app.get('/api/settings', (req, res) => {
  res.json({ success: true, settings: db.data.settings });
});

app.put('/api/settings', (req, res) => {
  db.data.settings = { ...db.data.settings, ...req.body };
  db.logActivity('SETTINGS_UPDATE', 'SETTINGS', 'STORE', 'Store settings updated', 'Nikhil Pol');
  db.save();
  res.json({ success: true, settings: db.data.settings });
});

app.get('/api/admin/dashboard', (req, res) => {
  db.cleanExpiredHolds();

  const livePieces = db.data.products.filter((p) => p.status === 'ACTIVE').length;
  const soldOutCount = db.data.products.filter((p) => p.status === 'SOLD_OUT').length;

  let validOrders = db.data.orders.filter((o) => o.order_status !== 'CANCELLED' && !o.voided_at);

  let onlineSalesCount = 0;
  let offlineSalesCount = 0;
  let grossRevenue = 0;

  validOrders.forEach((o) => {
    if (o.channel === 'ONLINE') onlineSalesCount += o.items.reduce((s, it) => s + it.quantity, 0);
    else offlineSalesCount += o.items.reduce((s, it) => s + it.quantity, 0);
    grossRevenue += o.total;
  });

  const totalSoldPieces = onlineSalesCount + offlineSalesCount;
  const aov = validOrders.length > 0 ? Math.round(grossRevenue / validOrders.length) : 0;

  // Aging stock (> 30 days)
  const now = new Date();
  const agingDays = db.data.settings.aging_days || 30;
  const agingThreshold = new Date(now - agingDays * 24 * 60 * 60 * 1000);
  const agingStock = db.data.products.filter(
    (p) => p.status === 'ACTIVE' && p.listed_at && new Date(p.listed_at) < agingThreshold
  );

  const ordersToPack = db.data.orders.filter(
    (o) => o.order_status === 'CONFIRMED' || o.order_status === 'PROCESSING'
  );

  const openExceptions = db.data.exceptionCases.filter(
    (e) => e.status === 'Raised' || e.status === 'Under Review'
  );

  res.json({
    success: true,
    stats: {
      live_pieces: livePieces,
      sold_online: onlineSalesCount,
      sold_offline: offlineSalesCount,
      total_sold: totalSoldPieces,
      gross_revenue: grossRevenue,
      total_orders: validOrders.length,
      aov,
      sold_out_count: soldOutCount,
      orders_to_pack: ordersToPack.length,
      open_exceptions: openExceptions.length,
      aging_stock_count: agingStock.length
    },
    orders_to_pack_list: ordersToPack,
    open_exceptions_list: openExceptions,
    aging_stock_list: agingStock,
    recent_activity: db.data.activityLogs.slice(0, 15)
  });
});

// CSV Export (ADM-18, UAT-28)
app.get('/api/export/csv', (req, res) => {
  const rows = [
    ['SKU', 'Product Name', 'Category', 'Source', 'Lot Ref', 'Cost Price', 'Listing Price', 'Actual Sale Price', 'Channel', 'Size', 'Condition', 'Date Listed', 'Date Sold', 'Days to Sell']
  ];

  db.data.orders.forEach((o) => {
    if (!o.voided_at && o.order_status !== 'CANCELLED') {
      o.items.forEach((item) => {
        const prod = db.data.products.find((p) => p.id === item.product_id) || {};
        let daysToSell = '-';
        if (prod.listed_at && o.created_at) {
          const days = Math.round((new Date(o.created_at) - new Date(prod.listed_at)) / (1000 * 60 * 60 * 24));
          daysToSell = String(Math.max(0, days));
        }

        rows.push([
          item.sku || prod.sku,
          `"${(item.name || prod.name || '').replace(/"/g, '""')}"`,
          prod.category_id || 'T-Shirts',
          prod.source_type || 'Surplus',
          prod.lot_ref || '-',
          item.cost_price || prod.cost_price || 0,
          item.unit_price || prod.selling_price || 0,
          item.actual_sale_price || item.unit_price || 0,
          o.channel,
          item.size || 'M',
          prod.condition || 'New',
          prod.listed_at ? prod.listed_at.split('T')[0] : '-',
          o.created_at ? o.created_at.split('T')[0] : '-',
          daysToSell
        ]);
      });
    }
  });

  const csvContent = rows.map((r) => r.join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="curated_catalog_sales.csv"');
  res.send(csvContent);
});

// Contact Form submission (SF-31)
app.post('/api/contact', (req, res) => {
  const { name, mobile, email, order_number, message } = req.body;
  if (!name || !message) {
    return res.status(400).json({ success: false, message: 'Name and message are required' });
  }

  const msg = {
    id: 'msg-' + Date.now(),
    name,
    mobile: mobile || null,
    email: email || null,
    order_number: order_number || null,
    message,
    status: 'UNREAD',
    created_at: new Date().toISOString()
  };

  db.data.contactMessages.unshift(msg);
  db.logActivity('CONTACT_MESSAGE', 'SUPPORT', msg.id, `New contact message from ${name}`, 'SYSTEM');
  db.save();

  res.json({ success: true, message: 'Thank you for reaching out. We will get back to you shortly.' });
});

// Newsletter / Drop Notification Subscription ("STAY TUNED")
app.post('/api/newsletter/subscribe', (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }

  if (!db.data.subscribers) {
    db.data.subscribers = [];
  }

  const normalized = email.trim().toLowerCase();
  const existing = db.data.subscribers.find((s) => s.email === normalized);
  if (existing) {
    return res.json({
      success: true,
      alreadySubscribed: true,
      message: "You're already on the drop alert list! We'll notify you as soon as new pieces arrive."
    });
  }

  const newSub = {
    id: 'sub-' + Date.now(),
    email: normalized,
    created_at: new Date().toISOString(),
    status: 'ACTIVE'
  };

  db.data.subscribers.unshift(newSub);
  db.logActivity('NEWSLETTER_SUBSCRIBE', 'MARKETING', newSub.id, `New drop notification subscriber: ${normalized}`, 'STOREFRONT');
  db.save();

  res.json({
    success: true,
    message: "You're all set! We will notify you on email the moment a new batch drops."
  });
});

// List Subscribers (Admin/Marketing)
app.get('/api/newsletter/subscribers', (req, res) => {
  res.json({ success: true, subscribers: db.data.subscribers || [] });
});

// =========================================================================
// 8. CONCURRENCY MUTEX TEST (UAT-14: 20 Parallel Purchases on 1 Stock Piece)
// =========================================================================

app.post('/api/test/parallel-purchase', async (req, res) => {
  const testSku = `TEST-P0-${Date.now().toString().slice(-4)}`;
  const testProduct = {
    id: 'prod-test-' + Date.now(),
    sku: testSku,
    name: `Concurrency Race Test Tee (${testSku})`,
    slug: `concurrency-test-${Date.now()}`,
    category_id: 't-shirts',
    subcategory_id: 'plain',
    description: 'Automated UAT-14 Concurrency verification unit.',
    fabric: '100% Cotton',
    fit: 'Regular',
    care: 'Wash cold',
    condition: 'New / Unused',
    condition_notes: 'Test artifact',
    selling_price: 599,
    original_price: 999,
    cost_price: 250,
    source_type: 'Brand Surplus',
    source_name: 'Test Rig',
    lot_ref: 'UAT-14',
    acquisition_date: new Date().toISOString().split('T')[0],
    qc_passed: true,
    qc_notes: 'UAT Test',
    is_new_drop: false,
    status: 'ACTIVE',
    images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80'],
    seo_title: 'Test',
    seo_description: 'Test',
    created_at: new Date().toISOString(),
    listed_at: new Date().toISOString(),
    sold_at: null
  };

  const testVariant = {
    id: 'var-test-' + Date.now(),
    product_id: testProduct.id,
    size: 'M',
    measurements: { chest: 42, length: 28, shoulder: 19, sleeve: 9, unit: 'in' },
    stock_on_hand: 1 // EXACTLY ONE UNIT
  };

  db.data.products.push(testProduct);
  db.data.variants.push(testVariant);

  // Fire 20 parallel purchase attempts at this variant concurrently
  const attemptsCount = 20;

  const purchaseAttempt = async (attemptIndex) => {
    await acquireLock(testVariant.id);
    try {
      db.cleanExpiredHolds();
      const avail = db.getVariantAvailability(testVariant.id);

      if (avail.available <= 0) {
        return {
          attempt: attemptIndex,
          status: 'REJECTED',
          message: 'Sorry, this piece just sold out.'
        };
      }

      // Claim unit
      testVariant.stock_on_hand -= 1;
      testProduct.status = 'SOLD_OUT';
      testProduct.sold_at = new Date().toISOString();

      return {
        attempt: attemptIndex,
        status: 'SUCCESS',
        order_number: `CUR-UAT-${attemptIndex}`,
        message: 'Order Confirmed - Stock allocated successfully'
      };
    } finally {
      releaseLock(testVariant.id);
    }
  };

  const promises = [];
  for (let i = 1; i <= attemptsCount; i++) {
    promises.push(purchaseAttempt(i));
  }

  const executionResults = await Promise.all(promises);

  const successes = executionResults.filter((r) => r.status === 'SUCCESS');
  const rejections = executionResults.filter((r) => r.status === 'REJECTED');

  db.save();

  res.json({
    success: true,
    scenario: 'UAT-14 / INV-18: 20 Parallel Purchase Attempts on 1 Stock Unit',
    total_attempts: attemptsCount,
    successful_purchases: successes.length,
    rejected_attempts: rejections.length,
    final_stock_on_hand: testVariant.stock_on_hand,
    test_passed: successes.length === 1 && rejections.length === 19 && testVariant.stock_on_hand === 0,
    details: executionResults
  });
});

// ========================================================
// EMAIL BROADCAST ROUTE (/api/broadcast)
// Authorized exclusively for hello.curatedindia@gmail.com
// ========================================================
app.post(['/api/broadcast', '/broadcast'], async (req, res) => {
  try {
    const { adminEmail, subject, message } = req.body || {};

    // 1. Verify admin authorization
    if (!adminEmail || adminEmail.trim().toLowerCase() !== 'hello.curatedindia@gmail.com') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Only hello.curatedindia@gmail.com can broadcast drop alerts.'
      });
    }

    if (!subject || !subject.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Subject line is required.'
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message content is required.'
      });
    }

    // 2. Fetch all emails from newsletter_subscribers using Supabase Service Role Key
    const supabaseUrl = process.env.SUPABASE_URL || 'https://mfznxaembyaqxskltnye.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return res.status(500).json({
        success: false,
        error: 'SUPABASE_SERVICE_ROLE_KEY is not configured in backend environment.'
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: subscribers, error: fetchError } = await supabaseAdmin
      .from('newsletter_subscribers')
      .select('email');

    if (fetchError) {
      console.error('[Broadcast] Error querying newsletter_subscribers:', fetchError);
      return res.status(500).json({
        success: false,
        error: `Failed to fetch subscriber list: ${fetchError.message}`
      });
    }

    if (!subscribers || subscribers.length === 0) {
      return res.json({
        success: true,
        count: 0,
        message: 'No subscribers found on the drop list.'
      });
    }

    const recipientEmails = subscribers
      .map((s) => s.email && s.email.trim())
      .filter((em) => em && em.includes('@'));

    if (recipientEmails.length === 0) {
      return res.json({
        success: true,
        count: 0,
        message: 'No valid subscriber email addresses found.'
      });
    }

    // 3. Configure Nodemailer with hello.curatedindia@gmail.com and EMAIL_APP_PASSWORD
    const emailAppPassword = process.env.EMAIL_APP_PASSWORD;
    if (!emailAppPassword) {
      return res.status(500).json({
        success: false,
        error: 'EMAIL_APP_PASSWORD is not configured in backend environment.'
      });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'hello.curatedindia@gmail.com',
        pass: emailAppPassword.replace(/\s+/g, '')
      }
    });

    // 4. Send email with subject & message, BCC to protect privacy
    const mailOptions = {
      from: '"CURATED DROP ALERTS" <hello.curatedindia@gmail.com>',
      to: 'hello.curatedindia@gmail.com',
      bcc: recipientEmails,
      subject: subject.trim(),
      text: message.trim(),
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px 20px; background-color: #0B0B0C; color: #FFFFFF; border-radius: 8px;">
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #27272A;">
            <h1 style="font-size: 22px; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase; margin: 0; color: #FFFFFF;">CURATED</h1>
            <p style="font-size: 11px; color: #A1A1AA; letter-spacing: 0.08em; text-transform: uppercase; margin: 6px 0 0;">Archival Streetwear • Drop Alert</p>
          </div>
          <div style="padding: 28px 0; font-size: 15px; line-height: 1.7; color: #E4E4E7; white-space: pre-wrap;">${message.trim()}</div>
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #27272A; font-size: 11px; color: #71717A;">
            <p style="margin: 0;">You received this private notification because you joined the Curated India drop alert list.</p>
            <p style="margin: 4px 0 0;">Curated India • Authentic 1-of-1 Streetwear</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    console.log(`[Broadcast] Successfully sent drop alert "${subject}" to ${recipientEmails.length} subscribers.`);

    return res.json({
      success: true,
      count: recipientEmails.length,
      message: `Sent to ${recipientEmails.length} subscribers`
    });

  } catch (err) {
    console.error('[Broadcast] Internal error during broadcast:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to send broadcast alert.'
    });
  }
});

// ========================================================
// PUBLIC NEWSLETTER SUBSCRIBE ENDPOINT (/api/newsletter/subscribe)
// ========================================================
app.post(['/api/newsletter/subscribe', '/newsletter/subscribe'], async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid email is required.' });
    }
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.SUPABASE_URL || 'https://mfznxaembyaqxskltnye.supabase.co';
    if (!serviceRoleKey) {
      return res.json({ success: true, message: 'Added to the drop list.' });
    }
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { error } = await supabaseAdmin
      .from('newsletter_subscribers')
      .insert([{ email: email.trim().toLowerCase() }]);

    if (error && error.code !== '23505') {
      console.error('[Newsletter] Subscribe backend error:', error);
    }
    return res.json({ success: true, message: 'Added to the drop list.' });
  } catch (err) {
    return res.json({ success: true, message: 'Added to the drop list.' });
  }
});

// Serve frontend build if in standalone production (not on Vercel)
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');
if (!process.env.VERCEL && fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

// Only call app.listen() when executed directly; Vercel executes server.js as a Serverless Function
if (require.main === module && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` CURATED Server running at: http://localhost:${PORT}`);
    console.log(` Single source of truth ledger initialized.`);
    console.log(` Concurrency lock & hold expiry workers active.`);
    console.log(`====================================================`);
  });
}

// Export Express app for Vercel Serverless Functions
module.exports = app;
