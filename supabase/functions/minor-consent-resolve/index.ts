import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// minor-consent-resolve — PUBLIC (verify_jwt OFF). Resolves a consent token to
// the minimal, non-sensitive data needed to pre-fill the consent form on the
// public /legal page. Never returns parent details or any other member data.
// Parents are unauthenticated, so the anon key cannot read minor_consents under
// RLS — resolution must go through this service-role function.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    let token = '';
    if (req.method === 'GET') {
      token = new URL(req.url).searchParams.get('token') ?? '';
    } else {
      const body = await req.json().catch(() => ({}));
      token = body?.token ?? '';
    }
    if (!token) return json({ valid: false, reason: 'missing_token' }, 200);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: row } = await admin
      .from('minor_consents')
      .select('member_id, status, token_expires_at, partner_source')
      .eq('consent_token', token)
      .maybeSingle();

    if (!row) return json({ valid: false, reason: 'invalid' }, 200);
    if (row.status === 'submitted') return json({ valid: false, reason: 'already_submitted' }, 200);
    if (row.token_expires_at && new Date(row.token_expires_at) < new Date())
      return json({ valid: false, reason: 'expired' }, 200);

    const { data: member } = await admin
      .from('profiles')
      .select('full_name, date_of_birth, partner_source')
      .eq('id', row.member_id)
      .single();

    return json({
      valid: true,
      member_name: member?.full_name ?? '',
      date_of_birth: member?.date_of_birth ?? '',
      partner_source: row.partner_source ?? member?.partner_source ?? '',
    }, 200);
  } catch (e) {
    return json({ valid: false, reason: 'error', detail: String((e as Error)?.message ?? e) }, 200);
  }
});
