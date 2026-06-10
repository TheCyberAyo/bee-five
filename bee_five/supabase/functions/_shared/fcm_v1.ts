// Firebase Cloud Messaging HTTP v1 (Legacy API is disabled on new Firebase projects).

import { GoogleAuth } from "npm:google-auth-library@9";

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function parseServiceAccount(): ServiceAccount | null {
  const raw = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
  if (!raw?.trim()) return null;
  try {
    const json = JSON.parse(raw) as ServiceAccount;
    if (!json.project_id || !json.client_email || !json.private_key) {
      return null;
    }
    return json;
  } catch {
    return null;
  }
}

async function getAccessToken(creds: ServiceAccount): Promise<string | null> {
  try {
    const auth = new GoogleAuth({
      credentials: creds,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    return token.token ?? null;
  } catch {
    return null;
  }
}

/** Send push to device tokens via FCM v1. Best-effort; failures are ignored. */
export async function sendFcmV1(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<void> {
  const creds = parseServiceAccount();
  if (!creds || tokens.length === 0) return;

  const accessToken = await getAccessToken(creds);
  if (!accessToken) return;

  const url =
    `https://fcm.googleapis.com/v1/projects/${creds.project_id}/messages:send`;

  for (const token of tokens) {
    if (!token) continue;
    try {
      await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body },
            data,
            android: { priority: "HIGH" },
          },
        }),
      });
    } catch {
      // Notification row in Supabase is the source of truth if push fails.
    }
  }
}
