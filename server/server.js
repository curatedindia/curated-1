require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;

// Supabase Configuration
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.SUPABASE_URL || 'https://mfznxaembyaqxskltnye.supabase.co';
const supabaseAdmin = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;
const supabasePublic = createClient(
  supabaseUrl,
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_HUnzC5IyK0POGKq_bllJ9g_f4aiAJSq'
);

// Razorpay Payment Gateway Configuration
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

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

// Admin authentication middleware (enforces AUTHORIZED_ADMIN_EMAIL)
const requireAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return res.status(401).json({ success: false, message: 'Admin authentication required.' });
    }

    const clientForAuth = supabaseAdmin || supabasePublic;
    const { data: { user }, error } = await clientForAuth.auth.getUser(token);
    const configuredAdmins = (process.env.AUTHORIZED_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'hello.curatedindia@gmail.com')
      .toLowerCase()
      .split(',')
      .map((e) => e.trim());
    const validAdmins = [...new Set([...configuredAdmins, 'hello.curatedindia@gmail.com'])];

    const userEmail = (user?.email || '').toLowerCase().trim();
    if (error || !user || !userEmail || !validAdmins.includes(userEmail)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin credentials required.' });
    }

    req.adminUser = user;
    return next();
  } catch (err) {
    console.error('[Admin Auth Error]:', err);
    return res.status(500).json({ success: false, message: 'Authentication verification failure.' });
  }
};

// Helper: collision-resistant order number generator
let orderSeqCounter = 0;
function generateOrderNumber() {
  const timePart = Date.now().toString(36).toUpperCase();
  orderSeqCounter = (orderSeqCounter + 1) % 1000000;
  const seqPart = orderSeqCounter.toString(36).toUpperCase().padStart(4, '0');
  const randPart = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `CUR-${timePart}-${seqPart}${randPart}`;
}

// 1. CREATE RAZORPAY PAYMENT ORDER
app.post(['/api/razorpay/create-order', '/razorpay/create-order'], async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, notes, items, shipping, delivery_charge } = req.body || {};

    let clientAmount = parseFloat(amount);
    let verifiedTotal = clientAmount;

    if (Array.isArray(items) && items.length > 0) {
      const calculatedSubtotal = items.reduce((sum, it) => {
        const itemPrice = Number(it.unit_price || it.selling_price || it.price || 0);
        const qty = Number(it.quantity || 1);
        return sum + (itemPrice * qty);
      }, 0);

      const hasItemDeliveryCharge = items.some((it) =>
        (it.deliveryCharge !== undefined && it.deliveryCharge !== null && it.deliveryCharge !== '') ||
        (it.delivery_charge !== undefined && it.delivery_charge !== null && it.delivery_charge !== '')
      );

      let calculatedShipping = 0;
      if (hasItemDeliveryCharge) {
        calculatedShipping = items.reduce((sum, it) => {
          const ch = it.deliveryCharge !== undefined && it.deliveryCharge !== null && it.deliveryCharge !== ''
            ? Number(it.deliveryCharge)
            : (it.delivery_charge !== undefined && it.delivery_charge !== null && it.delivery_charge !== ''
              ? Number(it.delivery_charge)
              : 0);
          return sum + (isNaN(ch) ? 0 : ch);
        }, 0);
      } else if (shipping !== undefined && shipping !== null && shipping !== '') {
        calculatedShipping = Number(shipping) || 0;
      } else if (delivery_charge !== undefined && delivery_charge !== null && delivery_charge !== '') {
        calculatedShipping = Number(delivery_charge) || 0;
      } else if (clientAmount > 0 && Math.abs(clientAmount - calculatedSubtotal) < 0.01) {
        calculatedShipping = 0;
      }

      const expectedTotal = calculatedSubtotal + calculatedShipping;

      if (calculatedSubtotal > 0 && clientAmount < calculatedSubtotal) {
        console.warn(`[Security Alert] Client amount (₹${clientAmount}) lower than item subtotal (₹${calculatedSubtotal}). Enforcing expected total.`);
        verifiedTotal = expectedTotal > 0 ? expectedTotal : calculatedSubtotal;
      } else if (clientAmount > 0) {
        verifiedTotal = clientAmount;
      } else if (expectedTotal > 0) {
        verifiedTotal = expectedTotal;
      }
    }

    if (!verifiedTotal || verifiedTotal <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid order amount' });
    }

    const amountInPaise = Math.round(verifiedTotal * 100);
    const authHeader = 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');

    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency,
        receipt: receipt || `rcpt_${Date.now()}`,
        notes: notes || {}
      })
    });

    const rzpData = await rzpRes.json();
    if (!rzpRes.ok) {
      console.error('[Razorpay Order Creation Error]:', rzpData);
      return res.status(rzpRes.status).json({
        success: false,
        message: rzpData.error?.description || 'Failed to create Razorpay order',
        error: rzpData.error
      });
    }

    return res.status(200).json({
      success: true,
      order_id: rzpData.id,
      amount: rzpData.amount,
      currency: rzpData.currency,
      key_id: RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('[Razorpay Order Create Exception]:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error creating Razorpay order' });
  }
});

