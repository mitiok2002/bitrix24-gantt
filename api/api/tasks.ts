import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Bitrix-Domain');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authHeader = req.headers.authorization as string;
  const domain = req.headers['x-bitrix-domain'] as string;

  if (!authHeader || !domain) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { start = 0, limit = 50 } = req.query;

  try {
    const response = await axios.post(
      `https://${domain}/rest/tasks.task.list.json`,
      {
        filter: {},
        select: ['ID', 'TITLE', 'DESCRIPTION', 'STATUS', 'RESPONSIBLE_ID', 'CREATED_DATE', 'DEADLINE', 'START_DATE_PLAN', 'END_DATE_PLAN', 'CLOSED_DATE', 'GROUP_ID'],
        start,
        limit
      },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    return res.json(response.data);
  } catch (error: any) {
    console.error('Tasks API error:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Failed to fetch tasks' });
  }
}

