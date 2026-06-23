import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    // Verify the caller is an authenticated admin (same pattern as google-calendar-event)
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Not authenticated' }, 401);
    const { data: profile } = await userClient.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return json({ error: 'Admin only' }, 403);

    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== 'string') return json({ error: 'Missing prompt' }, 400);

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return json({ code: 'AI-CONFIG', error: 'AI service is not configured. Please contact support.', detail: 'ANTHROPIC_API_KEY not set' }, 500);
    }

    let aiRes: Response;
    try {
      aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
    } catch (netErr) {
      // Couldn't even reach the provider (network/DNS/timeout)
      return json({
        code: 'AI-503',
        error: 'AI service temporarily unavailable — your inputs are saved, please try again in a few minutes.',
        detail: String((netErr as Error)?.message ?? netErr),
      }, 503);
    }

    const data = await aiRes.json().catch(() => null);
    if (!aiRes.ok) {
      // Map the upstream provider error to a friendly, white-labelled message + code.
      // The real upstream status/detail is preserved for server-side debugging only.
      const upstream = aiRes.status;
      let code = 'AI-ERR';
      let message = 'Roadmap generation failed due to an AI service error. Please try again.';
      if (upstream >= 500) {
        code = 'AI-503';
        message = 'AI service temporarily unavailable — your inputs are saved, please try again in a few minutes.';
      } else if (upstream === 429) {
        code = 'AI-429';
        message = 'The AI service is busy right now — your inputs are saved, please try again in a moment.';
      } else if (upstream === 401 || upstream === 403) {
        code = 'AI-AUTH';
        message = 'AI service authorization issue. Please contact support.';
      }
      return json({ code, error: message, upstream_status: upstream, detail: data?.error ?? data }, 502);
    }

    const text = data?.content?.[0]?.text ?? '';
    return json({ text });
  } catch (e) {
    return json({ code: 'AI-UNKNOWN', error: 'Something went wrong generating the roadmap. Please try again.', detail: String((e as Error)?.message ?? e) }, 500);
  }
});
