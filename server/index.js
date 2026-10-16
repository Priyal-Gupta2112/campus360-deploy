import express from 'express';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
const app = express();
const port = Number(process.env.PORT || 3001);
app.use(express.json({ limit: '1mb' }));


const MINIMOTH_API_URL = 'https://api.minimoth.dev';
async function minimothRequest(path, body) {
  const apiKey = process.env.MINIMOTH_API_KEY;
  if (!apiKey) { const err = new Error('MiniMoth API key is missing. Add MINIMOTH_API_KEY to the root .env file.'); err.status = 503; throw err; }
  const response = await fetch(`${MINIMOTH_API_URL}${path}`, {
    method: 'POST', headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { console.error('MiniMoth API error:', response.status, data); const err = new Error(data.message || data.error || `MiniMoth returned HTTP ${response.status}`); err.status = response.status; throw err; }
  return data;
}
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const phone = String(req.body?.phone || '').trim();
    if (!/^(?:\+91)?[6-9]\d{9}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid Indian mobile number.' });
    const normalizedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;
    const data = await minimothRequest('/v1/otp/send', { phone: normalizedPhone });
    return res.json({ success: true, message: 'OTP request accepted by MiniMoth.', otp_id: data.otp_id, expires_at: data.expires_at });
  } catch (error) { return res.status(error.status || 500).json({ error: error.message || 'Could not send OTP.' }); }
});
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const phone = String(req.body?.phone || '').trim();
    const code = String(req.body?.code || req.body?.otp || '').trim();
    if (!/^(?:\+91)?[6-9]\d{9}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid Indian mobile number.' });
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Enter the six-digit OTP.' });
    const normalizedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;
    const data = await minimothRequest('/v1/otp/verify', { phone: normalizedPhone, code });
    return res.json({ success: true, access_token: data.access_token, refresh_token: data.refresh_token, expires_at: data.expires_at, identity_id: data.identity_id });
  } catch (error) { return res.status(error.status || 500).json({ error: error.message || 'Could not verify OTP.' }); }
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null;

app.get('/api/health', (_req, res) => res.json({
  status: 'ok',
  message: 'Campus360 backend is running',
  databaseConfigured: Boolean(supabase),
}));

// Safe status endpoint for the prototype; never return secrets to the browser.
app.get('/api/events', async (_req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase is not configured yet. See README.md.' });
  const { data, error } = await supabase.from('campus_events').select('*').order('starts_at', { ascending: true }).limit(100);
  if (error) return res.status(500).json({ error: 'Could not load campus events.' });
  res.json({ data });
});

app.listen(port, () => console.log(`Campus360 backend running at http://localhost:${port}`));
