/// <reference path="./deno.d.ts" />
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { ...cors, 'Content-Type': 'application/json' },
});

// Results are derived from a locked, durable game row. Player IDs, claimed wins,
// and Elo deltas in a request are never used as evidence of a victory.
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);
  try {
    const authorization = req.headers.get('Authorization') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const isService = authorization === `Bearer ${serviceKey}`;
    const client = createClient(Deno.env.get('SUPABASE_URL')!,
      isService ? serviceKey : Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authorization } },
      });
    let userId: string | null = null;
    if (!isService) {
      const { data, error } = await client.auth.getUser(authorization.replace(/^Bearer\s+/i, ''));
      if (error || !data.user) return json({ error: 'Sign in required' }, 401);
      userId = data.user.id;
    }
    const body = await req.json();
    if (typeof body.match_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.match_id)) {
      return json({ error: 'A stable match ID is required. Update the app.' }, 400);
    }
    const kind = body.match_kind === 'async' ? 'async' : 'live';
    if (isService && kind !== 'async') return json({ error: 'A player session is required' }, 403);
    const { data, error } = await client.rpc('mg_confirm_match_result', {
      p_match_id: body.match_id, p_kind: kind,
      p_resign: kind === 'live' && !!body.winner_id && body.winner_id !== userId,
      p_void: kind === 'live' && body.void_no_moves === true,
    });
    if (error) return json({ error: error.message }, 409);
    return json(data);
  } catch {
    return json({ error: 'Invalid match request' }, 400);
  }
});
