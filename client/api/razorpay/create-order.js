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
    const { amount, currency = 'INR', receipt, notes, items, shipping, delivery_charge, subtotal } = body || {};

    let clientAmount = parseFloat(amount);
    let verifiedTotal = clientAmount;

    // Server-side validation of item prices and custom delivery charges
    if (Array.isArray(items) && items.length > 0) {
      const calculatedSubtotal = items.reduce((sum, it) => {
        const itemPrice = Number(it.unit_price || it.selling_price || it.price || 0);
        const qty = Number(it.quantity || 1);
        return sum + (itemPrice * qty);
      }, 0);

      // Check if custom delivery charge is specified per-item or in request
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

      // Price protection: prevent paying less than item subtotal
      if (calculatedSubtotal > 0 && clientAmount < calculatedSubtotal) {
        console.warn(`[Security Alert] Client amount (₹${clientAmount}) lower than item subtotal (₹${calculatedSubtotal}). Enforcing expected total.`);
        verifiedTotal = expectedTotal > 0 ? expectedTotal : calculatedSubtotal;
      } else if (clientAmount > 0) {
        // Respect the exact client amount (product price + any calculated delivery)
        verifiedTotal = clientAmount;
      } else if (expectedTotal > 0) {
        verifiedTotal = expectedTotal;
      }
    }

    if (!verifiedTotal || verifiedTotal <= 0) {
      return sendJson(res, 400, { success: false, message: 'Invalid order amount' });
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

