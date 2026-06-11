/// <reference path="./deno.d.ts" />

// ============================================================
// FILE: supabase/functions/submit-match/index.ts
// PURPOSE: Server-side gap-based ELO (30-point brackets, two's)
// HOW TO DEPLOY: Run `supabase functions deploy submit-match`
//
// Body: { player1_id, player2_id, winner_id?, is_draw?: boolean, void_no_moves?: boolean }
// - Win: winner_id required, is_draw false/absent
// - Draw: is_draw true; winner_id ignored — no wins/losses
// - void_no_moves + is_draw: no DB updates, no winner/loser (match abandoned with empty board)
// ============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

type MgProfile = {
  id: string;
  elo: number;
  school_id: string | null;
  wins: number;
  losses: number;
  win_streak?: number | null;
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function touchPlayersActivity(playerIds: string[]) {
  const unique = [...new Set(playerIds.filter(Boolean))];
  if (unique.length === 0) return;
  const now = new Date().toISOString();
  await supabase
    .from("mg_profiles")
    .update({ last_active_at: now })
    .in("id", unique);
}

/** Bracket index: 0 = gap 0–30, 1 = 31–60, 2 = 61–90, … */
function eloBandFromGap(gap: number): number {
  if (gap <= 30) return 0;
  return Math.floor((gap - 1) / 30);
}

/** Win: symmetric ±mag (two's). */
function eloWinChanges(
  winnerElo: number,
  loserElo: number
): { winnerChange: number; loserChange: number } {
  const gap = Math.abs(winnerElo - loserElo);
  const band = eloBandFromGap(gap);
  let mag: number;
  if (winnerElo === loserElo) {
    mag = 10;
  } else if (winnerElo < loserElo) {
    mag = 10 + 2 * band;
  } else {
    mag = band === 0 ? 10 : Math.max(2, 10 - 2 * band);
  }
  return { winnerChange: mag, loserChange: -mag };
}

/** Draw: lower +2×band, higher −2×band; band 0 → 0/0. */
function eloDrawChanges(
  elo1: number,
  elo2: number
): { p1: number; p2: number } {
  const gap = Math.abs(elo1 - elo2);
  const band = eloBandFromGap(gap);
  if (band === 0) return { p1: 0, p2: 0 };
  const d = 2 * band;
  if (elo1 < elo2) return { p1: d, p2: -d };
  if (elo2 < elo1) return { p1: -d, p2: d };
  return { p1: 0, p2: 0 };
}

Deno.serve(async (req) => {
  const body = await req.json();
  const { player1_id, player2_id, winner_id, is_draw, void_no_moves } = body as {
    player1_id: string;
    player2_id: string;
    winner_id?: string;
    is_draw?: boolean;
    void_no_moves?: boolean;
  };

  const draw = is_draw === true;
  const voidNoMoves = void_no_moves === true;

  if (player1_id && player2_id) {
    await touchPlayersActivity([player1_id, player2_id]);
  }

  if (draw && voidNoMoves) {
    return new Response(
      JSON.stringify({
        isDraw: true,
        voidNoMoves: true,
        player1Change: 0,
        player2Change: 0,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  // Prevent double-recording when the same result is submitted twice (retry / race).
  // Must NOT block legitimate rematches between the same two players.
  const DUPLICATE_SUBMIT_WINDOW_MS = 45_000;
  const recentCutoff = new Date(
    Date.now() - DUPLICATE_SUBMIT_WINDOW_MS,
  ).toISOString();
  const { data: recentRows } = await supabase
    .from("mg_matches")
    .select(
      "winner_id, player1_id, player2_id, player1_elo_change, player2_elo_change, created_at",
    )
    .or(
      `and(player1_id.eq.${player1_id},player2_id.eq.${player2_id}),and(player1_id.eq.${player2_id},player2_id.eq.${player1_id})`,
    )
    .gte("created_at", recentCutoff)
    .order("created_at", { ascending: false })
    .limit(1);

  const recent = recentRows?.[0];
  if (recent) {
    const recordedWinner = recent.winner_id as string | null;
    const recentWasDraw = recordedWinner == null;

    if (draw && recentWasDraw) {
      return new Response(
        JSON.stringify({
          isDraw: true,
          duplicate: true,
          player1Change: recent.player1_elo_change ?? 0,
          player2Change: recent.player2_elo_change ?? 0,
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    if (!draw && recordedWinner && recordedWinner === winner_id) {
      const winnerIsP1 = recordedWinner === player1_id;
      const winnerChange = winnerIsP1
        ? (recent.player1_elo_change as number)
        : (recent.player2_elo_change as number);
      const loserChange = winnerIsP1
        ? (recent.player2_elo_change as number)
        : (recent.player1_elo_change as number);
      return new Response(
        JSON.stringify({
          isDraw: false,
          duplicate: true,
          winner_id: recordedWinner,
          winnerChange,
          loserChange,
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }
  }

  const { data: players, error } = await supabase
    .from("mg_profiles")
    .select("id, elo, school_id, wins, losses, win_streak")
    .in("id", [player1_id, player2_id]);

  if (error || !players || players.length < 2) {
    return new Response(JSON.stringify({ error: "Players not found" }), {
      status: 400,
    });
  }

  const p1 = players.find((p: MgProfile) => p.id === player1_id)!;
  const p2 = players.find((p: MgProfile) => p.id === player2_id)!;

  if (draw) {
    const { p1: d1, p2: d2 } = eloDrawChanges(p1.elo, p2.elo);

    await supabase
      .from("mg_profiles")
      .update({ elo: Math.max(0, p1.elo + d1) })
      .eq("id", p1.id);
    await supabase
      .from("mg_profiles")
      .update({ elo: Math.max(0, p2.elo + d2) })
      .eq("id", p2.id);

    const school_id = p1.school_id ?? p2.school_id;
    // winner_id null = draw (requires nullable winner_id on mg_matches)
    await supabase.from("mg_matches").insert({
      player1_id,
      player2_id,
      winner_id: null,
      player1_elo_change: d1,
      player2_elo_change: d2,
      school_id,
    });

    return new Response(
      JSON.stringify({
        isDraw: true,
        winnerChange: 0,
        loserChange: 0,
        player1Change: d1,
        player2Change: d2,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  if (!winner_id) {
    return new Response(
      JSON.stringify({ error: "winner_id required unless is_draw is true" }),
      { status: 400 }
    );
  }

  const winner = players.find((p: MgProfile) => p.id === winner_id)!;
  const loser = players.find((p: MgProfile) => p.id !== winner_id)!;

  const { winnerChange, loserChange } = eloWinChanges(winner.elo, loser.elo);

  await supabase
    .from("mg_profiles")
    .update({
      elo: winner.elo + winnerChange,
      wins: winner.wins + 1,
      win_streak: (winner.win_streak ?? 0) + 1,
    })
    .eq("id", winner.id);

  await supabase
    .from("mg_profiles")
    .update({
      elo: Math.max(0, loser.elo + loserChange),
      losses: loser.losses + 1,
      win_streak: 0,
    })
    .eq("id", loser.id);

  const school_id = winner.school_id ?? loser.school_id;
  await supabase.from("mg_matches").insert({
    player1_id,
    player2_id,
    winner_id,
    player1_elo_change: player1_id === winner_id ? winnerChange : loserChange,
    player2_elo_change: player2_id === winner_id ? winnerChange : loserChange,
    school_id,
  });

  return new Response(
    JSON.stringify({ winnerChange, loserChange, isDraw: false }),
    { headers: { "Content-Type": "application/json" } }
  );
});
