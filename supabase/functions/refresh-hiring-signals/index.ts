import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Homepage keyword-scan hiring fallback for companies WITHOUT a LinkedIn id.
// (Companies with a linkedin_company_id are handled authoritatively by
// radar-jobs-refresh via real LinkedIn open-role counts.)
// Batched + parallel so it stays within the Edge Function time budget; detects
// not->hiring transitions and emails members who saved the company with notify on.

const HIRING_KEYWORDS = [
  'open position', 'open role', 'current opening', 'job opening', 'we are hiring',
  "we're hiring", 'apply now', 'apply today', 'join our team', 'join us',
  'current vacancies', 'vacancy', 'vacancies', 'careers at', 'work with us',
  'opportunities', 'full-time', 'part-time', 'immediate opening', 'now hiring',
];

const FETCH_TIMEOUT_MS = 8000;
const BATCH_SIZE = 150;
const CONCURRENCY = 10;
const VANTAGE_URL = 'https://vantage.mega-mentorship.com';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function scanCompany(careersUrl: string): Promise<{ hiring: boolean; error: string | null }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(careersUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timeout);
    if (!response.ok) return { hiring: false, error: `HTTP ${response.status}` };
    const lowerHtml = (await response.text()).toLowerCase();
    return { hiring: HIRING_KEYWORDS.some((kw) => lowerHtml.includes(kw)), error: null };
  } catch (err: unknown) {
    if (err instanceof Error) {
      return { hiring: false, error: err.name === 'AbortError' ? 'Timeout after 8s' : err.message };
    }
    return { hiring: false, error: 'Unknown error' };
  }
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const resendKey = Deno.env.get('RESEND_API_KEY');

  const { data: companies, error: fetchError } = await supabase
    .from('radar_companies')
    .select('id, name, careers_url, hiring_detected, hiring_last_checked')
    .not('careers_url', 'is', null)
    .is('linkedin_company_id', null)
    .order('hiring_last_checked', { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
  }

  const nowIso = new Date().toISOString();
  const transitions: { id: string; name: string }[] = [];
  let processed = 0, hiringCount = 0, errorCount = 0;

  for (let i = 0; i < (companies ?? []).length; i += CONCURRENCY) {
    const chunk = (companies ?? []).slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map(async (company: any) => {
      const { hiring, error } = await scanCompany(company.careers_url);
      processed++;
      if (hiring) hiringCount++;
      if (error) errorCount++;
      const hadPriorCheck = company.hiring_last_checked !== null;
      if (hadPriorCheck && company.hiring_detected === false && hiring === true) {
        transitions.push({ id: company.id, name: company.name });
      }
      await supabase
        .from('radar_companies')
        .update({ hiring_detected: hiring, hiring_last_checked: nowIso, last_refresh_error: error })
        .eq('id', company.id);
    }));
  }

  let notified = 0;
  const notifyErrors: string[] = [];
  if (resendKey && transitions.length > 0) {
    const nameById = new Map(transitions.map((t) => [t.id, t.name]));
    const { data: saves } = await supabase
      .from('radar_saved_companies')
      .select('member_id, company_id')
      .eq('notify', true)
      .in('company_id', transitions.map((t) => t.id));
    if (saves && saves.length > 0) {
      const memberIds = [...new Set(saves.map((s: any) => s.member_id))];
      const { data: profiles } = await supabase
        .from('profiles').select('id, email, full_name').in('id', memberIds);
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      for (const save of saves) {
        const profile = profileMap.get(save.member_id);
        if (!profile?.email) continue;
        const companyName = nameById.get(save.company_id) || 'A saved company';
        const firstName = (profile.full_name || '').split(' ')[0] || 'there';
        const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Montserrat',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
  <tr><td style="background:#0F52BA;padding:28px 32px;"><span style="font-family:'Bebas Neue','Trebuchet MS',sans-serif;font-size:24px;color:#fff;letter-spacing:1px;">VANTAGE</span></td></tr>
  <tr><td style="padding:32px;">
    <p style="margin:0 0 16px;font-size:16px;color:#0A0A0A;">Hi ${firstName},</p>
    <p style="margin:0 0 20px;font-size:15px;color:#333;">Good news &mdash; a company on your Corporate Radar watchlist just started <strong style="color:#FF6B6B;">hiring</strong>.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fb;border-radius:8px;margin:0 0 24px;"><tr><td style="padding:20px;">
      <p style="margin:0 0 6px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Now hiring</p>
      <p style="margin:0;font-size:18px;color:#0A0A0A;font-weight:600;">${escapeHtml(companyName)}</p>
    </td></tr></table>
    <table cellpadding="0" cellspacing="0"><tr><td style="background:#0F52BA;border-radius:8px;"><a href="${VANTAGE_URL}" style="display:inline-block;padding:12px 28px;color:#fff;font-size:14px;font-weight:600;text-decoration:none;">View on Corporate Radar</a></td></tr></table>
    <p style="margin:20px 0 0;font-size:13px;color:#888;">You're receiving this because you enabled hiring alerts for this company.</p>
  </td></tr>
  <tr><td style="padding:20px 32px;border-top:1px solid #eee;"><p style="margin:0;font-size:12px;color:#999;">MEGA Mentorship &middot; <a href="${VANTAGE_URL}" style="color:#0F52BA;text-decoration:none;">vantage.mega-mentorship.com</a></p></td></tr>
</table></td></tr></table></body></html>`.trim();
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Vantage by MEGA <notifications@mega-mentorship.com>',
            to: [profile.email], subject: `\u{1F680} ${companyName} is now hiring`, html,
          }),
        });
        if (res.ok) notified++; else notifyErrors.push(`${profile.email}: ${res.status}`);
      }
    }
  }

  return new Response(JSON.stringify({
    processed, hiring: hiringCount, errors: errorCount,
    transitions: transitions.length, notified, resendConfigured: !!resendKey,
  }), { headers: { 'Content-Type': 'application/json' } });
});
