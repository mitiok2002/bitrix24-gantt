import axios, {
  AxiosHeaders,
  type AxiosError,
  type AxiosResponse,
} from "axios";
import { useAuthStore } from "../stores/authStore";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:3001");

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const { sessionId } = useAuthStore.getState();

  if (sessionId) {
    const headers =
      config.headers instanceof AxiosHeaders
        ? config.headers
        : AxiosHeaders.from(config.headers as unknown as AxiosHeaders);

    headers.set("X-Session-Id", sessionId);
    config.headers = headers;
  }

  return config;
});

api.interceptors.response.use(
  (response: AxiosResponse) => {
    const rawHeader = response.headers["x-new-access-token"];
    const headerToken = Array.isArray(rawHeader)
      ? rawHeader[0]
      : typeof rawHeader === "string"
      ? rawHeader
      : undefined;

    let bodyToken: string | undefined;
    const data = response.data as unknown;
    if (typeof data === "object" && data !== null && "newAccessToken" in data) {
      const newToken = (data as { newAccessToken?: unknown }).newAccessToken;
      if (typeof newToken === "string") {
        bodyToken = newToken;
      }
    }

    const newAccessToken = headerToken ?? bodyToken;

    if (newAccessToken) {
      const authState = useAuthStore.getState();

      if (
        authState.sessionId &&
        authState.domain &&
        authState.accessToken !== newAccessToken
      ) {
        authState.setAuth(
          authState.sessionId,
          newAccessToken,
          authState.domain
        );
      }
    }

    return response;
  },
  (error: AxiosError<{ error?: string }>) => {
    if (
      error.response?.status === 401 &&
      error.response?.data?.error === "token_expired"
    ) {
      const authState = useAuthStore.getState();
      authState.clearAuth();
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  getAuthUrl: async (domain: string) => {
    const response = await api.get("/api/auth/bitrix24", {
      params: { domain },
    });
    return response.data;
  },

  exchangeCode: async (code: string, domain: string) => {
    const response = await api.post("/api/auth/callback", { code, domain });
    return response.data;
  },

  getToken: async (sessionId: string) => {
    const response = await api.get(`/api/auth/token/${sessionId}`);
    return response.data;
  },
};

// Bitrix24 Data API
export const bitrixApi = {
  getTasks: async (token: string, domain: string, start = 0, limit = 50) => {
    const response = await api.get("/api/tasks", {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Bitrix-Domain": domain,
      },
      params: { start, limit },
    });
    return response.data;
  },

  getDepartments: async (token: string, domain: string) => {
    const response = await api.get("/api/departments", {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Bitrix-Domain": domain,
      },
    });
    return response.data;
  },

  getUsers: async (token: string, domain: string, start = 0) => {
    const response = await api.get("/api/users", {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Bitrix-Domain": domain,
      },
      params: { start },
    });
    return response.data;
  },
};
