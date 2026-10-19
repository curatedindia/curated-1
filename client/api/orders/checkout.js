const { createClient } = require('@supabase/supabase-js');

function sendJson(res, statusCode, data) {
  res.setHeader('Content-Type', 'application/json');
  if (typeof res.status === 'function') {
    res.status(statusCode);
    if (typeof res.json === 'function') {
      return res.json(data);
    }
  }
  res.statusCode = statusCode;
  return res.end(JSON.stringify(data));
}

async function getRequestBody(req) {
  if (req.body) {
    if (typeof req.body === 'string') {
      try { return JSON.parse(req.body); } catch (e) { return {}; }
    }
    return req.body;
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

module.exports = async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { success: false, message: 'Method not allowed. Use POST.' });
  }

  try {
    const body = await getRequestBody(req);
    const { customer, items, no_return_ack } = body || {};

    if (!no_return_ack) {
      return sendJson(res, 400, {
        success: false,
        message: 'CK-05 Rule: You must acknowledge the No Return Policy before proceeding to payment.'
      });
    }

    if (!customer || !customer.mobile || customer.mobile.length !== 10) {
      return sendJson(res, 400, {
        success: false,
        message: 'Valid 10-digit Indian mobile number is required.'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return sendJson(res, 400, {
        success: false,
        message: 'Cart cannot be empty.'
      });
    }

    // Subtotal & Shipping calculation
    const subtotal = items.reduce((sum, it) => sum + (Number(it.unit_price) || 0) * (Number(it.quantity) || 1), 0);
    const shipping = subtotal >= 1499 ? 0 : 99;
    const total = subtotal + shipping;

    const timestamp = Date.now();
    const orderNumber = `CUR-${Math.floor(1000 + Math.random() * 9000)}`;
    const orderId = `ord-${timestamp}`;
    const holdId = `hold-${timestamp}`;
    const expiresAt = new Date(timestamp + 10 * 60 * 1000).toISOString();

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
      hold_id: holdId,
      notes: 'Checkout initiated, waiting for payment confirmation.',
      created_at: new Date().toISOString(),
      voided_at: null,
      void_reason: null
    };

    // Optionally sync into Supabase
    const supabaseUrl = process.env.SUPABASE_URL || 'https://mfznxaembyaqxskltnye.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_HUnzC5IyK0POGKq_bllJ9g_f4aiAJSq';

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.from('orders').insert([{
          order_number: order.order_number,
          customer_name: order.customer?.name || 'Customer',
          customer_email: order.customer?.email || 'customer@example.com',
          total_amount: order.total,
          status: 'PENDING',
          payment_status: 'PENDING',
          items: order.items,
          shipping_address: order.customer,
          created_at: order.created_at
        }]);
      } catch (dbErr) {
        console.warn('[Checkout Serverless Supabase Sync Warning]:', dbErr.message);
      }
    }

    return sendJson(res, 200, {
      success: true,
      order,
      hold_id: holdId,
      expires_at: expiresAt
    });
  } catch (err) {
    console.error('[Checkout Serverless Error]:', err);
    return sendJson(res, 500, {
      success: false,
      message: err.message || 'Internal server error initiating checkout.'
    });
  }
};
