const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { bsdPath, ...rest } = req.query;
  const queryParams = new URLSearchParams(rest).toString();
  const targetUrl = `https://sports.bzzoiro.com/api/${bsdPath || ''}${queryParams ? '?' + queryParams : ''}`;
  const apiKey = process.env.VITE_BSD_API_KEY;

  return new Promise((resolve) => {
    const reqOptions = new URL(targetUrl);
    https.request({
      hostname: reqOptions.hostname,
      path: reqOptions.pathname + reqOptions.search,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'Authorization': `Token ${apiKey}` })
      }
    }, (proxyRes) => {
      let data = '';
      proxyRes.on('data', chunk => data += chunk);
      proxyRes.on('end', () => {
        try { res.status(proxyRes.statusCode).json(JSON.parse(data)); }
        catch (e) { res.status(500).json({ error: data.slice(0, 200) }); }
        resolve();
      });
    }).on('error', err => {
      res.status(500).json({ error: err.message });
      resolve();
    }).end();
  });
};
