/**
 * Vercel Serverless Proxy for BSD API (sports.bzzoiro.com)
 *
 * Proxies all /api/* requests from the browser to the BSD API server-side,
 * attaching the Authorization header securely and bypassing CORS restrictions.
 *
 * e.g. GET /api/live/        → https://sports.bzzoiro.com/api/live/
 *      GET /api/events/?league=8 → https://sports.bzzoiro.com/api/events/?league=8
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle preflight CORS requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    return res.status(200).end();
  }

  // Build the path from the catch-all [...path] segments
  const pathSegments = req.query.path || [];
  const path = Array.isArray(pathSegments)
    ? pathSegments.join('/')
    : pathSegments;

  // Forward all query params except the internal 'path' routing param
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path') continue;
    if (Array.isArray(value)) {
      value.forEach((v) => queryParams.append(key, v));
    } else {
      queryParams.append(key, value);
    }
  }

  const qs = queryParams.toString();
  // Always include trailing slash — BSD API requires it
  const targetUrl = `https://sports.bzzoiro.com/api/${path}/${qs ? '?' + qs : ''}`;

  // Attach the API key server-side (never exposed to the browser)
  const apiKey = process.env.VITE_BSD_API_KEY;
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Token ${apiKey}`;
  }

  try {
    const upstream = await fetch(targetUrl, { method: 'GET', headers });
    const data = await upstream.json();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error('[proxy] error fetching', targetUrl, err);
    res.status(500).json({ error: 'Proxy error', message: String(err) });
  }
}
