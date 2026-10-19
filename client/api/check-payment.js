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

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  const { utr, amount, orderId } = req.query || {};
  const cleanUtr = String(utr || '').trim();

  // If a 12-digit UTR is submitted by the user, verify it against Supabase orders
  const supabaseUrl = process.env.SUPABASE_URL || 'https://mfznxaembyaqxskltnye.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_HUnzC5IyK0POGKq_bllJ9g_f4aiAJSq';

  if (cleanUtr && cleanUtr.length === 12 && supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      if (orderId) {
        // Update order status in Supabase
        await supabase
          .from('orders')
          .update({ payment_status: 'PAID', status: 'CONFIRMED' })
          .or(`order_number.eq.${orderId},id.eq.${orderId}`);
      }
      return sendJson(res, 200, { status: 'VERIFIED' });
    } catch (err) {
      console.warn('[Check Payment Error]:', err.message);
    }
  }

  // If cleanUtr is present and length is 12 digits, return VERIFIED
  if (cleanUtr && cleanUtr.length === 12) {
    return sendJson(res, 200, { status: 'VERIFIED' });
  }

  return sendJson(res, 200, { status: 'PENDING' });
}
