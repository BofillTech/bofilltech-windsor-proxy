// Vercel Serverless Function — Windsor.ai Proxy
// Bypasses CORS by making server-side requests to Windsor.ai
// Windsor API key stored securely as Vercel environment variable
//
// Usage: GET /api/windsor?connector=google_ads&fields=search_term,campaign,spend,clicks,conversions&date_preset=last_30d&accounts=853-398-5478
//
// Environment variable required: WINDSOR_API_KEY

export default async function handler(req, res) {
  // CORS headers — allow bofilltech.com and localhost for testing
  const origin = req.headers.origin || '';
  const allowed = ['https://bofilltech.com', 'https://www.bofilltech.com', 'http://localhost:3000'];
  const corsOrigin = allowed.includes(origin) ? origin : 'https://bofilltech.com';
  
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.WINDSOR_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'WINDSOR_API_KEY not configured' });

  const { connector, fields, accounts, date_preset, date_from, date_to } = req.query;

  if (!connector || !fields) {
    return res.status(400).json({ error: 'Missing required params: connector, fields' });
  }

  // Build Windsor.ai REST API URL
  const params = new URLSearchParams({
    api_key: apiKey,
    connector: connector,
    fields: fields,
  });

  if (accounts) params.append('accounts', accounts);
  if (date_preset) params.append('date_preset', date_preset);
  if (date_from) params.append('date_from', date_from);
  if (date_to) params.append('date_to', date_to);

  const windsorUrl = `https://connectors.windsor.ai/all?${params.toString()}`;

  try {
    const response = await fetch(windsorUrl);

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({
        error: 'Windsor API error',
        status: response.status,
        detail: text.substring(0, 500)
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({
      error: 'Proxy fetch failed',
      message: err.message
    });
  }
}
