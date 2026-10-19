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

const SHARED_SECRET_KEY = process.env.ADMIN_PHONE_SECRET_KEY || 'ADMIN_PHONE_SECRET_KEY_123';

module.exports = async function handler(req, res) {
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
    return sendJson(res, 405, { error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = await getRequestBody(req);
    const { secret, utr, amount } = body || {};

    if (secret !== SHARED_SECRET_KEY) {
      return sendJson(res, 401, { error: 'Unauthorized' });
    }

    if (!utr || !amount) {
      return sendJson(res, 400, { error: 'Missing utr or amount' });
    }

    const cleanUtr = String(utr).trim();
    const parsedAmount = parseFloat(amount);

    console.log(`[BANK WEBHOOK] UTR: ${cleanUtr} | Amount: ₹${parsedAmount}`);

    const supabaseUrl = process.env.SUPABASE_URL || 'https://mfznxaembyaqxskltnye.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_HUnzC5IyK0POGKq_bllJ9g_f4aiAJSq';

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase
        .from('orders')
        .update({ status: 'CONFIRMED', payment_status: 'PAID' })
        .eq('total_amount', parsedAmount)
        .eq('payment_status', 'PENDING');
    }

    return sendJson(res, 200, { status: 'SUCCESS' });
  } catch (err) {
    console.error('[Bank Webhook Error]:', err);
    return sendJson(res, 500, { error: err.message });
  }
};
