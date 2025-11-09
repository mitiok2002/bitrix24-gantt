import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

// Временное хранилище (в продакшене использовать Redis)
const tokenStorage = new Map<string, any>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { code, domain } = req.body;

  if (!code || !domain) {
    return res.status(400).json({ error: 'Code and domain are required' });
  }

  try {
    const tokenUrl = `https://${domain}/oauth/token/`;
    const response = await axios.post(tokenUrl, {
      grant_type: 'authorization_code',
      client_id: process.env.BITRIX24_CLIENT_ID,
      client_secret: process.env.BITRIX24_CLIENT_SECRET,
      code,
      redirect_uri: process.env.BITRIX24_REDIRECT_URI
    });

    const { access_token, refresh_token } = response.data;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    tokenStorage.set(sessionId, { access_token, refresh_token, domain });

    return res.json({ sessionId, access_token });
  } catch (error: any) {
    console.error('OAuth error:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

