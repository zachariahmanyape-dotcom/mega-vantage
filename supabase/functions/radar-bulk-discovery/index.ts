import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Discovery: scrape full-mode LinkedIn companies for a sector across UAE cities,
// keep any company with a UAE office (HQ or branch), quality-gate, enrich
// deterministically (no per-row AI), capture LinkedIn id/url, and dedup-insert.
// Two modes:
//  - Explicit: pass { searchQuery, status:'published'|'draft', maxItems } (bulk seeding).
//  - Rotating: omit searchQuery -> picks the next keyword from KEYWORD_BANK using
//    radar_discovery_state and advances the index (weekly cron, status defaults to draft).

const APIFY_SYNC =
  'https://api.apify.com/v2/acts/harvestapi~linkedin-company-search/run-sync-get-dataset-items';

const KEYWORD_BANK = [
  'technology', 'fintech', 'consulting', 'logistics', 'healthcare', 'real estate',
  'marketing', 'retail', 'construction', 'hospitality', 'education', 'energy',
  'legal', 'manufacturing', 'recruitment', 'media', 'insurance', 'e-commerce',
  'automotive', 'telecommunications', 'banking', 'advertising', 'travel', 'food and beverage',
];

const INDUSTRY_TAG_MAP: Record<string, string[]> = {
  'software': ['Tech', 'SaaS'],
  'it services': ['Tech', 'Consulting'],
  'it consulting': ['Tech', 'Consulting'],
  'information technology': ['Tech'],
  'information services': ['Tech'],
  'internet': ['Tech', 'E-commerce'],
  'computer': ['Tech'],
  'artificial intelligence': ['Tech', 'AI'],
  'data infrastructure': ['Tech', 'Cloud'],
  'telecommunications': ['Tech'],
  'technology': ['Tech'],
  'financial services': ['Finance'],
  'banking': ['Finance', 'Banking'],
  'capital markets': ['Finance'],
  'investment': ['Finance'],
  'venture capital': ['Finance'],
  'insurance': ['Finance'],
  'fintech': ['Fintech', 'Finance'],
  'payment': ['Fintech'],
  'real estate': ['Real Estate', 'Development'],
  'construction': ['Real Estate', 'Development'],
  'building': ['Real Estate', 'Development'],
  'property': ['Real Estate'],
  'architecture': ['Real Estate', 'Creative'],
  'consulting': ['Consulting'],
  'professional services': ['Consulting'],
  'business consulting': ['Consulting'],
  'accounting': ['Consulting', 'Finance'],
  'retail': ['Retail'],
  'e-commerce': ['Retail', 'E-commerce'],
  'consumer': ['Retail'],
  'luxury': ['Retail', 'Luxury'],
  'fashion': ['Retail', 'Fashion'],
  'apparel': ['Retail', 'Fashion'],
  'media': ['Media'],
  'entertainment': ['Media'],
  'broadcast': ['Media'],
  'advertising': ['Media', 'Creative'],
  'marketing': ['Media', 'Creative'],
  'public relations': ['Media', 'Creative'],
  'design': ['Creative'],
  'events': ['Media', 'Events'],
  'publishing': ['Media'],
  'logistics': ['Logistics'],
  'transportation': ['Logistics'],
  'supply chain': ['Logistics'],
  'maritime': ['Logistics'],
  'shipping': ['Logistics'],
  'aviation': ['Logistics'],
  'warehousing': ['Logistics'],
  'hospitality': ['Hospitality'],
  'hotels': ['Hospitality', 'Luxury'],
  'restaurants': ['Hospitality'],
  'food': ['Hospitality'],
  'travel': ['Hospitality'],
  'leisure': ['Hospitality'],
  'oil': ['Energy'],
  'gas': ['Energy'],
  'energy': ['Energy'],
  'renewable': ['Energy'],
  'utilities': ['Energy'],
  'mining': ['Energy'],
  'healthcare': ['Healthcare'],
  'hospital': ['Healthcare'],
  'medical': ['Healthcare'],
  'pharmaceutical': ['Healthcare'],
  'biotechnology': ['Healthcare'],
  'wellness': ['Healthcare'],
  'education': ['Education'],
  'higher education': ['Education'],
  'e-learning': ['Education', 'Tech'],
  'research': ['Education'],
  'legal': ['Legal'],
  'law practice': ['Legal'],
  'government': ['Gov/Semi-Gov'],
  'public': ['Gov/Semi-Gov'],
  'defense': ['Gov/Semi-Gov'],
  'automotive': ['Automotive'],
  'manufacturing': ['Enterprise'],
  'industrial': ['Enterprise'],
  'machinery': ['Enterprise'],
  'staffing': ['Consulting', 'HR'],
  'human resources': ['HR'],
  'recruiting': ['Consulting', 'HR'],
};

const COLOR_MAP: Record<string, string> = {
  'Tech': '#0F52BA', 'Finance': '#0F52BA', 'Fintech': '#0F52BA', 'Banking': '#0F52BA',
  'AI': '#5B7FD4', 'Cloud': '#5B7FD4', 'SaaS': '#5B7FD4',
  'Healthcare': '#A3E4DB', 'Logistics': '#A3E4DB', 'Education': '#A3E4DB',
  'Media': '#FF6B6B', 'Events': '#FF6B6B', 'Creative': '#FF6B6B', 'Fashion': '#FF6B6B', 'Luxury': '#FF6B6B',
  'Energy': '#FFA07A', 'Real Estate': '#FFA07A', 'Retail': '#FFA07A', 'E-commerce': '#FFA07A', 'Hospitality': '#FFA07A',
};

