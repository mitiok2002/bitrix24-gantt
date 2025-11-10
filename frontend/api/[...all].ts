import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const tokenStorage = new Map<string, any>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Bitrix-Domain');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const allParam = req.query.all;
  const pathSegments = Array.isArray(allParam)
    ? allParam
    : typeof allParam === 'string' && allParam.length > 0
      ? allParam.split('/')
      : [];
  const path = pathSegments.join('/');
  console.log('Incoming path:', path, 'Method:', req.method, 'Query:', req.query);

  // GET /api/auth/bitrix24
  if (path === 'auth/bitrix24' && req.method === 'GET') {
    const { domain } = req.query;
    if (!domain) return res.status(400).json({ error: 'Domain is required' });
    
    const clientId = process.env.BITRIX24_CLIENT_ID;
    const redirectUri = process.env.BITRIX24_REDIRECT_URI;
    console.log('Auth request for domain', domain, 'redirectUri', redirectUri);
    const encodedRedirect = encodeURIComponent(redirectUri || '');
    const authUrl = `https://${domain}/oauth/authorize/?client_id=${clientId}&response_type=code&redirect_uri=${encodedRedirect}`;
    
    return res.json({ authUrl });
  }

  // POST /api/auth/callback
  if (path === 'auth/callback' && req.method === 'POST') {
    const { code, domain } = req.body;
    if (!code || !domain) return res.status(400).json({ error: 'Code and domain are required' });

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

  // Все остальные API endpoints требуют авторизации
  const authHeader = req.headers.authorization as string;
  const domain = req.headers['x-bitrix-domain'] as string;

  if (!authHeader || !domain) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.replace('Bearer ', '');

  // GET /api/tasks
  if (path === 'tasks' && req.method === 'GET') {
    try {
      const { start = 0, limit = 50 } = req.query;
      const response = await axios.post(
        `https://${domain}/rest/tasks.task.list.json`,
        {
          auth: token,
          filter: {},
          select: ['ID', 'TITLE', 'DESCRIPTION', 'STATUS', 'RESPONSIBLE_ID', 'CREATED_DATE', 'DEADLINE', 'START_DATE_PLAN', 'END_DATE_PLAN', 'CLOSED_DATE', 'GROUP_ID'],
          start,
          limit
        }
      );
      console.log('Tasks API result', response.data?.result?.tasks?.length ?? 'no tasks field', 'keys:', Object.keys(response.data || {}));
      return res.json(response.data);
    } catch (error: any) {
      console.error('Tasks API error:', error.response?.data || error.message);
      return res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  }

  // GET /api/departments
  if (path === 'departments' && req.method === 'GET') {
    try {
      const response = await axios.get(`https://${domain}/rest/department.get.json?auth=${token}`);
      return res.json(response.data);
    } catch (error: any) {
      console.error('Departments API error:', error.response?.data || error.message);
      return res.status(500).json({ error: 'Failed to fetch departments' });
    }
  }

  // GET /api/users
  if (path === 'users' && req.method === 'GET') {
    try {
      const { start = 0 } = req.query;
      const response = await axios.get(`https://${domain}/rest/user.get.json?auth=${token}&start=${start}`);
      return res.json(response.data);
    } catch (error: any) {
      console.error('Users API error:', error.response?.data || error.message);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  return res.status(404).json({ error: 'Not found', path });
}