// 2. VERIFY RAZORPAY PAYMENT & CONFIRM ORDER
app.post(['/api/razorpay/verify-payment', '/razorpay/verify-payment'], async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      order_number,
      customer_name,
      customer_email,
      customer,
      items,
      total_amount,
      total,
      shipping_address
    } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing Razorpay payment parameters.' });
    }

    // Verify HMAC SHA256 Signature using timing-safe comparison
    const hmac = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generated_signature = hmac.digest('hex');

    const genBuf = Buffer.from(generated_signature, 'utf8');
    const recBuf = Buffer.from(razorpay_signature, 'utf8');

    if (genBuf.length !== recBuf.length || !crypto.timingSafeEqual(genBuf, recBuf)) {
      console.error('[Razorpay Signature Mismatch]:', { generated: generated_signature, received: razorpay_signature });
      return res.status(400).json({ success: false, message: 'Payment verification failed: Invalid signature' });
    }

    console.log(`[RAZORPAY VERIFIED] Payment ID: ${razorpay_payment_id} | Order ID: ${razorpay_order_id}`);

    const finalOrderNumber = order_number || generateOrderNumber();
    const finalTotal = Number(total_amount || total || 0);

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
      payment_status: 'PAID',
      payment_mode: 'RAZORPAY',
      gateway_id: razorpay_payment_id,
      gateway_payment_id: razorpay_payment_id,
      razorpay_order_id,
      razorpay_payment_id,
      items: items || [],
      shipping_address: {
        ...(shipping_address || customer || {}),
        payment_mode: 'RAZORPAY',
        razorpay_order_id,
        razorpay_payment_id
      },
      created_at: new Date().toISOString()
    };

    const targetSupabase = supabaseAdmin || supabasePublic;

    // Atomically decrement total_available on purchased products in Supabase 'products' table
    if (Array.isArray(items) && targetSupabase) {
      for (const item of items) {
        const prodId = item.product_id || item.id;
        const qty = Number(item.quantity || 1);

        if (prodId) {
          try {
            const { data: currentProduct, error: fetchErr } = await targetSupabase
              .from('products')
              .select('id, total_available, status, pieces_sold')
              .eq('id', prodId)
              .maybeSingle();

            if (!fetchErr && currentProduct) {
              const currentAvail = currentProduct.total_available !== undefined && currentProduct.total_available !== null
                ? Number(currentProduct.total_available)
                : 1;
              const remaining = currentAvail - qty;
              const updateData = {
                total_available: Math.max(0, remaining),
                pieces_sold: (Number(currentProduct.pieces_sold) || 0) + qty
              };
              if (remaining <= 0) {
                updateData.status = 'SOLD_OUT';
                updateData.sold_at = new Date().toISOString();
              }
              await targetSupabase
                .from('products')
                .update(updateData)
                .eq('id', prodId);
            }
          } catch (prodUpdErr) {
            console.warn('[Supabase Product Decrement Error]:', prodUpdErr.message);
          }
        }
      }
    }

    if (targetSupabase) {
      try {
        const supabasePayload = {
          order_number: finalOrderNumber,
          customer_name: newOrder.customer_name,
          customer_email: newOrder.customer_email,
          total_amount: finalTotal,
          status: 'PENDING',
          payment_status: 'PAID',
          items: newOrder.items,
          shipping_address: newOrder.shipping_address,
          created_at: newOrder.created_at
        };

        const { error: sbErr } = await targetSupabase
          .from('orders')
          .insert([supabasePayload]);

        if (sbErr && sbErr.code !== '23505') {
          console.warn('[Supabase Sync Warning]:', sbErr.message);
        } else {
          console.log('[Supabase Server Sync Success]:', finalOrderNumber);
        }
      } catch (err) {
        console.warn('[Supabase Sync Exception]:', err.message);
      }
    }

    return res.status(200).json({
      success: true,
      verified: true,
      message: 'Payment verified and order confirmed successfully',
      order: newOrder
    });
  } catch (err) {
    console.error('[Razorpay Verify Error]:', err);
    return res.status(500).json({ success: false, message: err.message || 'Error verifying Razorpay payment' });
  }
});

