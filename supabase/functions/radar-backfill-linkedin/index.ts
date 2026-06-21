import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// One-off / repeatable backfill: short-mode scrape a sector across UAE cities and
// fill linkedin_company_id + linkedin_url on existing radar_companies rows by name
// match (only where not already set). Short mode is cheap ($0.002/result) and
// returns id (the LinkedIn company numeric id = f_C) + linkedinUrl.

const APIFY_SYNC =
  'https://api.apify.com/v2/acts/harvestapi~linkedin-company-search/run-sync-get-dataset-items';

Deno.serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  const apifyToken = Deno.env.get('APIFY_API_TOKEN')!;

  let body: any = {};
  try { body = await req.json(); } catch (_) { /* */ }
  const searchQuery: string = body.searchQuery || body.keyword || 'technology';
  const cities: string[] = Array.isArray(body.cities) && body.cities.length
    ? body.cities : ['Dubai', 'Abu Dhabi', 'Sharjah'];
  const maxItems: number = Math.min(body.maxItems || 80, 200);

  let items: any[] = [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    const res = await fetch(`${APIFY_SYNC}?token=${apifyToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ searchQuery, locations: cities, scraperMode: 'short', maxItems }),
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: 'Apify failed', status: res.status, detail: t.slice(0, 300) }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }
    items = await res.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Apify exception', detail: String(e) }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }

  let matched = 0, updated = 0;
  for (const item of items) {
    const name = (item?.name || '').trim();
    const lid = String(item?.id || '').trim();
    const lurl = (item?.linkedinUrl || '').trim();
    if (!name || !lid) continue;

    // Match an existing row by exact (case-insensitive) name that still lacks an id.
    const { data, error } = await supabase
      .from('radar_companies')
      .update({ linkedin_company_id: lid, linkedin_url: lurl || null })
      .ilike('name', name)
      .is('linkedin_company_id', null)
      .select('id');
    if (!error && data) {
      matched += data.length > 0 ? 1 : 0;
      updated += data.length;
    }
  }

  return new Response(JSON.stringify({ searchQuery, scraped: items.length, matched, updated }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
