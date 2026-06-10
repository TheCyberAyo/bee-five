// Validates and saves async match moves; 24h turn clock with forfeit.

// Deploy: supabase functions deploy async-game

// Body: { action: "save_move"|"sync_match", match_id, row?, col? }



import { createClient } from "jsr:@supabase/supabase-js@2";

import { sendFcmV1 } from "../_shared/fcm_v1.ts";



const supabase = createClient(

  Deno.env.get("SUPABASE_URL")!,

  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,

);



const BOARD_SIZE = 10;

const TURN_MS = 24 * 60 * 60 * 1000;



type Board = number[][];



type ForfeitRow = {

  match_id: string;

  winner_id: string;

  loser_id: string;

  player1_id: string;

  player2_id: string;

};



function emptyBoard(): Board {

  return Array.from({ length: BOARD_SIZE }, () =>

    Array(BOARD_SIZE).fill(0)

  );

}



function parseBoard(raw: unknown): Board {

  if (!Array.isArray(raw) || raw.length !== BOARD_SIZE) return emptyBoard();

  return raw.map((row) => {

    if (!Array.isArray(row) || row.length !== BOARD_SIZE) {

      return Array(BOARD_SIZE).fill(0);

    }

    return row.map((c) => (c === 1 || c === 2 ? c : 0));

  });

}



function boardFull(board: Board): boolean {

  for (let r = 0; r < BOARD_SIZE; r++) {

    for (let c = 0; c < BOARD_SIZE; c++) {

      if (board[r][c] === 0) return false;

    }

  }

  return true;

}



function checkWin(board: Board, row: number, col: number, seat: number): boolean {

  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];

  for (const [dx, dy] of dirs) {

    let count = 1;

    for (let i = 1; i < 5; i++) {

      const nr = row + i * dx;

      const nc = col + i * dy;

      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) break;

      if (board[nr][nc] !== seat) break;

      count++;

    }

    for (let i = 1; i < 5; i++) {

      const nr = row - i * dx;

      const nc = col - i * dy;

      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) break;

      if (board[nr][nc] !== seat) break;

      count++;

    }

    if (count >= 5) return true;

  }

  return false;

}



function seatForUser(

  player1Id: string,

  player2Id: string,

  userId: string,

): 1 | 2 | null {

  if (userId === player1Id) return 1;

  if (userId === player2Id) return 2;

  return null;

}



function winnerUserId(

  player1Id: string,

  player2Id: string,

  seat: number,

): string {

  return seat === 1 ? player1Id : player2Id;

}



function nextTurnDeadline(): string {

  return new Date(Date.now() + TURN_MS).toISOString();

}



async function notifyUser(

  userId: string,

  type: string,

  title: string,

  body: string,

  data: Record<string, string>,

) {

  await supabase.from("mg_notifications").insert({

    user_id: userId,

    type,

    title,

    body,

    data,

  });



  const { data: tokenRows } = await supabase

    .from("mg_push_tokens")

    .select("fcm_token")

    .eq("user_id", userId);



  const tokens = (tokenRows ?? [])

    .map((r) => r.fcm_token as string)

    .filter((t) => t?.length > 0);



  await sendFcmV1(tokens, title, body, data);

}



