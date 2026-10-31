import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

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
    } = body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return sendJson(res, 400, { success: false, message: 'Missing Razorpay verification parameters' });
    }

    // Verify HMAC-SHA256 signature
    const hmac = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generated_signature = hmac.digest('hex');

    if (generated_signature !== razorpay_signature) {
      console.error('[Razorpay Signature Mismatch Serverless]:', { generated: generated_signature, received: razorpay_signature });
      return sendJson(res, 400, { success: false, message: 'Payment verification failed: Invalid signature' });
    }

    const finalOrderNumber = order_number || `CUR-${Math.floor(1000 + Math.random() * 9000)}`;
    const finalTotal = Number(total_amount || total || 0);

    const orderRecord = {
      order_number: finalOrderNumber,
      customer_name: customer_name || customer?.name || 'Customer',
      customer_email: customer_email || customer?.email || 'customer@example.com',
      total_amount: finalTotal,
      status: 'PENDING',
      payment_status: 'PAID',
      items: items || [],
      shipping_address: {
        ...(shipping_address || customer || {}),
        payment_mode: 'RAZORPAY',
        razorpay_order_id,
        razorpay_payment_id
      },
      created_at: new Date().toISOString()
    };

    const supabaseUrl = process.env.SUPABASE_URL || 'https://mfznxaembyaqxskltnye.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_HUnzC5IyK0POGKq_bllJ9g_f4aiAJSq';

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.from('orders').upsert([orderRecord], { onConflict: 'order_number' });
      } catch (dbErr) {
        console.warn('[Supabase Insert Error]:', dbErr.message);
      }
    }

    return sendJson(res, 200, {
      success: true,
      verified: true,
      message: 'Payment verified successfully',
      order: orderRecord
    });
  } catch (err) {
    console.error('[Razorpay Verify Error]:', err);
    return sendJson(res, 500, { success: false, message: err.message || 'Error verifying Razorpay payment' });
  }
}

