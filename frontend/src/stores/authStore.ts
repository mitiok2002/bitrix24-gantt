import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  sessionId: string | null;
  accessToken: string | null;
  domain: string | null;
  isAuthenticated: boolean;
  setAuth: (sessionId: string, accessToken: string, domain: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      sessionId: null,
      accessToken: null,
      domain: null,
      isAuthenticated: false,
      setAuth: (sessionId, accessToken, domain) =>
        set({
          sessionId,
          accessToken,
          domain,
          isAuthenticated: true
        }),
      clearAuth: () =>
        set({
          sessionId: null,
          accessToken: null,
          domain: null,
          isAuthenticated: false
        })
    }),
    {
      name: 'bitrix-auth-storage'
    }
  )
);


