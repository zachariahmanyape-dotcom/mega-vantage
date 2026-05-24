import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const pad = (t: string) => (t && t.length === 5 ? `${t}:00` : t);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
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

    const { sessionId, title, dateISO, startTime, endTime, attendeeEmail, description } = await req.json();
    if (!title || !dateISO || !startTime || !endTime) return json({ error: 'Missing event fields' }, 400);

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    if (!clientId || !clientSecret) return json({ error: 'Google secrets not configured' }, 500);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: tokenRow } = await admin.from('google_tokens').select('refresh_token').eq('user_id', user.id).single();
    if (!tokenRow?.refresh_token) return json({ error: 'Google not connected' }, 400);

    const rt = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: tokenRow.refresh_token, grant_type: 'refresh_token' }),
    });
    const rtj = await rt.json();
    if (!rtj.access_token) return json({ error: 'Token refresh failed', detail: rtj }, 400);
    const accessToken = rtj.access_token as string;

    const event: Record<string, unknown> = {
      summary: title,
      description: description ?? '',
      start: { dateTime: `${dateISO}T${pad(startTime)}`, timeZone: 'Asia/Dubai' },
      end: { dateTime: `${dateISO}T${pad(endTime)}`, timeZone: 'Asia/Dubai' },
      conferenceData: { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } } },
    };
    if (attendeeEmail) event.attendees = [{ email: attendeeEmail }];

    const calRes = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
      { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(event) },
    );
    const ev = await calRes.json();
    if (!calRes.ok) return json({ error: 'Calendar API error', detail: ev?.error ?? ev }, 400);

    const meetLink = ev.hangoutLink ??
      ev.conferenceData?.entryPoints?.find((e: { entryPointType?: string; uri?: string }) => e.entryPointType === 'video')?.uri ?? null;

    if (sessionId) {
      await admin.from('sessions').update({ meeting_link: meetLink, google_event_id: ev.id }).eq('id', sessionId);
    }
    await admin.from('google_tokens').update({
      access_token: accessToken,
      token_expiry: new Date(Date.now() + (rtj.expires_in ?? 3600) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id);

    return json({ meeting_link: meetLink, google_event_id: ev.id });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
