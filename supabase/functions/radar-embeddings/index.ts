import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Generates Voyage AI embeddings (voyage-3-lite, 512-dim) for semantic matching.
//  - mode:'companies' -> embeds up to `limit` published companies missing an embedding
//    (call repeatedly until remaining=0).
//  - mode:'member' -> embeds one member's interests + role targets into
//    profiles.radar_interest_embedding (call after a member edits their preferences).
// Requires the VOYAGE_API_KEY secret.

const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings';
const MODEL = 'voyage-3-lite';
const BATCH = 100;

async function embed(apiKey: string, texts: string[], inputType: 'document' | 'query'): Promise<number[][]> {
  const res = await fetch(VOYAGE_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, input: texts, input_type: inputType }),
  });
  if (!res.ok) throw new Error(`Voyage ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return (data.data ?? []).map((d: any) => d.embedding);
}

function companyText(c: any): string {
  const tags = Array.isArray(c.sector_tags) ? c.sector_tags.join(', ') : '';
  return `${c.name}. ${c.description ?? ''}. Sectors: ${tags}. Company size: ${c.size_tier ?? ''} employees.`.replace(/\s+/g, ' ').trim();
}

function toVecLiteral(v: number[]): string {
  return '[' + v.join(',') + ']';
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const apiKey = Deno.env.get('VOYAGE_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'VOYAGE_API_KEY not set' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  let body: any = {};
  try { body = await req.json(); } catch (_) { /* */ }
  const mode = body.mode === 'member' ? 'member' : 'companies';

  if (mode === 'member') {
    const memberId = body.memberId;
    if (!memberId) return new Response(JSON.stringify({ error: 'memberId required' }), { status: 400 });
    const { data: p } = await supabase
      .from('profiles')
      .select('radar_interests, radar_role_targets, job_title, focus_area, field')
      .eq('id', memberId).single();
    if (!p) return new Response(JSON.stringify({ error: 'member not found' }), { status: 404 });
    const interests = Array.isArray(p.radar_interests) ? p.radar_interests : [];
    const roles = Array.isArray(p.radar_role_targets) ? p.radar_role_targets : [];
    const parts = [
      interests.length ? `Interested in: ${interests.join(', ')}.` : '',
      roles.length ? `Target roles: ${roles.join(', ')}.` : '',
      p.job_title ? `Current role: ${p.job_title}.` : '',
      p.focus_area ? `Growth focus: ${p.focus_area}.` : '',
      p.field ? `Field: ${p.field}.` : '',
    ].filter(Boolean);
    if (parts.length === 0) {
      // Nothing to embed -> clear the vector so scoring falls back to tags.
      await supabase.from('profiles').update({ radar_interest_embedding: null }).eq('id', memberId);
      return new Response(JSON.stringify({ mode, embedded: false, reason: 'no preferences' }), { headers: { 'Content-Type': 'application/json' } });
    }
    const [vec] = await embed(apiKey, [parts.join(' ')], 'query');
    await supabase.from('profiles').update({ radar_interest_embedding: toVecLiteral(vec) }).eq('id', memberId);
    return new Response(JSON.stringify({ mode, embedded: true, memberId }), { headers: { 'Content-Type': 'application/json' } });
  }

  // mode === 'companies'
  const limit = Math.min(body.limit || BATCH, 128);
  const { data: companies } = await supabase
    .from('radar_companies')
    .select('id, name, description, sector_tags, size_tier')
    .is('embedding', null)
    .eq('status', 'published')
    .limit(limit);

  if (!companies || companies.length === 0) {
    const { count } = await supabase.from('radar_companies').select('id', { count: 'exact', head: true }).is('embedding', null).eq('status', 'published');
    return new Response(JSON.stringify({ mode, embedded: 0, remaining: count ?? 0, done: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  const vectors = await embed(apiKey, companies.map(companyText), 'document');
  let updated = 0;
  for (let i = 0; i < companies.length; i++) {
    if (!vectors[i]) continue;
    const { error } = await supabase.from('radar_companies')
      .update({ embedding: toVecLiteral(vectors[i]) }).eq('id', companies[i].id);
    if (!error) updated++;
  }

  const { count: remaining } = await supabase.from('radar_companies')
    .select('id', { count: 'exact', head: true }).is('embedding', null).eq('status', 'published');

  return new Response(JSON.stringify({ mode, embedded: updated, remaining: remaining ?? 0, done: (remaining ?? 0) === 0 }), { headers: { 'Content-Type': 'application/json' } });
});
