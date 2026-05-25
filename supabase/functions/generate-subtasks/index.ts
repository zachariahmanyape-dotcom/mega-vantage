import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const SYSTEM_PROMPT =
  'You are a productivity assistant helping a professional break down a task into clear, actionable steps. ' +
  'Return between 3 and 5 subtasks depending on the complexity of the task. If the task is simple or the ' +
  'description is brief, return 3. If the task is complex or detailed, return up to 5. Never return fewer ' +
  'than 3 or more than 5. Each subtask should be a single, concrete action that can be completed ' +
  'independently. Return only a JSON array of strings with no additional text, preamble, or markdown ' +
  'formatting. Example format: ["Step one", "Step two", "Step three"]';

function parseSubtasks(text: string): string[] {
  let t = (text || '').trim();
  // Strip ```json ... ``` or ``` ... ``` fences if the model added them
  if (t.startsWith('```')) t = t.replace(/^```[a-zA-Z]*\s*/, '').replace(/```\s*$/, '').trim();
  // Grab the first JSON array if there is surrounding prose
  const start = t.indexOf('[');
  const end = t.lastIndexOf(']');
  if (start !== -1 && end !== -1 && end > start) t = t.slice(start, end + 1);
  let arr: unknown;
  try { arr = JSON.parse(t); } catch { return []; }
  if (!Array.isArray(arr)) return [];
  return arr.map((s) => String(s).trim()).filter(Boolean).slice(0, 5);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    // Any authenticated member can generate subtasks for their own task.
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Not authenticated' }, 401);

    const { title, description } = await req.json();
    if (!title || typeof title !== 'string') return json({ error: 'Missing task title' }, 400);

    const userMessage = description && String(description).trim()
      ? `Task: ${title}\nDescription: ${description}`
      : `Task: ${title}`;

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
    const data = await aiRes.json();
    if (!aiRes.ok) return json({ error: 'Anthropic API error', detail: data?.error ?? data }, 400);

    const text = data?.content?.[0]?.text ?? '';
    const subtasks = parseSubtasks(text);
    if (subtasks.length < 3) return json({ error: 'Could not parse subtasks', raw: text }, 422);

    return json({ subtasks });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
