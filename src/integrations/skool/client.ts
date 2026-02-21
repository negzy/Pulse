/**
 * Skool API client (SkoolAPI.com – third-party API).
 * Docs: https://docs.skoolapi.com
 * All requests need X-Api-Secret and (for most endpoints) an active session.
 */

const BASE_URL = process.env.SKOOL_API_BASE_URL ?? "https://api.skoolapi.com";

function getApiSecret(): string {
  const secret = process.env.SKOOL_API_SECRET;
  if (!secret) throw new Error("SKOOL_API_SECRET is not set");
  return secret;
}

export type SessionOut = {
  id: string;
  status: "pending" | "active" | "refreshing" | "authentication_error" | "internal_error";
};

export type SessionIn = {
  email: string;
  password: string;
};

/**
 * Create a session (Skool account login). Required before using webhooks or other session-scoped endpoints.
 */
export async function createSession(credentials: SessionIn): Promise<SessionOut> {
  const res = await fetch(`${BASE_URL}/v1/sessions/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Secret": getApiSecret(),
    },
    body: JSON.stringify(credentials),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Skool API createSession failed: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * Get session status. Use to check if session is still active.
 */
export async function getSession(sessionId: string): Promise<SessionOut> {
  const res = await fetch(`${BASE_URL}/v1/sessions/${encodeURIComponent(sessionId)}`, {
    method: "GET",
    headers: { "X-Api-Secret": getApiSecret() },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Skool API getSession failed: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * Delete a session (logout).
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/v1/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
    headers: { "X-Api-Secret": getApiSecret() },
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`Skool API deleteSession failed: ${res.status} ${text}`);
  }
}

export type WebhookIn = {
  url: string;
  group: string;
  events: ("post" | "comment" | "group_stats" | "chat_update")[];
};

export type WebhookOut = { id: string };

/**
 * Create a webhook for a group. Events can include group_stats for metrics updates.
 */
export async function createWebhook(
  sessionId: string,
  payload: WebhookIn
): Promise<WebhookOut> {
  const url = new URL(`${BASE_URL}/v1/webhooks/`);
  url.searchParams.set("session_id", sessionId);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Secret": getApiSecret(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Skool API createWebhook failed: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * List webhooks for a session.
 */
export async function listWebhooks(sessionId: string): Promise<WebhookOut[]> {
  const url = new URL(`${BASE_URL}/v1/webhooks/`);
  url.searchParams.set("session_id", sessionId);
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { "X-Api-Secret": getApiSecret() },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Skool API listWebhooks failed: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * Delete a webhook.
 */
export async function deleteWebhook(webhookId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/v1/webhooks/${encodeURIComponent(webhookId)}`, {
    method: "DELETE",
    headers: { "X-Api-Secret": getApiSecret() },
  });
  if (!res.ok && res.status !== 200) {
    const text = await res.text();
    throw new Error(`Skool API deleteWebhook failed: ${res.status} ${text}`);
  }
}
