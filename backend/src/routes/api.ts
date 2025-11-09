import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

// Middleware для проверки авторизации
const authenticateBitrix = async (req: Request, res: Response, next: any) => {
  const authHeader = req.headers.authorization;
  const domain = req.headers['x-bitrix-domain'] as string;

  if (!authHeader || !domain) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.replace('Bearer ', '');
  req.bitrix = { token, domain };
  next();
};

router.use(authenticateBitrix);

// Получение списка задач
router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const { token, domain } = req.bitrix!;
    const { start = 0, limit = 50 } = req.query;

    const response = await axios.post(
      `https://${domain}/rest/tasks.task.list.json`,
      {
        filter: {},
        select: [
          'ID',
          'TITLE',
          'DESCRIPTION',
          'STATUS',
          'RESPONSIBLE_ID',
          'CREATED_DATE',
          'DEADLINE',
          'START_DATE_PLAN',
          'END_DATE_PLAN',
          'CLOSED_DATE',
          'GROUP_ID'
        ],
        start,
        limit
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    res.json(response.data);
  } catch (error: any) {
    console.error('Tasks API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Получение структуры подразделений
router.get('/departments', async (req: Request, res: Response) => {
  try {
    const { token, domain } = req.bitrix!;

    const response = await axios.get(
      `https://${domain}/rest/department.get.json?auth=${token}`
    );

    res.json(response.data);
  } catch (error: any) {
    console.error('Departments API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Получение списка пользователей
router.get('/users', async (req: Request, res: Response) => {
  try {
    const { token, domain } = req.bitrix!;
    const { start = 0 } = req.query;

    const response = await axios.get(
      `https://${domain}/rest/user.get.json?auth=${token}&start=${start}`
    );

    res.json(response.data);
  } catch (error: any) {
    console.error('Users API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Типизация для Request
declare global {
  namespace Express {
    interface Request {
      bitrix?: {
        token: string;
        domain: string;
      };
    }
  }
}

export default router;


