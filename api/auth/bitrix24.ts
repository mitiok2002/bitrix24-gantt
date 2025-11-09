import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { domain } = req.query;
  
  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  const clientId = process.env.BITRIX24_CLIENT_ID;
  const redirectUri = process.env.BITRIX24_REDIRECT_URI;
  const authUrl = `https://${domain}/oauth/authorize/?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}`;
  
  return res.json({ authUrl });
}

