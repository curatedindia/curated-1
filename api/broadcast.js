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
      return sendJson(res, 405, { success: false, error: 'Method not allowed. Use POST.' });
    }

    const body = await getRequestBody(req);
    const { adminEmail, subject, message } = body || {};

    // 1. Verify admin authorization
    if (!adminEmail || adminEmail.trim().toLowerCase() !== 'hello.curatedindia@gmail.com') {
      return sendJson(res, 403, {
        success: false,
        error: 'Unauthorized: Only hello.curatedindia@gmail.com can broadcast drop alerts.'
      });
    }

    if (!subject || !subject.trim()) {
      return sendJson(res, 400, {
        success: false,
        error: 'Subject line is required.'
      });
    }

    if (!message || !message.trim()) {
      return sendJson(res, 400, {
        success: false,
        error: 'Message content is required.'
      });
    }

    // 2. Fetch all emails from newsletter_subscribers using Supabase Service Role Key
    const supabaseUrl = process.env.SUPABASE_URL || 'https://mfznxaembyaqxskltnye.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return sendJson(res, 500, {
        success: false,
        error: 'SUPABASE_SERVICE_ROLE_KEY is not configured in Vercel Environment Variables.'
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: subscribers, error: fetchError } = await supabaseAdmin
      .from('newsletter_subscribers')
      .select('email');

    if (fetchError) {
      console.error('[Broadcast] Error querying newsletter_subscribers:', fetchError);
      return sendJson(res, 500, {
        success: false,
        error: `Failed to fetch subscriber list: ${fetchError.message}`
      });
    }

    if (!subscribers || subscribers.length === 0) {
      return sendJson(res, 200, {
        success: true,
        count: 0,
        message: 'No subscribers found on the drop list.'
      });
    }

    const recipientEmails = subscribers
      .map((s) => s.email && s.email.trim())
      .filter((em) => em && em.includes('@'));

    if (recipientEmails.length === 0) {
      return sendJson(res, 200, {
        success: true,
        count: 0,
        message: 'No valid subscriber email addresses found.'
      });
    }

    // 3. Configure Nodemailer with hello.curatedindia@gmail.com and EMAIL_APP_PASSWORD
    const emailAppPassword = process.env.EMAIL_APP_PASSWORD;
    if (!emailAppPassword) {
      return sendJson(res, 500, {
        success: false,
        error: 'EMAIL_APP_PASSWORD is not configured in Vercel Environment Variables.'
      });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'hello.curatedindia@gmail.com',
        pass: emailAppPassword.replace(/\s+/g, '')
      }
    });

    // 4. Send email with subject & message, BCC to protect privacy
    const mailOptions = {
      from: '"CURATED DROP ALERTS" <hello.curatedindia@gmail.com>',
      to: 'hello.curatedindia@gmail.com',
      bcc: recipientEmails,
      subject: subject.trim(),
      text: message.trim(),
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px 20px; background-color: #0B0B0C; color: #FFFFFF; border-radius: 8px;">
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #27272A;">
            <h1 style="font-size: 22px; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase; margin: 0; color: #FFFFFF;">CURATED</h1>
            <p style="font-size: 11px; color: #A1A1AA; letter-spacing: 0.08em; text-transform: uppercase; margin: 6px 0 0;">Archival Streetwear • Drop Alert</p>
          </div>
          <div style="padding: 28px 0; font-size: 15px; line-height: 1.7; color: #E4E4E7; white-space: pre-wrap;">${message.trim()}</div>
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #27272A; font-size: 11px; color: #71717A;">
            <p style="margin: 0;">You received this private notification because you joined the Curated India drop alert list.</p>
            <p style="margin: 4px 0 0;">Curated India • Authentic 1-of-1 Streetwear</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    console.log(`[Broadcast] Successfully sent drop alert "${subject}" to ${recipientEmails.length} subscribers.`);

    return sendJson(res, 200, {
      success: true,
      count: recipientEmails.length,
      message: `Sent to ${recipientEmails.length} subscribers`
    });

  } catch (err) {
    console.error('[Broadcast] Internal error during broadcast:', err);
    return sendJson(res, 500, {
      success: false,
      error: err.message || 'Failed to send broadcast alert.'
    });
  }
};
