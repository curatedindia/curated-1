const nodemailer = require('nodemailer');
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

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = async function handler(req, res) {
  try {
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

    const body = await getRequestBody(req);
    const { name, email, mobile, order_number, message } = body || {};

    if (!name || typeof name !== 'string' || !name.trim() || !message || typeof message !== 'string' || !message.trim()) {
      return sendJson(res, 400, { success: false, message: 'Name and message are required.' });
    }

    const trimmedName = name.trim();
    const trimmedEmail = (email && typeof email === 'string') ? email.trim() : null;
    const trimmedMobile = (mobile && typeof mobile === 'string') ? mobile.trim() : null;
    const trimmedOrderNumber = (order_number && typeof order_number === 'string') ? order_number.trim() : null;
    const trimmedMessage = message.trim();

    // 1. Save inquiry to Supabase
    const supabaseUrl = process.env.SUPABASE_URL || 'https://mfznxaembyaqxskltnye.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_HUnzC5IyK0POGKq_bllJ9g_f4aiAJSq';
    
    const client = serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey)
      : createClient(supabaseUrl, anonKey);

    if (client) {
      try {
        const { error: dbError } = await client
          .from('inquiries')
          .insert([{
            name: trimmedName,
            email: trimmedEmail,
            mobile: trimmedMobile,
            order_number: trimmedOrderNumber,
            message: trimmedMessage,
            status: 'unread'
          }]);

        if (dbError) {
          console.error('[api/contact] Supabase save error:', dbError);
        }
      } catch (dbErr) {
        console.error('[api/contact] Unexpected database error:', dbErr);
      }
    }

    // 2. Dispatch email notification via Nodemailer with 5-second timeout safeguard
    const rawEmailPassword = process.env.EMAIL_APP_PASSWORD;
    if (rawEmailPassword) {
      const emailAppPassword = rawEmailPassword.replace(/\s+/g, '');
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

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'hello.curatedindia@gmail.com',
          pass: emailAppPassword
        }
      });

      const sendMailPromise = transporter.sendMail({
        from: '"CURATED Support" <hello.curatedindia@gmail.com>',
        to: 'hello.curatedindia@gmail.com',
        replyTo: trimmedEmail || undefined,
        subject,
        text,
        html
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Email dispatch timed out after 5000ms')), 5000)
      );

      try {
        await Promise.race([sendMailPromise, timeoutPromise]);
      } catch (mailErr) {
        console.warn('[api/contact] Email notification error/timeout (non-blocking):', mailErr.message);
      }
    } else {
      console.warn('[api/contact] EMAIL_APP_PASSWORD is missing. Skipping email notification.');
    }

    return sendJson(res, 200, {
      success: true,
      message: 'Thank you for reaching out. Your message has been received.'
    });

  } catch (err) {
    console.error('[api/contact] Handler error:', err);
    return sendJson(res, 500, {
      success: false,
      message: 'Server error processing contact form.'
    });
  }
};
