import { createClient } from 'jsr:@supabase/supabase-js@2';

const page = (body: string) =>
  new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Vantage · Google</title><style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f5f6fa;color:#0a0a0a;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}.card{background:#fff;border:1px solid #e8eaed;border-radius:16px;padding:40px;max-width:380px;text-align:center;box-shadow:0 4px 32px rgba(0,0,0,.07)}h2{margin:0 0 8px;font-size:22px}p{color:#666;font-size:14px;line-height:1.6;margin:0}</style></head><body><div class="card">${body}</div></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

function b64urlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecodeToStr(s: string): string {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
async function hmac(data: string, key: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data)));
}
async function readState(state: string, key: string): Promise<{ uid?: string } | null> {
  const [body, sig] = state.split('.');
  if (!body || !sig) return null;
  const expected = b64urlEncode(await hmac(body, key));
  if (expected !== sig) return null;
  try { return JSON.parse(b64urlDecodeToStr(body)); } catch { return null; }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthErr = url.searchParams.get('error');
  if (oauthErr) return page(`<h2>Connection cancelled</h2><p>${oauthErr}</p>`);
  if (!code || !state) return page('<h2>Missing code or state</h2><p>Please try connecting again from Vantage.</p>');

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI');
  if (!clientId || !clientSecret || !redirectUri) return page('<h2>Server not configured</h2><p>Google secrets are missing.</p>');

  const parsed = await readState(state, clientSecret);
  if (!parsed?.uid) return page('<h2>Invalid state</h2><p>Please try connecting again from Vantage.</p>');

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  });
  const tok = await tokenRes.json();
  if (!tok.access_token) return page('<h2>Token exchange failed</h2><p>Please try again.</p>');

  let email: string | null = null;
  try {
    const ui = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${tok.access_token}` } });
    email = (await ui.json()).email ?? null;
  } catch { /* ignore */ }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const row: Record<string, unknown> = {
    user_id: parsed.uid,
    email,
    access_token: tok.access_token,
    token_expiry: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (tok.refresh_token) row.refresh_token = tok.refresh_token;
  const { error: upErr } = await admin.from('google_tokens').upsert(row, { onConflict: 'user_id' });
  if (upErr) return page(`<h2>Could not save connection</h2><p>${upErr.message}</p>`);
  await admin.from('profiles').update({ google_connected: true, google_email: email }).eq('id', parsed.uid);

  return page('<h2>Google connected ✓</h2><p>You can close this tab and return to Vantage. New sessions you schedule will include a Google Meet link.</p>');
});
