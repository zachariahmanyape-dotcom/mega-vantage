import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Authoritative hiring signal via real LinkedIn open-role counts.
// Processes a rotating batch of companies that have a linkedin_company_id
// (oldest jobs_last_checked first) plus all saved companies, queries each
// company's UAE jobs through the curious_coder/linkedin-jobs-scraper actor,
// writes job_count + hiring_detected + jobs_last_checked, and emails members
// who enabled notify when a company transitions not-hiring -> hiring.

const JOBS_ACTOR_SYNC =
  'https://api.apify.com/v2/acts/curious_coder~linkedin-jobs-scraper/run-sync-get-dataset-items';
const BATCH_SIZE = 60;
const COUNT_CAP = 300;        // total job results per actor run (cost control)
const VANTAGE_URL = 'https://vantage.mega-mentorship.com';
const UAE_LOCATION = 'United Arab Emirates';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function jobsUrl(companyId: string): string {
  return `https://www.linkedin.com/jobs/search/?f_C=${companyId}&location=${encodeURIComponent(UAE_LOCATION)}`;
}

function idFromInputUrl(url: string): string | null {
  const m = (url || '').match(/f_C=(\d+)/);
  return m ? m[1] : null;
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const apifyToken = Deno.env.get('APIFY_API_TOKEN')!;
  const resendKey = Deno.env.get('RESEND_API_KEY');

  // Rotating batch: oldest jobs_last_checked first.
  const { data: rotating } = await supabase
    .from('radar_companies')
    .select('id, name, linkedin_company_id, hiring_detected, jobs_last_checked')
    .not('linkedin_company_id', 'is', null)
    .order('jobs_last_checked', { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE);

  // Always include saved companies (that have an id), so watchlists stay fresh.
  const { data: savedRows } = await supabase
    .from('radar_saved_companies').select('company_id');
  const savedIds = [...new Set((savedRows ?? []).map((s: any) => s.company_id))];
  let savedCompanies: any[] = [];
  if (savedIds.length > 0) {
    const { data } = await supabase
      .from('radar_companies')
      .select('id, name, linkedin_company_id, hiring_detected, jobs_last_checked')
      .in('id', savedIds)
      .not('linkedin_company_id', 'is', null);
    savedCompanies = data ?? [];
  }

  // Merge + de-dup by id.
  const byId = new Map<string, any>();
  for (const c of [...(rotating ?? []), ...savedCompanies]) byId.set(c.id, c);
  const companies = [...byId.values()];

  if (companies.length === 0) {
    return new Response(JSON.stringify({ processed: 0, note: 'no companies with linkedin id' }), { headers: { 'Content-Type': 'application/json' } });
  }

  // One actor run for the whole batch.
  const urls = companies.map((c) => jobsUrl(c.linkedin_company_id));
  let jobs: any[] = [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    const res = await fetch(`${JOBS_ACTOR_SYNC}?token=${apifyToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ urls, scrapeCompany: false, count: COUNT_CAP }),
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: 'Jobs actor failed', status: res.status, detail: t.slice(0, 300) }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }
    jobs = await res.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Jobs actor exception', detail: String(e) }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }

  // Tally jobs per company id (via the f_C in each job's inputUrl).
  const counts = new Map<string, number>();
  for (const j of jobs) {
    const cid = idFromInputUrl(j?.inputUrl || '');
    if (cid) counts.set(cid, (counts.get(cid) ?? 0) + 1);
  }

  const nowIso = new Date().toISOString();
  const transitions: { id: string; name: string }[] = [];
  let processed = 0, hiringCount = 0;

  for (const c of companies) {
    const jobCount = counts.get(c.linkedin_company_id) ?? 0;
    const newHiring = jobCount > 0;
    processed++;
    if (newHiring) hiringCount++;

    const hadPriorCheck = c.jobs_last_checked !== null;
    if (hadPriorCheck && c.hiring_detected === false && newHiring === true) {
      transitions.push({ id: c.id, name: c.name });
    }

    await supabase.from('radar_companies').update({
      job_count: jobCount,
      hiring_detected: newHiring,
      jobs_last_checked: nowIso,
      hiring_last_checked: nowIso,
      last_refresh_error: null,
    }).eq('id', c.id);
  }

  // ---- Notifications for not->hiring transitions ----
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
    <p style="margin:0 0 20px;font-size:15px;color:#333;">A company on your Corporate Radar watchlist just posted new roles and is now <strong style="color:#FF6B6B;">hiring</strong>.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fb;border-radius:8px;margin:0 0 24px;"><tr><td style="padding:20px;">
      <p style="margin:0 0 6px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Now hiring</p>
      <p style="margin:0;font-size:18px;color:#0A0A0A;font-weight:600;">${escapeHtml(companyName)}</p>
    </td></tr></table>
    <table cellpadding="0" cellspacing="0"><tr><td style="background:#0F52BA;border-radius:8px;"><a href="${VANTAGE_URL}" style="display:inline-block;padding:12px 28px;color:#fff;font-size:14px;font-weight:600;text-decoration:none;">View on Corporate Radar</a></td></tr></table>
    <p style="margin:20px 0 0;font-size:13px;color:#888;">You're receiving this because you enabled hiring alerts for this company.</p>
  </td></tr>
  <tr><td style="padding:20px 32px;border-top:1px solid #eee;"><p style="margin:0;font-size:12px;color:#999;">MEGA Mentorship &middot; <a href="${VANTAGE_URL}" style="color:#0F52BA;text-decoration:none;">vantage.mega-mentorship.com</a></p></td></tr>
</table></td></tr></table></body></html>`.trim();
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Vantage by MEGA <notifications@mega-mentorship.com>',
            to: [profile.email], subject: `\u{1F680} ${companyName} is now hiring`, html,
          }),
        });
        if (r.ok) notified++; else notifyErrors.push(`${profile.email}: ${r.status}`);
      }
    }
  }

  return new Response(JSON.stringify({
    processed, hiring: hiringCount, totalJobsScraped: jobs.length,
    transitions: transitions.length, notified, notifyErrors: notifyErrors.slice(0, 10),
    resendConfigured: !!resendKey,
  }), { headers: { 'Content-Type': 'application/json' } });
});
