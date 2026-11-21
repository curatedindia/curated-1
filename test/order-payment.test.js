const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

/**
 * Razorpay HMAC SHA256 Signature Verification logic as implemented in server/server.js
 */
function verifyRazorpaySignature(orderId, paymentId, signature, secret) {
  if (!orderId || !paymentId || !signature || !secret) {
    return false;
  }
  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(`${orderId}|${paymentId}`);
    const generatedSignature = hmac.digest('hex');

    const genBuf = Buffer.from(generatedSignature, 'utf8');
    const recBuf = Buffer.from(signature, 'utf8');

    if (genBuf.length !== recBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(genBuf, recBuf);
  } catch {
    return false;
  }
}

/**
 * Collision-resistant Order Number Generator as implemented in server/server.js
 */
let orderSeqCounter = 0;
function generateOrderNumber() {
  const timePart = Date.now().toString(36).toUpperCase();
  orderSeqCounter = (orderSeqCounter + 1) % 1000000;
  const seqPart = orderSeqCounter.toString(36).toUpperCase().padStart(4, '0');
  const randPart = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `CUR-${timePart}-${seqPart}${randPart}`;
}

describe('Razorpay HMAC SHA256 Signature Verification', () => {
  const secret = 'curated_test_secret_key_rzp_12345';
  const orderId = 'order_test_987654321';
  const paymentId = 'pay_test_123456789';

  it('successfully verifies a valid Razorpay HMAC SHA256 signature', () => {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const result = verifyRazorpaySignature(orderId, paymentId, expectedSignature, secret);
    assert.strictEqual(result, true, 'Valid signature must verify successfully');
  });

  it('rejects an altered signature', () => {
    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    const corruptedSignature = validSignature.slice(0, -1) + (validSignature.slice(-1) === 'a' ? 'b' : 'a');

    const result = verifyRazorpaySignature(orderId, paymentId, corruptedSignature, secret);
    assert.strictEqual(result, false, 'Altered signature must be rejected');
  });

  it('rejects when order_id is tampered', () => {
    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const result = verifyRazorpaySignature('order_test_tampered', paymentId, validSignature, secret);
    assert.strictEqual(result, false, 'Tampered order ID must fail verification');
  });

  it('rejects when payment_id is tampered', () => {
    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const result = verifyRazorpaySignature(orderId, 'pay_test_tampered', validSignature, secret);
    assert.strictEqual(result, false, 'Tampered payment ID must fail verification');
  });

  it('rejects signatures with length mismatch safely without throwing', () => {
    const result = verifyRazorpaySignature(orderId, paymentId, 'short_signature', secret);
    assert.strictEqual(result, false, 'Short signature must safely return false');
  });

  it('rejects missing or empty parameters gracefully', () => {
    assert.strictEqual(verifyRazorpaySignature(null, paymentId, 'sig', secret), false);
    assert.strictEqual(verifyRazorpaySignature(orderId, null, 'sig', secret), false);
    assert.strictEqual(verifyRazorpaySignature(orderId, paymentId, '', secret), false);
    assert.strictEqual(verifyRazorpaySignature(orderId, paymentId, 'sig', ''), false);
  });
});

describe('Collision-Resistant Order ID Formatting', () => {
  it('generates order IDs matching the CUR pattern', () => {
    const orderNumber = generateOrderNumber();
    const pattern = /^CUR-[0-9A-Z]+-[0-9A-Z]{8}$/;
    assert.match(orderNumber, pattern, `Order number ${orderNumber} must match CUR pattern`);
  });

  it('generates 2,000 unique collision-resistant order IDs in rapid succession', () => {
    const count = 2000;
    const ids = new Set();

    for (let i = 0; i < count; i++) {
      const id = generateOrderNumber();
      ids.add(id);
    }

    assert.strictEqual(ids.size, count, `All ${count} generated order IDs must be strictly unique`);
  });
});