async function submitForfeitStats(

  player1Id: string,

  player2Id: string,

  winnerId: string,

) {

  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/submit-match`;

  try {

    await fetch(url, {

      method: "POST",

      headers: {

        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,

        "Content-Type": "application/json",

      },

      body: JSON.stringify({

        player1_id: player1Id,

        player2_id: player2Id,

        winner_id: winnerId,

      }),

    });

  } catch {

    // Stats can be retried when the client opens the finished match.

  }

}



async function applyExpiredForfeits(matchId?: string): Promise<ForfeitRow[]> {

  const { data, error } = await supabase.rpc("mg_forfeit_expired_async_turns", {

    p_match_id: matchId ?? null,

  });

  if (error) {

    console.error("forfeit rpc failed", error.message);

    return [];

  }



  const rows = (data ?? []) as ForfeitRow[];

  for (const row of rows) {

    await submitForfeitStats(row.player1_id, row.player2_id, row.winner_id);

  }

  return rows;

}



function matchPayload(match: Record<string, unknown>) {

  return {

    id: match.id,

    status: match.status,

    board: match.board,

    current_seat: match.current_seat,

    winner_id: match.winner_id,

    turn_deadline_at: match.turn_deadline_at,

  };

}



async function loadMatch(matchId: string) {

  const { data, error } = await supabase

    .from("mg_async_matches")

    .select("*")

    .eq("id", matchId)

    .maybeSingle();

  if (error || !data) return null;

  return data as Record<string, unknown>;

}



Deno.serve(async (req) => {

  if (req.method !== "POST") {

    return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });

  }



  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {

    return new Response(JSON.stringify({ error: "Unauthorized" }), {

      status: 401,

    });

  }



  const userClient = createClient(

    Deno.env.get("SUPABASE_URL")!,

    Deno.env.get("SUPABASE_ANON_KEY")!,

    { global: { headers: { Authorization: authHeader } } },

  );

  const { data: authData, error: authError } = await userClient.auth.getUser();

  if (authError || !authData.user) {

    return new Response(JSON.stringify({ error: "Unauthorized" }), {

      status: 401,

    });

  }

  const userId = authData.user.id;



  const body = await req.json();

  const action = body.action as string;

  const matchId = body.match_id as string;



  if (!matchId) {

    return new Response(JSON.stringify({ error: "match_id required" }), {

      status: 400,

    });

  }



  if (action === "sync_match") {

    await applyExpiredForfeits(matchId);

    const match = await loadMatch(matchId);

    if (!match) {

      return new Response(JSON.stringify({ error: "Match not found" }), {

        status: 404,

      });

    }

    const p1 = match.player1_id as string;

    const p2 = match.player2_id as string;

    if (userId !== p1 && userId !== p2) {

      return new Response(JSON.stringify({ error: "Not a participant" }), {

        status: 403,

      });

    }

    return new Response(

      JSON.stringify({ ok: true, match: matchPayload(match) }),

      { headers: { "Content-Type": "application/json" } },

    );

  }



  if (action !== "save_move") {

    return new Response(JSON.stringify({ error: "Unknown action" }), {

      status: 400,

    });

  }



  const row = Number(body.row);

  const col = Number(body.col);



  if (!Number.isInteger(row) || !Number.isInteger(col)) {

    return new Response(JSON.stringify({ error: "Invalid payload" }), {

      status: 400,

    });

  }

  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {

    return new Response(JSON.stringify({ error: "Out of bounds" }), {

      status: 400,

    });

  }



  await applyExpiredForfeits(matchId);



  let match = await loadMatch(matchId);

  if (!match) {

    return new Response(JSON.stringify({ error: "Match not found" }), {

      status: 404,

    });

  }



  if (match.status === "forfeited") {

    return new Response(

      JSON.stringify({

        error: "Time expired — this match was forfeited.",

        status: "forfeited",

        winner_id: match.winner_id,

      }),

      { status: 400 },

    );

  }



  if (match.status !== "active") {

    return new Response(JSON.stringify({ error: "Match is not active" }), {

      status: 400,

    });

  }



  const p1 = match.player1_id as string;

  const p2 = match.player2_id as string;

  const mySeat = seatForUser(p1, p2, userId);

  if (mySeat == null) {

    return new Response(JSON.stringify({ error: "Not a participant" }), {

      status: 403,

    });

  }



  const currentSeat = match.current_seat as number;

  if (currentSeat !== mySeat) {

    return new Response(JSON.stringify({ error: "Not your turn" }), {

      status: 400,

    });

  }



  const deadlineRaw = match.turn_deadline_at as string | null;

  if (deadlineRaw && new Date(deadlineRaw).getTime() <= Date.now()) {

    await applyExpiredForfeits(matchId);

    match = await loadMatch(matchId);

    return new Response(

      JSON.stringify({

        error: "Your 24-hour turn window expired.",

        status: match?.status ?? "forfeited",

        winner_id: match?.winner_id ?? null,

      }),

      { status: 400 },

    );

  }



  const board = parseBoard(match.board);

  if (board[row][col] !== 0) {

    return new Response(JSON.stringify({ error: "Cell occupied" }), {

      status: 400,

    });

  }



  board[row][col] = mySeat;

  const nextSeat = mySeat === 1 ? 2 : 1;



  let status = "active";

  let winnerId: string | null = null;

  let isDraw = false;



  if (checkWin(board, row, col, mySeat)) {

    status = "completed";

    winnerId = winnerUserId(p1, p2, mySeat);

  } else if (boardFull(board)) {

    status = "draw";

    isDraw = true;

  }



  const now = new Date().toISOString();

  const turnDeadline = status === "active" ? nextTurnDeadline() : null;



  const { error: updateError } = await supabase

    .from("mg_async_matches")

    .update({

      board,

      current_seat: status === "active" ? nextSeat : currentSeat,

      status,

      winner_id: winnerId,

      last_move_at: now,

      last_move_by: userId,

      completed_at: status !== "active" ? now : null,

      turn_deadline_at: turnDeadline,

    })

    .eq("id", matchId);



  if (updateError) {

    return new Response(JSON.stringify({ error: updateError.message }), {

      status: 500,

    });

  }



  const opponentId = userId === p1 ? p2 : p1;

  const { data: moverProfile } = await supabase

    .from("mg_profiles")

    .select("username")

    .eq("id", userId)

    .maybeSingle();

  const moverName = (moverProfile?.username as string)?.trim() || "Your opponent";



  let notifyBody: string;

  if (status === "completed") {

    notifyBody = `${moverName} won the async match.`;

  } else if (isDraw) {

    notifyBody = `Async match with ${moverName} ended in a draw.`;

  } else {

    notifyBody =

      `${moverName} saved a move. It's your turn — you have 24 hours.`;

  }



  await notifyUser(

    opponentId,

    status === "active" ? "async_move" : "async_match_over",

    status === "active" ? "Your turn" : "Async match finished",

    notifyBody,

    { match_id: matchId, type: status === "active" ? "async_move" : status },

  );



  return new Response(

    JSON.stringify({

      ok: true,

      board,

      current_seat: status === "active" ? nextSeat : currentSeat,

      status,

      winner_id: winnerId,

      is_draw: isDraw,

      turn_deadline_at: turnDeadline,

    }),

    { headers: { "Content-Type": "application/json" } },

  );

});


