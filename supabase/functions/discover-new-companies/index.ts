import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const APIFY_API_URL = 'https://api.apify.com/v2/acts/harvestapi~linkedin-company-search/run-sync-get-dataset-items';
const COMPANIES_PER_RUN = 25;

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const apifyToken = Deno.env.get('APIFY_API_TOKEN')!;
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!;

  // Step 1: Fetch existing company names for deduplication
  const { data: existingCompanies } = await supabase
    .from('radar_companies')
    .select('name');

  const existingNames = new Set(
    (existingCompanies ?? []).map((c: { name: string }) => c.name.toLowerCase().trim())
  );

  // Step 2: Call Apify LinkedIn Company Search scraper
  let apifyResults: ApifyCompany[] = [];
  try {
    const apifyResponse = await fetch(`${APIFY_API_URL}?token=${apifyToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        searchTerms: ['companies in UAE', 'companies Dubai', 'companies Abu Dhabi'],
        maxResults: COMPANIES_PER_RUN * 3, // over-fetch to account for deduplication loss
        includePersonalProfiles: false,
      }),
    });

    if (apifyResponse.ok) {
      apifyResults = await apifyResponse.json();
    } else {
      console.error('Apify error:', apifyResponse.status, await apifyResponse.text());
    }
  } catch (err) {
    console.error('Apify fetch failed:', err);
  }

  // Step 3: Filter to genuinely new companies
  const newCompanies = apifyResults
    .filter((c) => c.name && !existingNames.has(c.name.toLowerCase().trim()))
    .slice(0, COMPANIES_PER_RUN);

  if (newCompanies.length === 0) {
    return new Response(JSON.stringify({ message: 'No new companies found this run' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Step 4: Enrich each new company via Anthropic API
  const inserted = [];

  for (const company of newCompanies) {
    const enriched = await enrichCompany(company, anthropicKey);

    const { error } = await supabase.from('radar_companies').insert({
      name: company.name,
      abbreviation: enriched.abbreviation,
      sector_tags: enriched.sector_tags,
      size_tier: enriched.size_tier,
      description: enriched.description,
      website_url: company.websiteUrl ?? null,
      careers_url: company.careersUrl ?? null,
      logo_color: pickLogoColor(enriched.sector_tags),
      hiring_detected: false,
      status: 'draft',
    });

    if (error) {
      console.error(`Failed to insert ${company.name}:`, error.message);
    } else {
      inserted.push(company.name);
    }

    // Polite delay between Anthropic calls
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return new Response(
    JSON.stringify({ inserted: inserted.length, companies: inserted }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});

// --- AI Enrichment ---

interface ApifyCompany {
  name: string;
  websiteUrl?: string;
  careersUrl?: string;
  employeeCount?: number;
  industries?: string[];
  description?: string;
}

interface EnrichedCompany {
  abbreviation: string;
  sector_tags: string[];
  size_tier: string;
  description: string;
}

async function enrichCompany(company: ApifyCompany, apiKey: string): Promise<EnrichedCompany> {
  const prompt = `You are enriching a company record for a UAE professional development platform called MEGA. Given the company information below, return a JSON object with exactly these fields:

- abbreviation: a 2-4 character uppercase badge label (e.g. "G42", "REV", "MAF")
- sector_tags: an array of 2-4 strings from this list only: Tech, Finance, Consulting, Real Estate, Media, Healthcare, Logistics, Retail, Gov/Semi-Gov, Hospitality, Energy, Legal, Education, Non-Profit, Conglomerate, Fintech, E-commerce, Automotive, AI, Cloud, SaaS, Enterprise, Banking, Events, Creative, Fashion, Luxury, Development, Innovation
- size_tier: exactly one of "1-50", "51-200", "201-1000", "1000+"
- description: a single sentence of no more than 20 words describing what the company does

Company name: ${company.name}
Known industries: ${company.industries?.join(', ') ?? 'unknown'}
Employee count: ${company.employeeCount ?? 'unknown'}
Existing description: ${company.description ?? 'none'}

Respond with only the JSON object. No preamble, no markdown, no explanation.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text ?? '';
    return JSON.parse(text);
  } catch (err) {
    console.error(`Enrichment failed for ${company.name}:`, err);
    // Return safe fallback values so the insert still happens
    return {
      abbreviation: company.name.slice(0, 3).toUpperCase(),
      sector_tags: ['Conglomerate'],
      size_tier: '1000+',
      description: 'A UAE-based company.',
    };
  }
}

// Assign a logo color based on primary sector tag
const COLOR_MAP: Record<string, string> = {
  'Tech': '#0F52BA',
  'Finance': '#0F52BA',
  'Fintech': '#0F52BA',
  'Banking': '#0F52BA',
  'AI': '#5B7FD4',
  'Cloud': '#5B7FD4',
  'SaaS': '#5B7FD4',
  'Healthcare': '#A3E4DB',
  'Logistics': '#A3E4DB',
  'Education': '#A3E4DB',
  'Media': '#FF6B6B',
  'Events': '#FF6B6B',
  'Creative': '#FF6B6B',
  'Fashion': '#FF6B6B',
  'Luxury': '#FF6B6B',
  'Energy': '#FFA07A',
  'Real Estate': '#FFA07A',
  'Retail': '#FFA07A',
  'E-commerce': '#FFA07A',
  'Hospitality': '#FFA07A',
};

function pickLogoColor(tags: string[]): string {
  const primary = tags[0] ?? '';
  return COLOR_MAP[primary] ?? '#9B94E8';
}
