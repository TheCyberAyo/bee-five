/**
 * PostgREST / RPC calls with an explicit JWT from React AuthContext.
 * Used when the Supabase JS client's getSession() lags behind sign-in.
 */

function supabaseRestConfig(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export async function callEdgeFunctionWithToken<T>(
  functionName: string,
  body: Record<string, unknown>,
  accessToken: string,
): Promise<{ data: T | null; error: string | null; status: number }> {
  const cfg = supabaseRestConfig();
  if (!cfg) {
    return { data: null, error: 'Supabase is not configured', status: 0 };
  }

  const res = await fetch(`${cfg.url}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      apikey: cfg.anonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    return {
      data: null,
      error: text || `Function ${functionName} failed (${res.status})`,
      status: res.status,
    };
  }

  if (!text) {
    return { data: null, error: null, status: res.status };
  }

  try {
    return { data: JSON.parse(text) as T, error: null, status: res.status };
  } catch {
    return { data: null, error: `Invalid JSON from function ${functionName}`, status: res.status };
  }
}

export async function callRpcWithToken<T>(
  rpcName: string,
  args: Record<string, unknown>,
  accessToken: string,
): Promise<{ data: T | null; error: string | null; status: number }> {
  const cfg = supabaseRestConfig();
  if (!cfg) {
    return { data: null, error: 'Supabase is not configured', status: 0 };
  }

  const res = await fetch(`${cfg.url}/rest/v1/rpc/${rpcName}`, {
    method: 'POST',
    headers: {
      apikey: cfg.anonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });

  const text = await res.text();
  if (!res.ok) {
    return {
      data: null,
      error: text || `RPC ${rpcName} failed (${res.status})`,
      status: res.status,
    };
  }

  if (!text) {
    return { data: null, error: null, status: res.status };
  }

  try {
    return { data: JSON.parse(text) as T, error: null, status: res.status };
  } catch {
    return { data: null, error: `Invalid JSON from RPC ${rpcName}`, status: res.status };
  }
}
