const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const app = require('../server/server');

describe('Inquiries & Contact Endpoints', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('rejects contact submission when name is missing', async () => {
    const res = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello from test' })
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.message, 'Name and message are required');
  });

  it('rejects contact submission when message is missing', async () => {
    const res = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Tanmay' })
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.message, 'Name and message are required');
  });

  it('accepts valid contact submission and gracefully handles missing EMAIL_APP_PASSWORD', async () => {
    const res = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Customer',
        email: 'customer@example.com',
        mobile: '9876543210',
        order_number: 'CUR-TEST-1234',
        message: 'Where is my order?'
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.message, 'Thank you for reaching out. Your message has been received.');
  });

  it('rejects unauthenticated GET /api/inquiries', async () => {
    const res = await fetch(`${baseUrl}/api/inquiries`);
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.message, 'Admin authentication required.');
  });

  it('rejects unauthenticated PATCH /api/inquiries/:id', async () => {
    const res = await fetch(`${baseUrl}/api/inquiries/some-id`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' })
    });
    assert.strictEqual(res.status, 401);
  });

  it('rejects unauthenticated DELETE /api/inquiries/:id', async () => {
    const res = await fetch(`${baseUrl}/api/inquiries/some-id`, {
      method: 'DELETE'
    });
    assert.strictEqual(res.status, 401);
  });
});
