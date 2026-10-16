// api/index.js

const MINIMOTH_API_URL = 'https://api.minimoth.dev';

async function minimothRequest(path, body) {
  const apiKey = process.env.MINIMOTH_API_KEY;
  if (!apiKey) {
    const err = new Error('MiniMoth API key missing on Vercel.');
    err.status = 503;
    throw err;
  }

  const response = await fetch(`${MINIMOTH_API_URL}${path}`, {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    data = { raw: text };
  }

  if (!response.ok) {
    const err = new Error(data.message || data.error || `MiniMoth returned HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return data;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url, method } = req;

  // Health endpoint
  if (url.includes('/api/health')) {
    return res.status(200).json({ status: 'ok', message: 'Backend is running on Vercel' });
  }

  // Send OTP
  if (url.includes('/api/auth/send-otp') && method === 'POST') {
    try {
      const phone = String(req.body?.phone || '').trim();
      if (!/^(?:\+91)?[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({ error: 'Enter a valid Indian mobile number.' });
      }
      const normalizedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;
      const data = await minimothRequest('/v1/otp/send', { phone: normalizedPhone });
      return res.status(200).json({
        success: true,
        message: 'OTP request accepted by MiniMoth.',
        otp_id: data.otp_id,
        expires_at: data.expires_at,
      });
    } catch (error) {
      return res.status(error.status || 500).json({ error: error.message || 'Could not send OTP.' });
    }
  }

  // Verify OTP
  if (url.includes('/api/auth/verify-otp') && method === 'POST') {
    try {
      const phone = String(req.body?.phone || '').trim();
      const code = String(req.body?.code || req.body?.otp || '').trim();
      if (!/^(?:\+91)?[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({ error: 'Enter a valid Indian mobile number.' });
      }
      if (!/^\d{6}$/.test(code)) {
        return res.status(400).json({ error: 'Enter the six-digit OTP.' });
      }
      const normalizedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;
      const data = await minimothRequest('/v1/otp/verify', { phone: normalizedPhone, code });
      return res.status(200).json({
        success: true,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        identity_id: data.identity_id,
      });
    } catch (error) {
      return res.status(error.status || 500).json({ error: error.message || 'Could not verify OTP.' });
    }
  }

  return res.status(404).json({ error: 'Route not found on Vercel handler' });
}