import express from 'express';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Load the .env file from the project root, regardless of the shell's working directory.
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: resolve(projectRoot, '.env') });

const app = express();
const port = Number(process.env.PORT || 3001);
app.use(express.json({ limit: '1mb' }));

const MINIMOTH_API_URL = 'https://api.minimoth.dev';

async function minimothRequest(path, body) {
  const apiKey = process.env.MINIMOTH_API_KEY?.trim();
  if (!apiKey) {
    const error = new Error('MiniMoth API key is missing. Add MINIMOTH_API_KEY=mm_live_... to the project-root .env file, then restart the backend.');
    error.status = 503;
    throw error;
  }

  let response;
  try {
    response = await fetch(`${MINIMOTH_API_URL}${path}`, {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    const error = new Error('Could not connect to MiniMoth. Check your internet connection and try again.');
    error.status = 502;
    throw error;
  }

  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }

  if (!response.ok) {
    console.error(`MiniMoth ${path} failed with HTTP ${response.status}:`, data.code || data.error || data.message || 'No provider error details');
    const providerCode = data.code ? ` (${data.code})` : '';
    const message = data.message || data.error || (response.status === 401
      ? 'MiniMoth rejected the API key. Check that it is the current key from the correct MiniMoth project.'
      : `MiniMoth request failed with HTTP ${response.status}${providerCode}.`);
    const error = new Error(message);
    error.status = response.status >= 400 && response.status < 600 ? response.status : 502;
    throw error;
  }

  if (!raw) {
    const error = new Error('MiniMoth returned an empty response. Please try again.');
    error.status = 502;
    throw error;
  }
  return data;
}

function normalizeIndianPhone(value) {
  const phone = String(value || '').trim().replace(/[\s()-]/g, '');
  if (/^[6-9]\d{9}$/.test(phone)) return `+91${phone}`;
  if (/^\+91[6-9]\d{9}$/.test(phone)) return phone;
  return null;
}

app.get('/api/health', (_req, res) => res.json({
  status: 'ok',
  message: 'Campus360 backend is running',
  minimothConfigured: Boolean(process.env.MINIMOTH_API_KEY?.trim()),
  databaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
}));

app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const phone = normalizeIndianPhone(req.body?.phone);
    if (!phone) return res.status(400).json({ error: 'Enter a valid Indian mobile number with 10 digits.' });
    const data = await minimothRequest('/v1/otp/send', { phone });
    return res.status(200).json({
      success: true,
      message: 'OTP sent via WhatsApp or SMS. Check your messages.',
      otp_id: data.otp_id,
      expires_at: data.expires_at,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Could not send OTP.' });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const phone = normalizeIndianPhone(req.body?.phone);
    const code = String(req.body?.code || req.body?.otp || '').trim();
    if (!phone) return res.status(400).json({ error: 'Enter a valid Indian mobile number with 10 digits.' });
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Enter the six-digit OTP you received.' });

    // MiniMoth REST API expects { phone, code } for verification.
    const data = await minimothRequest('/v1/otp/verify', { phone, code });
    return res.status(200).json({
      success: true,
      message: 'Phone number verified successfully.',
      access_token: data.access_token,
      expires_at: data.expires_at,
      identity_id: data.identity_id,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Could not verify OTP.' });
  }
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null;

app.get('/api/events', async (_req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase is not configured yet.' });
  const { data, error } = await supabase.from('campus_events').select('*').order('starts_at', { ascending: true }).limit(100);
  if (error) return res.status(500).json({ error: 'Could not load campus events.' });
  return res.json({ data });
});

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Campus360 backend running at http://localhost:${port}`);
    console.log(`MiniMoth API key loaded: ${Boolean(process.env.MINIMOTH_API_KEY?.trim())}`);
  });
}

export default app;
