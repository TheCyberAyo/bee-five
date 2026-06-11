import { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { sendFcmV1 } from "./fcm_v1.ts";

export function stringifyFcmData(
  data: Record<string, unknown> | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!data) return out;
  for (const [key, value] of Object.entries(data)) {
    if (value != null) out[key] = String(value);
  }
  return out;
}

/** Deliver FCM to every device token registered for [userId]. */
export async function pushToUser(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<void> {
  const { data: tokenRows } = await supabase
    .from("mg_push_tokens")
    .select("fcm_token")
    .eq("user_id", userId);

  const tokens = (tokenRows ?? [])
    .map((r) => r.fcm_token as string)
    .filter((t) => t?.length > 0);

  await sendFcmV1(tokens, title, body, data);
}

/** Insert in-app notification row and send FCM (offline delivery). */
export async function notifyUser(
  supabase: SupabaseClient,
  userId: string,
  type: string,
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<void> {
  await supabase.from("mg_notifications").insert({
    user_id: userId,
    type,
    title,
    body,
    data,
  });

  await pushToUser(supabase, userId, title, body, data);
}

/** Push for the newest in-app row already inserted for [userId] + [type]. */
export async function pushForLatestNotification(
  supabase: SupabaseClient,
  userId: string,
  type: string,
): Promise<void> {
  const { data: row } = await supabase
    .from("mg_notifications")
    .select("title, body, data")
    .eq("user_id", userId)
    .eq("type", type)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return;

  await pushToUser(
    supabase,
    userId,
    row.title as string,
    row.body as string,
    stringifyFcmData(row.data as Record<string, unknown>),
  );
}
