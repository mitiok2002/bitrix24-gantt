import { useEffect } from 'react';
import { Spin } from 'antd';

export const AuthCallback = () => {
  useEffect(() => {
    // Получаем код из URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
      // Отправляем код родительскому окну
      if (window.opener) {
        window.opener.postMessage(
          { type: 'bitrix-auth-success', code },
          window.location.origin
        );
      }
    }
  }, []);

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <Spin size="large" tip="Авторизация..." />
    </div>
  );
};


