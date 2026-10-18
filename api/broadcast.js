const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        // keep as is
      }
    }
    const { adminEmail, subject, message } = body || {};

    // 1. Verify admin authorization
    if (!adminEmail || adminEmail.trim().toLowerCase() !== 'hello.curatedindia@gmail.com') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Only hello.curatedindia@gmail.com can broadcast drop alerts.'
      });
    }

    if (!subject || !subject.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Subject line is required.'
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message content is required.'
      });
    }

    // 2. Fetch all emails from newsletter_subscribers using Supabase Service Role Key
    const supabaseUrl = process.env.SUPABASE_URL || 'https://mfznxaembyaqxskltnye.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return res.status(500).json({
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
      return res.status(500).json({
        success: false,
        error: `Failed to fetch subscriber list: ${fetchError.message}`
      });
    }

    if (!subscribers || subscribers.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        message: 'No subscribers found on the drop list.'
      });
    }

    const recipientEmails = subscribers
      .map((s) => s.email && s.email.trim())
      .filter((em) => em && em.includes('@'));

    if (recipientEmails.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        message: 'No valid subscriber email addresses found.'
      });
    }

    // 3. Configure Nodemailer with hello.curatedindia@gmail.com and EMAIL_APP_PASSWORD
    const emailAppPassword = process.env.EMAIL_APP_PASSWORD;
    if (!emailAppPassword) {
      return res.status(500).json({
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

    return res.status(200).json({
      success: true,
      count: recipientEmails.length,
      message: `Sent to ${recipientEmails.length} subscribers`
    });

  } catch (err) {
    console.error('[Broadcast] Internal error during broadcast:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to send broadcast alert.'
    });
  }
};
