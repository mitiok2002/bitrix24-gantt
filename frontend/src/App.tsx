import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { useAuthStore } from './stores/authStore';
import { LoginPage } from './components/LoginPage';
import { AuthCallback } from './components/AuthCallback';
import { GanttPage } from './components/GanttPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <ConfigProvider locale={ruRU}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/gantt"
              element={isAuthenticated ? <GanttPage /> : <Navigate to="/" />}
            />
            <Route
              path="/"
              element={isAuthenticated ? <Navigate to="/gantt" /> : <LoginPage />}
            />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ConfigProvider>
  );
}

export default App;
