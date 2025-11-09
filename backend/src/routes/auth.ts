import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

// Временное хранилище токенов (в продакшене использовать Redis/БД)
const tokenStorage = new Map<string, { access_token: string; refresh_token: string; domain: string }>();

// Инициация OAuth авторизации
router.get('/bitrix24', (req: Request, res: Response) => {
  const { domain } = req.query;
  
  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  const clientId = process.env.BITRIX24_CLIENT_ID;
  const redirectUri = process.env.BITRIX24_REDIRECT_URI;

  const authUrl = `https://${domain}/oauth/authorize/?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}`;
  
  res.json({ authUrl });
});

// Callback после авторизации
router.post('/callback', async (req: Request, res: Response) => {
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

    // Генерируем session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Сохраняем токены
    tokenStorage.set(sessionId, { access_token, refresh_token, domain });

    res.json({ sessionId, access_token });
  } catch (error: any) {
    console.error('OAuth error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Получение токена по session ID
router.get('/token/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = tokenStorage.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json(session);
});

export default router;


