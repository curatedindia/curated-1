const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TuZkYc8hwiX2q1';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'RfXLp9TCNuZYEPdDsFZpB3R3';

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
    const { amount, currency = 'INR', receipt, notes } = body || {};
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return sendJson(res, 400, { success: false, message: 'Invalid order amount' });
    }

    const amountInPaise = Math.round(parsedAmount * 100);
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
      return sendJson(res, rzpRes.status, {
        success: false,
        message: rzpData.error?.description || 'Failed to create Razorpay order',
        error: rzpData.error
      });
    }

    return sendJson(res, 200, {
      success: true,
      order_id: rzpData.id,
      amount: rzpData.amount,
      currency: rzpData.currency,
      key_id: RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('[Razorpay Order Create Exception]:', err);
    return sendJson(res, 500, { success: false, message: err.message || 'Server error creating Razorpay order' });
  }
}

