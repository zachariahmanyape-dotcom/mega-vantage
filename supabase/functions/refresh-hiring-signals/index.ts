import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const HIRING_KEYWORDS = [
  'open position',
  'open role',
  'current opening',
  'job opening',
  'we are hiring',
  "we're hiring",
  'apply now',
  'apply today',
  'join our team',
  'join us',
  'current vacancies',
  'vacancy',
  'vacancies',
  'careers at',
  'work with us',
  'opportunities',
  'full-time',
  'part-time',
  'immediate opening',
];

const FETCH_TIMEOUT_MS = 8000;

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: companies, error: fetchError } = await supabase
    .from('radar_companies')
    .select('id, name, careers_url')
    .not('careers_url', 'is', null);

  if (fetchError) {
    console.error('Failed to fetch companies:', fetchError.message);
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
  }

  const results = [];

  for (const company of companies ?? []) {
    let hiringDetected = false;
    let errorMessage: string | null = null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const response = await fetch(company.careers_url, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      clearTimeout(timeout);

      if (response.ok) {
        const html = await response.text();
        const lowerHtml = html.toLowerCase();
        hiringDetected = HIRING_KEYWORDS.some((kw) => lowerHtml.includes(kw));
      } else {
        errorMessage = `HTTP ${response.status}`;
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        errorMessage = err.name === 'AbortError' ? 'Timeout after 8s' : err.message;
      } else {
        errorMessage = 'Unknown error';
      }
    }

    const { error: updateError } = await supabase
      .from('radar_companies')
      .update({
        hiring_detected: hiringDetected,
        hiring_last_checked: new Date().toISOString(),
        last_refresh_error: errorMessage,
      })
      .eq('id', company.id);

    if (updateError) {
      console.error(`Failed to update ${company.name}:`, updateError.message);
    }

    results.push({
      company: company.name,
      hiring_detected: hiringDetected,
      error: errorMessage,
    });

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log('Refresh complete:', results);

  return new Response(JSON.stringify({ refreshed: results.length, results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
