import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// minor-consent-submit — PUBLIC (verify_jwt OFF). Receives the completed
// parental-consent form from the unauthenticated parent on the /legal page.
// Validates the token + all three consents server-side, captures IP and
// timestamp server-side (never trusts the client for these), records the
// consent, and flips the member from `pending` → `active` + age_gate_state
// 'cleared'. Writes happen with the service role (bypasses RLS).

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  try {
    const b = await req.json().catch(() => ({}));
    const token: string = (b?.token || '').trim();
    if (!token) return json({ error: 'missing_token' }, 400);

    const parentName = (b?.parent_name || '').trim();
    const relationship = (b?.parent_relationship || '').trim();
    const parentEmail = (b?.parent_email || '').trim();
    const signature = (b?.signature_name || '').trim();
    const okData = b?.consent_data_processing === true;
    const okProgram = b?.consent_program_participation === true;
    const okTerms = b?.consent_terms_acknowledged === true;

    if (!parentName || !relationship || !parentEmail || !signature)
      return json({ error: 'missing_fields' }, 400);
    if (!okData || !okProgram || !okTerms)
      return json({ error: 'all_consents_required' }, 400);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Re-validate the token server-side.
    const { data: row } = await admin
      .from('minor_consents')
      .select('id, member_id, status, token_expires_at')
      .eq('consent_token', token)
      .maybeSingle();
    if (!row) return json({ error: 'invalid_token' }, 400);
    if (row.status === 'submitted') return json({ error: 'already_submitted' }, 409);
    if (row.token_expires_at && new Date(row.token_expires_at) < new Date())
      return json({ error: 'expired' }, 410);

    const nowIso = new Date().toISOString();
    const ip = clientIp(req);

    const { error: updErr } = await admin.from('minor_consents').update({
      parent_name: parentName,
      parent_relationship: relationship,
      parent_email: parentEmail,
      parent_phone: (b?.parent_phone || '').trim() || null,
      partner_source: (b?.partner_source || '').trim() || null,
      consent_data_processing: true,
      consent_program_participation: true,
      consent_terms_acknowledged: true,
      signature_name: signature,
      consent_ip: ip,
      consent_timestamp: nowIso,
      status: 'submitted',
    }).eq('id', row.id);
    if (updErr) return json({ error: 'save_failed', detail: updErr.message }, 500);

    // Activate the member. Persist DOB / partner source if the form supplied them.
    const profileUpdate: Record<string, unknown> = {
      member_status: 'active',
      age_gate_state: 'cleared',
    };
    const dob = (b?.member_dob || '').trim();
    if (dob) profileUpdate.date_of_birth = dob;
    const partner = (b?.partner_source || '').trim();
    if (partner) profileUpdate.partner_source = partner;

    await admin.from('profiles').update(profileUpdate).eq('id', row.member_id);

    return json({ ok: true });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