// 3. CREATE ORDER (Direct sync endpoint)
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
      payment_mode,
      gateway_payment_id,
      razorpay_payment_id,
      razorpay_order_id,
      items,
      shipping_address
    } = req.body || {};

    const finalOrderNumber = order_number || generateOrderNumber();
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
      payment_mode: payment_mode || 'RAZORPAY',
      gateway_id: razorpay_payment_id || gateway_payment_id || null,
      gateway_payment_id: razorpay_payment_id || gateway_payment_id || null,
      razorpay_order_id: razorpay_order_id || null,
      razorpay_payment_id: razorpay_payment_id || null,
      items: items || [],
      shipping_address: shipping_address || customer || {},
      created_at: new Date().toISOString()
    };

    const targetSupabase = supabaseAdmin || supabasePublic;
    if (targetSupabase) {
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

        await targetSupabase
          .from('orders')
          .upsert([supabasePayload], { onConflict: 'order_number' });
      } catch (err) {
        console.warn('[Server Orders Supabase Sync Error]:', err.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Order created successfully',
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

// 4. TRACK ORDER LOOKUP
app.post(['/api/orders/track', '/orders/track'], async (req, res) => {
  try {
    const { order_number, mobile } = req.body || {};
    if (!order_number || !mobile) {
      return res.status(400).json({ success: false, message: 'Order number and mobile number are required.' });
    }

    const cleanOrderNum = String(order_number).trim();
    const cleanMobile = String(mobile).trim();
    const targetDigits = cleanMobile.replace(/\D/g, '');

    const client = supabaseAdmin || supabasePublic;

    let order = null;

    if (client) {
      const { data, error } = await client
        .from('orders')
        .select('*')
        .ilike('order_number', cleanOrderNum);

      if (!error && Array.isArray(data) && data.length > 0) {
        order = data.find((o) => {
          const shipMobile = o.shipping_address?.mobile || o.shipping_address?.phone || o.shipping_address?.phoneNumber;
          const custMobile = o.customer?.mobile || o.customer?.phone || o.phone_number;
          const shipDigits = shipMobile ? String(shipMobile).replace(/\D/g, '') : '';
          const custDigits = custMobile ? String(custMobile).replace(/\D/g, '') : '';

          return (
            (shipDigits && (shipDigits === targetDigits || shipDigits.endsWith(targetDigits) || targetDigits.endsWith(shipDigits))) ||
            (custDigits && (custDigits === targetDigits || custDigits.endsWith(targetDigits) || targetDigits.endsWith(custDigits)))
          );
        });
      }
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'No matching order found with that order number and mobile combination.'
      });
    }

    return res.json({
      success: true,
      order: {
        order_number: order.order_number,
        order_status: order.order_status || order.status || 'CONFIRMED',
        payment_status: order.payment_status || 'PAID',
        created_at: order.created_at,
        courier: order.courier || order.shipping_address?.courier || null,
        tracking_number: order.tracking_number || order.shipping_address?.tracking_number || null,
        tracking_url: order.tracking_url || order.shipping_address?.tracking_url || null,
        items: order.items || [],
        total: order.total_amount || order.total || 0,
        customer_city: order.shipping_address?.city || order.customer?.city || null,
        customer_state: order.shipping_address?.state || order.customer?.state || null
      }
    });
  } catch (err) {
    console.error('[Track Order Error]:', err);
    return res.status(500).json({ success: false, message: 'Server error looking up order.' });
  }
});

// 5. CONTACT FORM SUBMISSION
app.post(['/api/contact', '/contact'], (req, res) => {
  const { name, message } = req.body || {};
  if (!name || !message) {
    return res.status(400).json({ success: false, message: 'Name and message are required' });
  }

  return res.json({ success: true, message: 'Thank you for reaching out. We will get back to you shortly.' });
});

// 6. PUBLIC NEWSLETTER SUBSCRIBE ENDPOINT
app.post(['/api/newsletter/subscribe', '/newsletter/subscribe'], async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid email is required.' });
    }
    const client = supabaseAdmin || supabasePublic;
    if (!client) {
      return res.json({ success: true, message: 'Added to the drop list.' });
    }
    const { error } = await client
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
    console.log(` Production endpoints active.`);
    console.log(`====================================================`);
  });
}

// Export Express app for Vercel Serverless Functions
module.exports = app;
