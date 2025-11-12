// @ts-nocheck
import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";

type SessionData = {
  access_token: string;
  refresh_token: string;
  domain: string;
};

const tokenStorage = new Map<string, SessionData>();
const OAUTH_URL = "https://oauth.bitrix.info/oauth/token/";

const BITRIX24_CLIENT_ID = process.env.BITRIX24_CLIENT_ID ?? "";
const BITRIX24_CLIENT_SECRET = process.env.BITRIX24_CLIENT_SECRET ?? "";
const BITRIX24_REDIRECT_URI = process.env.BITRIX24_REDIRECT_URI ?? "";

const getHeaderValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const isExpiredTokenError = (error: any) =>
  error?.response?.data?.error === "expired_token";

const refreshAccessToken = async (refreshToken: string) => {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: BITRIX24_CLIENT_ID,
    client_secret: BITRIX24_CLIENT_SECRET,
    refresh_token: refreshToken,
  });

  const response = await axios.post(OAUTH_URL, params.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  return response.data;
};

type BitrixResult<T> =
  | { success: true; data: T; newAccessToken?: string }
  | { success: false; status: number; body: any };

const executeBitrixRequest = async <T>(
  sessionId: string,
  domain: string,
  executor: (token: string) => Promise<T>,
  latestToken?: string
): Promise<BitrixResult<T>> => {
  let session = tokenStorage.get(sessionId);
  if (!session) {
    return { success: false, status: 401, body: { error: "Unauthorized" } };
  }

  if (session.domain !== domain) {
    return {
      success: false,
      status: 403,
      body: { error: "Domain mismatch" },
    };
  }

  if (latestToken && latestToken !== session.access_token) {
    session = { ...session, access_token: latestToken };
    tokenStorage.set(sessionId, session);
  }

  let accessToken = session.access_token;

  const run = (token: string) => executor(token);

  try {
    const data = await run(accessToken);
    return { success: true, data };
  } catch (error: any) {
    if (!isExpiredTokenError(error) || !session.refresh_token) {
      const status =
        typeof error?.response?.status === "number"
          ? error.response.status
          : 500;
      const details =
        error?.response?.data || error?.message || "Unknown error";
      console.error("Bitrix API error:", details);
      return { success: false, status, body: details };
    }

    try {
      const refreshResponse = await refreshAccessToken(session.refresh_token);
      if (!refreshResponse?.access_token) {
        throw new Error("Missing access_token in refresh response");
      }

      accessToken = refreshResponse.access_token;
      const updatedSession: SessionData = {
        access_token: refreshResponse.access_token,
        refresh_token: refreshResponse.refresh_token ?? session.refresh_token,
        domain: session.domain,
      };
      tokenStorage.set(sessionId, updatedSession);

      const data = await run(accessToken);
      return { success: true, data, newAccessToken: accessToken };
    } catch (refreshError: any) {
      console.error(
        "Token refresh failed:",
        refreshError?.response?.data || refreshError?.message
      );
      tokenStorage.delete(sessionId);
      return {
        success: false,
        status: 401,
        body: { error: "token_expired", message: "Session expired" },
      };
    }
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Bitrix-Domain, X-Session-Id"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const allParam = req.query.all;
  const pathSegments = Array.isArray(allParam)
    ? allParam
    : typeof allParam === "string" && allParam.length > 0
    ? allParam.split("/")
    : [];
  const path = pathSegments.join("/");
  console.log(
    "Incoming path:",
    path,
    "Method:",
    req.method,
    "Query:",
    req.query
  );

  // GET /api/auth/bitrix24
  if (path === "auth/bitrix24" && req.method === "GET") {
    const { domain } = req.query;
    if (!domain) return res.status(400).json({ error: "Domain is required" });

    const encodedRedirect = encodeURIComponent(BITRIX24_REDIRECT_URI || "");
    const authUrl = `https://${domain}/oauth/authorize/?client_id=${BITRIX24_CLIENT_ID}&response_type=code&redirect_uri=${encodedRedirect}`;

    return res.json({ authUrl });
  }

  // POST /api/auth/callback
  if (path === "auth/callback" && req.method === "POST") {
    const { code, domain } = req.body;
    if (!code || !domain)
      return res.status(400).json({ error: "Code and domain are required" });

    try {
      const params = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: BITRIX24_CLIENT_ID,
        client_secret: BITRIX24_CLIENT_SECRET,
        code,
        redirect_uri: BITRIX24_REDIRECT_URI,
      });

      const response = await axios.post(OAUTH_URL, params.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 8000,
      });

      console.log("Token exchange raw response", response.data);
      const { access_token, refresh_token } = response.data;
      if (!access_token) {
        console.error("Access token missing in response", response.data);
        return res.status(500).json({
          error: "Authentication failed",
          details: response.data,
        });
      }
      const sessionId = `session_${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}`;
      tokenStorage.set(sessionId, { access_token, refresh_token, domain });

      return res.json({ sessionId, access_token });
    } catch (error: any) {
      const details = error.response?.data || error.message;
      console.error("OAuth error:", details);
      return res
        .status(error.response?.status || 500)
        .json({ error: "Authentication failed", details });
    }
  }

  // Все остальные API endpoints требуют авторизации
  const authHeader = getHeaderValue(req.headers.authorization);
  const domainHeader = getHeaderValue(req.headers["x-bitrix-domain"]);
  const sessionHeader = getHeaderValue(req.headers["x-session-id"]);

  if (!authHeader || !domainHeader || !sessionHeader) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.replace("Bearer ", "");
  const domain = domainHeader;
  const sessionId = sessionHeader;

  // GET /api/tasks
  if (path === "tasks" && req.method === "GET") {
    try {
      const { start = "0", limit = "50" } = req.query;
      const startNum = Number(start);
      const limitNumRaw = Number(limit);
      const limitNum = Number.isNaN(limitNumRaw) ? 50 : limitNumRaw;
      const maxIterations = 40; // ~2000 задач

      const result = await executeBitrixRequest(
        sessionId,
        domain,
        async (accessToken) => {
          let next = Number.isNaN(startNum) ? 0 : startNum;
          let iteration = 0;
          const allTasks: any[] = [];
          let total: number | undefined;

          while (iteration < maxIterations) {
            const response = await axios.post(
              `https://${domain}/rest/tasks.task.list.json`,
              {
                auth: accessToken,
                filter: {},
                select: [
                  "ID",
                  "TITLE",
                  "DESCRIPTION",
                  "STATUS",
                  "RESPONSIBLE_ID",
                  "CREATED_DATE",
                  "DEADLINE",
                  "START_DATE_PLAN",
                  "END_DATE_PLAN",
                  "CLOSED_DATE",
                  "GROUP_ID",
                  "description",
                  "responsibleId",
                  "startDatePlan",
                  "endDatePlan",
                  "createdDate",
                  "deadline",
                ],
                start: next,
                limit: limitNum,
              }
            );

            const data = response.data || {};
            const tasksChunk = Array.isArray(data.result?.tasks)
              ? data.result.tasks
              : Array.isArray(data.result)
              ? data.result
              : [];

            allTasks.push(...tasksChunk);

            if (total === undefined && typeof data.total === "number") {
              total = data.total;
            }

            if (data.next === undefined || data.next === null) {
              break;
            }

            next = Number(data.next);
            if (!Number.isFinite(next)) {
              break;
            }

            iteration += 1;
          }

          return { tasks: allTasks, total };
        },
        token
      );

      if (!result.success) {
        if (
          result.status === 401 &&
          typeof result.body === "object" &&
          result.body?.error === "token_expired"
        ) {
          return res.status(401).json(result.body);
        }

        return res
          .status(result.status)
          .json({ error: "Failed to fetch tasks", details: result.body });
      }

      if (result.newAccessToken) {
        res.setHeader("X-New-Access-Token", result.newAccessToken);
      }

      return res.json({
        result: {
          tasks: result.data.tasks,
        },
        total: result.data.total,
      });
    } catch (error: any) {
      console.error("Tasks API error:", error.response?.data || error.message);
      return res.status(500).json({ error: "Failed to fetch tasks" });
    }
  }

  // GET /api/departments
  if (path === "departments" && req.method === "GET") {
    try {
      const result = await executeBitrixRequest(
        sessionId,
        domain,
        async (accessToken) => {
          const response = await axios.get(
            `https://${domain}/rest/department.get.json?auth=${accessToken}`
          );
          return response.data;
        },
        token
      );

      if (!result.success) {
        if (
          result.status === 401 &&
          typeof result.body === "object" &&
          result.body?.error === "token_expired"
        ) {
          return res.status(401).json(result.body);
        }

        return res
          .status(result.status)
          .json({ error: "Failed to fetch departments", details: result.body });
      }

      if (result.newAccessToken) {
        res.setHeader("X-New-Access-Token", result.newAccessToken);
      }

      return res.json(result.data);
    } catch (error: any) {
      console.error(
        "Departments API error:",
        error.response?.data || error.message
      );
      return res.status(500).json({ error: "Failed to fetch departments" });
    }
  }

  // GET /api/users
  if (path === "users" && req.method === "GET") {
    try {
      const { start = 0 } = req.query;
      const result = await executeBitrixRequest(
        sessionId,
        domain,
        async (accessToken) => {
          const response = await axios.get(
            `https://${domain}/rest/user.get.json?auth=${accessToken}&start=${start}`
          );
          return response.data;
        },
        token
      );

      if (!result.success) {
        if (
          result.status === 401 &&
          typeof result.body === "object" &&
          result.body?.error === "token_expired"
        ) {
          return res.status(401).json(result.body);
        }

        return res
          .status(result.status)
          .json({ error: "Failed to fetch users", details: result.body });
      }

      if (result.newAccessToken) {
        res.setHeader("X-New-Access-Token", result.newAccessToken);
      }

      return res.json(result.data);
    } catch (error: any) {
      console.error("Users API error:", error.response?.data || error.message);
      return res.status(500).json({ error: "Failed to fetch users" });
    }
  }

  return res.status(404).json({ error: "Not found", path });
