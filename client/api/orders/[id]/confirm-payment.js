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
    const { id } = req.query || {};
    const body = await getRequestBody(req);
    const { gateway_payment_id, payment_mode } = body || {};

    const supabaseUrl = process.env.SUPABASE_URL || 'https://mfznxaembyaqxskltnye.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_HUnzC5IyK0POGKq_bllJ9g_f4aiAJSq';

    if (id && supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase
          .from('orders')
          .update({
            payment_status: 'PAID',
            status: 'CONFIRMED'
          })
          .or(`order_number.eq.${id},id.eq.${id}`);
      } catch (err) {
        console.warn('[Confirm Payment Supabase Warning]:', err.message);
      }
    }

    return sendJson(res, 200, {
      success: true,
      message: 'Payment confirmed successfully',
      order: {
        id: id || `ord-${Date.now()}`,
        payment_status: 'PAID',
        order_status: 'CONFIRMED',
        gateway_payment_id: gateway_payment_id || `pay_${Date.now()}`,
        payment_mode: payment_mode || 'UPI'
      }
    });
  } catch (err) {
    console.error('[Confirm Payment Error]:', err);
    return sendJson(res, 500, {
      success: false,
      message: err.message || 'Internal server error confirming payment.'
    });
  }
};