const BAD_ABBR = ['ASS', 'SEX', 'FUK', 'FUC', 'FUX', 'CUM', 'TIT', 'FAG', 'NIG', 'DIE', 'GAY', 'JEW', 'PIS', 'COK', 'DIK', 'WTF', 'POO', 'PEE'];
const isBadAbbr = (a: string) => BAD_ABBR.some((b) => a.includes(b));

function mapIndustryTags(industries: any[]): string[] {
  const tags = new Set<string>();
  for (const ind of industries ?? []) {
    const name = (ind?.name || ind?.title || '').toLowerCase();
    if (!name) continue;
    for (const [key, mapped] of Object.entries(INDUSTRY_TAG_MAP)) {
      if (name.includes(key)) mapped.forEach((t) => tags.add(t));
    }
  }
  if (tags.size === 0) tags.add('Enterprise');
  return Array.from(tags).slice(0, 4);
}

function deriveSizeTier(item: any): string {
  const n = typeof item.employeeCount === 'number' ? item.employeeCount
    : (item?.employeeCountRange?.start ?? 0);
  if (!n || n <= 50) return '1-50';
  if (n <= 200) return '51-200';
  if (n <= 1000) return '201-1000';
  return '1000+';
}

function makeAbbreviation(name: string): string {
  const words = name.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'CO';
  let abbr = words.length === 1
    ? words[0].substring(0, 3).toUpperCase()
    : words.map((w) => w[0]).join('').substring(0, 4).toUpperCase();
  if (isBadAbbr(abbr)) abbr = words[0].substring(0, 3).toUpperCase();
  if (isBadAbbr(abbr)) abbr = words[0].substring(0, 4).toUpperCase();
  return abbr;
}

const pickLogoColor = (tags: string[]) => COLOR_MAP[tags[0] ?? ''] ?? '#9B94E8';

function hasUAEPresence(item: any): boolean {
  const locs = Array.isArray(item.locations) ? item.locations : [];
  for (const l of locs) {
    const cc = (l?.parsed?.countryCode || '').toUpperCase();
    if (cc === 'AE') return true;
    const full = (l?.parsed?.countryFull || l?.country || l?.parsed?.text || '').toLowerCase();
    if (full.includes('united arab emirates') || /\b(dubai|abu dhabi|sharjah|ajman|fujairah|ras al)\b/.test(full)) return true;
  }
  return false;
}

function cleanDescription(item: any): string {
  const raw = (item.tagline || item.description || '').replace(/\s+/g, ' ').trim();
  if (!raw) return 'A company with operations in the UAE.';
  if (raw.length <= 200) return raw;
  return raw.slice(0, 197).trimEnd() + '...';
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  const apifyToken = Deno.env.get('APIFY_API_TOKEN')!;

  let body: any = {};
  try { body = await req.json(); } catch (_) { /* */ }

  let searchQuery: string = body.searchQuery || body.keyword || '';
  let rotated = false;
  if (!searchQuery) {
    const { data: state } = await supabase
      .from('radar_discovery_state').select('current_sector_index').eq('id', 1).single();
    const idx = state?.current_sector_index ?? 0;
    searchQuery = KEYWORD_BANK[idx % KEYWORD_BANK.length];
    rotated = true;
    await supabase.from('radar_discovery_state')
      .update({ current_sector_index: (idx + 1) % KEYWORD_BANK.length }).eq('id', 1);
  }

  const cities: string[] = Array.isArray(body.cities) && body.cities.length
    ? body.cities : ['Dubai', 'Abu Dhabi', 'Sharjah'];
  const maxItems: number = Math.min(body.maxItems || 50, 200);
  const status: string = body.status
    ? (body.status === 'draft' ? 'draft' : 'published')
    : (rotated ? 'draft' : 'published');

  let items: any[] = [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    const res = await fetch(`${APIFY_SYNC}?token=${apifyToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ searchQuery, locations: cities, scraperMode: 'full', maxItems }),
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: 'Apify failed', status: res.status, detail: t.slice(0, 500) }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }
    items = await res.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Apify exception', detail: String(e) }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }

  const scraped = items.length;
  let droppedJunk = 0, droppedNonUae = 0;
  const rows: any[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const name = (item?.name || '').trim();
    const website = (item?.website || '').trim();
    if (!name || !website || item?.autoGenerated === true) { droppedJunk++; continue; }
    if (!hasUAEPresence(item)) { droppedNonUae++; continue; }
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const tags = mapIndustryTags(item.industries);
    rows.push({
      name,
      abbreviation: makeAbbreviation(name),
      sector_tags: tags,
      size_tier: deriveSizeTier(item),
      description: cleanDescription(item),
      website_url: website,
      careers_url: website,
      linkedin_company_id: String(item?.id || '').trim() || null,
      linkedin_url: (item?.linkedinUrl || '').trim() || null,
      logo_color: pickLogoColor(tags),
      hiring_detected: false,
      status,
      published_at: status === 'published' ? new Date().toISOString() : null,
    });
  }

  let inserted = 0;
  if (rows.length > 0) {
    const { data, error } = await supabase
      .from('radar_companies')
      .upsert(rows, { onConflict: 'name', ignoreDuplicates: true })
      .select('id');
    if (error) {
      return new Response(JSON.stringify({ error: 'Insert failed', detail: error.message, scraped, candidates: rows.length }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    inserted = data?.length ?? 0;
  }

  return new Response(JSON.stringify({
    searchQuery, rotated, cities, scraped, candidates: rows.length,
    inserted, duplicates: rows.length - inserted, droppedJunk, droppedNonUae, status,
  }), { headers: { 'Content-Type': 'application/json' } });
});
