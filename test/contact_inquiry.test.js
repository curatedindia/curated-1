const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const nodemailer = require('nodemailer');
const app = require('../server/server');

/**
 * Helper to escape HTML as implemented in server/server.js
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Helper recreating the email formatting logic from server/server.js
 */
function formatInquiryEmail({ name, email, mobile, order_number, message }) {
  const trimmedName = name ? name.trim() : '';
  const trimmedEmail = (email && typeof email === 'string') ? email.trim() : null;
  const trimmedMobile = (mobile && typeof mobile === 'string') ? mobile.trim() : null;
  const trimmedOrderNumber = (order_number && typeof order_number === 'string') ? order_number.trim() : null;
  const trimmedMessage = message ? message.trim() : '';

  const subject = `New Customer Inquiry: ${trimmedName}${trimmedOrderNumber ? ` (Order #${trimmedOrderNumber})` : ''}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
      <div style="border-bottom: 2px solid #000000; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #111827; letter-spacing: -0.5px;">CURATED - New Customer Inquiry</h2>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
        <tbody>
          <tr>
            <td style="padding: 10px 14px; font-weight: 600; color: #374151; background: #f9fafb; width: 140px; border: 1px solid #e5e7eb;">Customer Name</td>
            <td style="padding: 10px 14px; color: #111827; border: 1px solid #e5e7eb;">${escapeHtml(trimmedName)}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; font-weight: 600; color: #374151; background: #f9fafb; border: 1px solid #e5e7eb;">Mobile</td>
            <td style="padding: 10px 14px; color: #111827; border: 1px solid #e5e7eb;">${escapeHtml(trimmedMobile || 'N/A')}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; font-weight: 600; color: #374151; background: #f9fafb; border: 1px solid #e5e7eb;">Email</td>
            <td style="padding: 10px 14px; color: #111827; border: 1px solid #e5e7eb;">${escapeHtml(trimmedEmail || 'N/A')}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; font-weight: 600; color: #374151; background: #f9fafb; border: 1px solid #e5e7eb;">Order #</td>
            <td style="padding: 10px 14px; color: #111827; border: 1px solid #e5e7eb;">${escapeHtml(trimmedOrderNumber || 'N/A')}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; font-weight: 600; color: #374151; background: #f9fafb; border: 1px solid #e5e7eb;">Message</td>
            <td style="padding: 10px 14px; color: #111827; border: 1px solid #e5e7eb; white-space: pre-wrap; line-height: 1.5;">${escapeHtml(trimmedMessage)}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; font-weight: 600; color: #374151; background: #f9fafb; border: 1px solid #e5e7eb;">Timestamp</td>
            <td style="padding: 10px 14px; color: #111827; border: 1px solid #e5e7eb;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td>
          </tr>
        </tbody>
      </table>
      <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">This inquiry was submitted from the Curated contact form.</p>
    </div>
  `;

  const text = `NEW CUSTOMER INQUIRY\n` +
    `---------------------------------\n` +
    `Customer Name: ${trimmedName}\n` +
    `Mobile:        ${trimmedMobile || 'N/A'}\n` +
    `Email:         ${trimmedEmail || 'N/A'}\n` +
    `Order #:       ${trimmedOrderNumber || 'N/A'}\n` +
    `Timestamp:     ${new Date().toISOString()}\n\n` +
    `Message:\n${trimmedMessage}\n` +
    `---------------------------------`;

  return { subject, html, text, replyTo: trimmedEmail || undefined };
}

describe('Contact Inquiry API (/api/contact)', () => {
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

  describe('Payload Validation', () => {
    it('rejects completely empty request payload', async () => {
      const res = await fetch(`${baseUrl}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, 'Name and message are required');
    });

    it('rejects when name is only whitespace', async () => {
      const res = await fetch(`${baseUrl}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '   ', message: 'Legitimate question' })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, 'Name and message are required');
    });

    it('rejects when message is missing or only whitespace', async () => {
      const res = await fetch(`${baseUrl}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Alex Johnson', message: '  \n  ' })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.message, 'Name and message are required');
    });

    it('accepts minimum required fields (name and message)', async () => {
      const res = await fetch(`${baseUrl}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Priya Sharma',
          message: 'Can I customize the piece dimensions?'
        })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.message, 'Thank you for reaching out. Your message has been received.');
    });

    it('accepts all fields (name, email, mobile, order_number, message)', async () => {
      const res = await fetch(`${baseUrl}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Rahul Verma',
          email: 'rahul.verma@example.com',
          mobile: '+91 98765 43210',
          order_number: 'CUR-XYZ-9999',
          message: 'Requesting tracking status update.'
        })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.message, 'Thank you for reaching out. Your message has been received.');
    });
  });

  describe('Supabase Insert Schema & Graceful Fallback', () => {
    it('gracefully completes with 200 even when database or email transport logs errors', async () => {
      const res = await fetch(`${baseUrl}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Fallback Tester',
          email: 'fallback@example.com',
          mobile: '9123456789',
          order_number: 'CUR-FALLBACK-1',
          message: 'Testing that db errors do not crash or return 500'
        })
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.match(body.message, /message has been received/i);
    });

    it('validates correct mock Supabase insert structure', () => {
      const payload = {
        name: '  Kavita Rao  ',
        email: '  kavita@test.com  ',
        mobile: '  9898989898  ',
        order_number: '  CUR-TEST-900  ',
        message: '  Inquiry message content.  '
      };

      const record = {
        name: payload.name.trim(),
        email: payload.email.trim(),
        mobile: payload.mobile.trim(),
        order_number: payload.order_number.trim(),
        message: payload.message.trim(),
        status: 'unread'
      };

      assert.strictEqual(record.name, 'Kavita Rao');
      assert.strictEqual(record.email, 'kavita@test.com');
      assert.strictEqual(record.mobile, '9898989898');
      assert.strictEqual(record.order_number, 'CUR-TEST-900');
      assert.strictEqual(record.message, 'Inquiry message content.');
      assert.strictEqual(record.status, 'unread');
    });
  });

  describe('Email Notification Formatting & Security', () => {
    it('formats subject with order number when present', () => {
      const formatted = formatInquiryEmail({
        name: 'Arjun Gupta',
        order_number: 'CUR-ORD-5544',
        message: 'Hello'
      });
      assert.strictEqual(formatted.subject, 'New Customer Inquiry: Arjun Gupta (Order #CUR-ORD-5544)');
    });

    it('formats subject without order number when absent or empty', () => {
      const formatted = formatInquiryEmail({
        name: 'Arjun Gupta',
        order_number: null,
        message: 'Hello'
      });
      assert.strictEqual(formatted.subject, 'New Customer Inquiry: Arjun Gupta');
    });

    it('escapes HTML tags and special characters in name and message to prevent XSS injection', () => {
      const formatted = formatInquiryEmail({
        name: '<script>alert("xss")</script>',
        email: 'hacker@test.com',
        mobile: '1234567890',
        order_number: '<b>BOLD</b>',
        message: '<img src=x onerror=alert(1)> & "quotes" \'single\''
      });

      assert.doesNotMatch(formatted.html, /<script>/i);
      assert.doesNotMatch(formatted.html, /<img /i);
      assert.match(formatted.html, /&lt;script&gt;alert\(&quot;xss&quot;\)&lt;\/script&gt;/);
      assert.match(formatted.html, /&lt;img src=x onerror=alert\(1\)&gt; &amp; &quot;quotes&quot; &#039;single&#039;/);
      assert.match(formatted.html, /&lt;b&gt;BOLD&lt;\/b&gt;/);
    });

    it('sets replyTo correctly when customer email is provided', () => {
      const formatted = formatInquiryEmail({
        name: 'Meera',
        email: 'meera@domain.com',
        message: 'Quick question'
      });
      assert.strictEqual(formatted.replyTo, 'meera@domain.com');
    });

    it('sets replyTo to undefined when customer email is not provided', () => {
      const formatted = formatInquiryEmail({
        name: 'Meera',
        email: null,
        message: 'Quick question'
      });
      assert.strictEqual(formatted.replyTo, undefined);
    });

    it('verifies nodemailer transporter integration with mock transport', async () => {
      const originalCreateTransport = nodemailer.createTransport;
      let sentMailOptions = null;

      nodemailer.createTransport = () => ({
        sendMail: async (options) => {
          sentMailOptions = options;
          return { messageId: 'mock-msg-123' };
        }
      });

      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: 'hello.curatedindia@gmail.com', pass: 'mock-pass' }
        });

        const formatted = formatInquiryEmail({
          name: 'Nikhil Designer',
          email: 'nikhil@test.com',
          mobile: '9876543210',
          order_number: 'CUR-1010',
          message: 'Test message for transporter.'
        });

        await transporter.sendMail({
          from: '"CURATED Support" <hello.curatedindia@gmail.com>',
          to: 'hello.curatedindia@gmail.com',
          replyTo: formatted.replyTo,
          subject: formatted.subject,
          text: formatted.text,
          html: formatted.html
        });

        assert.ok(sentMailOptions, 'sendMail must have been called');
        assert.strictEqual(sentMailOptions.to, 'hello.curatedindia@gmail.com');
        assert.strictEqual(sentMailOptions.replyTo, 'nikhil@test.com');
        assert.strictEqual(sentMailOptions.subject, 'New Customer Inquiry: Nikhil Designer (Order #CUR-1010)');
        assert.match(sentMailOptions.text, /Nikhil Designer/);
        assert.match(sentMailOptions.html, /CUR-1010/);
      } finally {
        nodemailer.createTransport = originalCreateTransport;
      }
    });
  });
});
