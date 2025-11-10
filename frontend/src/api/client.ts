import axios from 'axios';

const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');

export const api = axios.create({
  baseURL: API_URL
});

// Auth API
export const authApi = {
  getAuthUrl: async (domain: string) => {
    const response = await api.get('/api/auth/bitrix24', { params: { domain } });
    return response.data;
  },

  exchangeCode: async (code: string, domain: string) => {
    const response = await api.post('/api/auth/callback', { code, domain });
    return response.data;
  },

  getToken: async (sessionId: string) => {
    const response = await api.get(`/api/auth/token/${sessionId}`);
    return response.data;
  }
};

// Bitrix24 Data API
export const bitrixApi = {
  getTasks: async (token: string, domain: string, start = 0, limit = 50) => {
    const response = await api.get('/api/tasks', {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Bitrix-Domain': domain
      },
      params: { start, limit }
    });
    return response.data;
  },

  getDepartments: async (token: string, domain: string) => {
    const response = await api.get('/api/departments', {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Bitrix-Domain': domain
      }
    });
    return response.data;
  },

  getUsers: async (token: string, domain: string, start = 0) => {
    const response = await api.get('/api/users', {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Bitrix-Domain': domain
      },
      params: { start }
    });
    return response.data;
  }
};


