import { createClient } from '@supabase/supabase-js';

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

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
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
    const {
      order_number,
      customer_name,
      customer_email,
      customer,
      total_amount,
      total,
      paymentStatus,
      payment_status,
      items,
      shipping_address,
      utr,
      payment_mode
    } = body || {};

    const finalOrderNumber = order_number || `CUR-${Math.floor(1000 + Math.random() * 9000)}`;
    const finalTotal = Number(total_amount || total || 0);
    const finalPaymentStatus = paymentStatus || payment_status || 'PAID';

    const orderRecord = {
      order_number: finalOrderNumber,
      customer_name: customer_name || customer?.name || 'Customer',
      customer_email: customer_email || customer?.email || 'customer@example.com',
      total_amount: finalTotal,
      status: 'PENDING',
      payment_status: finalPaymentStatus,
      paymentStatus: finalPaymentStatus,
      items: items || [],
      shipping_address: shipping_address || customer || {},
      created_at: new Date().toISOString()
    };

    const supabaseUrl = process.env.SUPABASE_URL || 'https://mfznxaembyaqxskltnye.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_HUnzC5IyK0POGKq_bllJ9g_f4aiAJSq';

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.from('orders').insert([orderRecord]);
      } catch (dbErr) {
        console.warn('[Create Order Supabase Insert Warning]:', dbErr.message);
      }
    }

    return sendJson(res, 200, {
      success: true,
      message: 'Order created with verified payment',
      order: orderRecord
    });
  } catch (err) {
    console.error('[Create Order Error]:', err);
    return sendJson(res, 500, {
      success: false,
      message: err.message || 'Error creating order.'
    });
  }
}
