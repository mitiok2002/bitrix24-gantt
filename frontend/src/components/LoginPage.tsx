import { useState } from 'react';
import { Button, Input, Card, Typography, Space, message } from 'antd';
import { authApi } from '../api/client';
import { useAuthStore } from '../stores/authStore';

const { Title, Text } = Typography;

export const LoginPage = () => {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async () => {
    if (!domain) {
      message.error('Введите домен Bitrix24');
      return;
    }

    try {
      setLoading(true);
      const { authUrl } = await authApi.getAuthUrl(domain);
      
      // Открываем окно авторизации
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const authWindow = window.open(
        authUrl,
        'Bitrix24 Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Слушаем сообщения от окна авторизации
      const handleMessage = async (event: MessageEvent) => {
        if (event.data.type === 'bitrix-auth-success') {
          authWindow?.close();
          window.removeEventListener('message', handleMessage);

          try {
            const { code } = event.data;
            const { sessionId, access_token } = await authApi.exchangeCode(code, domain);
            setAuth(sessionId, access_token, domain);
            message.success('Авторизация успешна!');
          } catch (error) {
            message.error('Ошибка при обмене кода на токен');
            console.error(error);
          } finally {
            setLoading(false);
          }
        }
      };

      window.addEventListener('message', handleMessage);

      // Проверяем, не закрыто ли окно
      const checkClosed = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          setLoading(false);
        }
      }, 1000);
    } catch (error) {
      message.error('Ошибка при получении URL авторизации');
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card style={{ width: 400, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={2}>Bitrix24 Gantt</Title>
            <Text type="secondary">Диаграмма Ганта для ваших задач</Text>
          </div>

          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>Домен Bitrix24</Text>
              <Input
                placeholder="example.bitrix24.ru"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onPressEnter={handleLogin}
                size="large"
                style={{ marginTop: 8 }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Введите домен вашего Bitrix24 портала
              </Text>
            </div>

            <Button
              type="primary"
              size="large"
              block
              loading={loading}
              onClick={handleLogin}
            >
              Войти через Bitrix24
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  );
};


