import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// minor-consent-request — ADMIN ONLY. Generates an opaque consent token for a
// 16–17 member, stores a pending minor_consents row, and emails the parent /
// guardian a link to the consent form on the public /legal page.
// verify_jwt ON (admin auth required).

const VANTAGE_URL = 'https://vantage.mega-mentorship.com';
const TOKEN_TTL_DAYS = 21;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

function genToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    // 1. Verify caller is an authenticated admin.
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Not authenticated' }, 401);
    const { data: caller } = await userClient.from('profiles').select('role').eq('id', user.id).single();
    if (caller?.role !== 'admin') return json({ error: 'Admin only' }, 403);

    const body = await req.json();
    const memberId: string = body?.member_id;
    const parentEmail: string = (body?.parent_email || '').trim();
    if (!memberId) return json({ error: 'Missing member_id' }, 400);
    if (!parentEmail || !parentEmail.includes('@')) return json({ error: 'A valid parent/guardian email is required' }, 400);

    // 2. Service-role client for privileged reads/writes.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: member, error: mErr } = await admin
      .from('profiles')
      .select('id, full_name, date_of_birth, partner_source, age_gate_state')
      .eq('id', memberId)
      .single();
    if (mErr || !member) return json({ error: 'Member not found' }, 404);

    const token = genToken();
    const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 86400000).toISOString();

    // 3. Replace any prior pending row for this member, then store the new token.
    await admin.from('minor_consents').delete().eq('member_id', memberId).eq('status', 'pending');
    const { error: insErr } = await admin.from('minor_consents').insert({
      member_id: memberId,
      parent_email: parentEmail,
      partner_source: member.partner_source ?? null,
      consent_token: token,
      token_expires_at: expiresAt,
      status: 'pending',
    });
    if (insErr) return json({ error: 'Could not create consent record', detail: insErr.message }, 500);

    // Mark the member as awaiting consent (idempotent; never downgrades a cleared adult elsewhere).
    await admin.from('profiles').update({ age_gate_state: 'awaiting_consent' }).eq('id', memberId);

    // 4. Email the parent/guardian.
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) return json({ error: 'RESEND_API_KEY not set' }, 500);

    const consentUrl = `${VANTAGE_URL}/legal?consent_for=${token}#consent`;
    const memberName = member.full_name || 'a MEGA member';
    const sourceLine = member.partner_source
      ? `<p style="margin:0 0 20px;font-size:15px;color:#333;">This request relates to their participation through <strong>${escapeHtml(member.partner_source)}</strong>.</p>`
      : '';

    const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Montserrat',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
  <tr><td style="background:#0F52BA;padding:28px 32px;">
    <span style="font-family:'Bebas Neue','Trebuchet MS',sans-serif;font-size:24px;color:#ffffff;letter-spacing:1px;">VANTAGE</span>
  </td></tr>
  <tr><td style="padding:32px;">
    <p style="margin:0 0 16px;font-size:18px;color:#0A0A0A;font-weight:700;">Parental consent requested</p>
    <p style="margin:0 0 16px;font-size:15px;color:#333;">Hello,</p>
    <p style="margin:0 0 16px;font-size:15px;color:#333;">MEGA (Middle East Growth Academy) has been asked to set up access to <strong>Vantage</strong>, our member development platform, for <strong>${escapeHtml(memberName)}</strong>, who is under 18.</p>
    ${sourceLine}
    <p style="margin:0 0 24px;font-size:15px;color:#333;">As their parent or legal guardian, we need your consent before their account can be activated. Please review and complete the short consent form below.</p>
    <table cellpadding="0" cellspacing="0"><tr><td style="background:#0F52BA;border-radius:8px;">
      <a href="${consentUrl}" style="display:inline-block;padding:13px 30px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Review &amp; provide consent</a>
    </td></tr></table>
    <p style="margin:24px 0 0;font-size:13px;color:#888;">This link is unique to your child and will expire in ${TOKEN_TTL_DAYS} days. If you did not expect this email, you can safely ignore it.</p>
  </td></tr>
  <tr><td style="padding:20px 32px;border-top:1px solid #eee;">
    <p style="margin:0;font-size:12px;color:#999;">MEGA Mentorship &middot; <a href="${VANTAGE_URL}" style="color:#0F52BA;text-decoration:none;">vantage.mega-mentorship.com</a></p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`.trim();

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Vantage by MEGA <notifications@mega-mentorship.com>',
        to: [parentEmail],
        subject: `Parental consent needed for ${memberName} on Vantage`,
        html,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      return json({ error: 'Email delivery failed', detail }, 502);
    }

    return json({ ok: true, sent_to: parentEmail, expires_at: expiresAt });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
