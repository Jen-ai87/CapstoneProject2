const https = require('https');
const url = require('url');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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

  return new Promise((resolve) => {
    const options = url.parse(targetUrl);
    options.method = 'GET';
    options.headers = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      options.headers['Authorization'] = `Token ${apiKey}`;
    }

    const proxyReq = https.request(options, (proxyRes) => {
      let data = '';
      proxyRes.on('data', (chunk) => { data += chunk; });
      proxyRes.on('end', () => {
        try {
          const json = JSON.parse(data);
          res.status(proxyRes.statusCode).json(json);
        } catch (e) {
          res.status(500).json({ error: 'Invalid JSON from upstream', raw: data.slice(0, 200) });
        }
        resolve();
      });
    });

    proxyReq.on('error', (err) => {
      res.status(500).json({ error: 'Proxy request failed', message: err.message });
      resolve();
    });

    proxyReq.end();
  });
};
