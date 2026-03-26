const https = require('https');
const { parse } = require('url');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const pathSegments = req.query.path || [];
  const apiPath = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments;

  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path') continue;
    queryParams.append(key, value);
  }

  const qs = queryParams.toString();
  const targetUrl = `https://sports.bzzoiro.com/api/${apiPath}/${qs ? '?' + qs : ''}`;
  const apiKey = process.env.VITE_BSD_API_KEY;
  const parsed = parse(targetUrl);

  return new Promise((resolve) => {
    const proxyReq = https.request({
      hostname: parsed.hostname,
      path: parsed.path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Token ${apiKey}` } : {})
      }
    }, (proxyRes) => {
      let data = '';
      proxyRes.on('data', chunk => { data += chunk; });
      proxyRes.on('end', () => {
        try {
          res.status(proxyRes.statusCode).json(JSON.parse(data));
        } catch (e) {
          res.status(500).json({ error: 'Upstream error', raw: data.slice(0, 300) });
        }
        resolve();
      });
    });
    proxyReq.on('error', err => {
      res.status(500).json({ error: err.message });
      resolve();
    });
    proxyReq.end();
  });
};
