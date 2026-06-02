// ============================================================
// FILE: lib/services/multiplayer_service.dart
// PURPOSE: Handles ALL realtime logic — presence, challenges,
//          live match events, and match result submission.
//
// HOW TO USE:
//   1. Call MultiplayerService() — it's a singleton
//   2. Call joinLobby() when player enters the school lobby screen
//   3. Call leaveLobby() when player leaves the lobby screen
//   4. Call joinMatch() when a match starts
//   5. Call leaveMatch() when a match ends
// ============================================================

import 'dart:async';
import 'dart:convert';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../auth/beefive_internal_auth.dart';
import '../models/online_dashboard_stats.dart';
import '../models/player_presence.dart';
import '../utils/country_data.dart';

/// Result of [MultiplayerService.joinSchool] for navigation after a successful join.
class JoinSchoolOutcome {
  final String? errorMessage;
  final String? schoolId;
  final String? userId;
  final String? username;
  final int? elo;

  bool get isSuccess =>
      errorMessage == null && schoolId != null && userId != null;

  const JoinSchoolOutcome._({
    this.errorMessage,
    this.schoolId,
    this.userId,
    this.username,
    this.elo,
  });

  factory JoinSchoolOutcome.failure(String message) =>
      JoinSchoolOutcome._(errorMessage: message);

  factory JoinSchoolOutcome.success({
    required String schoolId,
    required String userId,
    required String username,
    required int elo,
  }) =>
      JoinSchoolOutcome._(
        schoolId: schoolId,
        userId: userId,
        username: username,
        elo: elo,
      );
}

/// Result of [MultiplayerService.leaveSchoolLobby].
class LeaveSchoolLobbyOutcome {
  final String? errorMessage;
  /// True when a non-null [school_id] was cleared from [mg_profiles].
  final bool unlinkedSchool;

  bool get isSuccess => errorMessage == null;

  const LeaveSchoolLobbyOutcome._({
    this.errorMessage,
    this.unlinkedSchool = false,
  });

  factory LeaveSchoolLobbyOutcome.failure(String message) =>
      LeaveSchoolLobbyOutcome._(errorMessage: message);

  factory LeaveSchoolLobbyOutcome.success({required bool unlinkedSchool}) =>
      LeaveSchoolLobbyOutcome._(unlinkedSchool: unlinkedSchool);
}

/// Recursively finds the first JSON object in [node] satisfying [pred].
Map<String, dynamic>? _findMapInTree(
  dynamic node,
  bool Function(Map<String, dynamic>) pred, [
  int depth = 0,
]) {
  if (depth > 16) return null;
  if (node is Map) {
    final m = Map<String, dynamic>.from(node);
    if (pred(m)) return m;
    for (final v in m.values) {
      final hit = _findMapInTree(v, pred, depth + 1);
      if (hit != null) return hit;
    }
  } else if (node is List) {
    for (final e in node) {
      final hit = _findMapInTree(e, pred, depth + 1);
      if (hit != null) return hit;
    }
  }
  return null;
}

Map<String, dynamic> _unwrapChallengePayload(Map<String, dynamic> raw) {
  return _findMapInTree(
        raw,
        (m) => m.containsKey('to_id') && m.containsKey('from_id'),
      ) ??
      Map<String, dynamic>.from(raw);
}

Map<String, dynamic> _unwrapChallengeResponsePayload(Map<String, dynamic> raw) {
  return _findMapInTree(
        raw,
        (m) =>
            m.containsKey('challenger_id') &&
            (m.containsKey('accepted') || m.containsKey('responder_id')),
      ) ??
      Map<String, dynamic>.from(raw);
}

Map<String, dynamic> _unwrapGameEventPayload(Map<String, dynamic> raw) {
  return _findMapInTree(raw, (m) {
        final pid = m['player_id'] ?? m['playerId'];
        if (pid == null) return false;
        if (m['type']?.toString() == 'move') {
          return m.containsKey('row') && m.containsKey('col');
        }
        return true;
      }) ??
      Map<String, dynamic>.from(raw);
}

Map<String, dynamic> _unwrapMatchOverPayload(Map<String, dynamic> raw) {
  return _findMapInTree(
        raw,
        (m) =>
            m.containsKey('winner_id') ||
            m['is_draw'] == true ||
            m.containsKey('winnerChange') ||
            m.containsKey('player1Change'),
      ) ??
      Map<String, dynamic>.from(raw);
}

class MultiplayerService {
  static const String _defaultLobbyJoinCode = '00BEE00';

  /// Single realtime channel for all online players (any institution).
  static const String universalLobbyChannelKey = 'universal';

  // ── Singleton setup ──────────────────────────────────────
  static final MultiplayerService _instance = MultiplayerService._internal();
  factory MultiplayerService() => _instance;
  MultiplayerService._internal();

  final _client = Supabase.instance.client;

  RealtimeChannel? _lobbyChannel;
  RealtimeChannel? _matchChannel;

  String? _lobbyInstitutionName;
  String? _lobbyCountryCode;

  // ── Stream controllers (your UI listens to these) ────────
  final _onlinePlayersController =
      StreamController<List<PlayerPresence>>.broadcast();
  final _challengeController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _challengeResponseController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _gameEventController =
      StreamController<Map<String, dynamic>>.broadcast();
  final _matchOverController =
      StreamController<Map<String, dynamic>>.broadcast();

  Stream<List<PlayerPresence>> get onlinePlayers =>
      _onlinePlayersController.stream;
  Stream<Map<String, dynamic>> get onChallenge => _challengeController.stream;
  Stream<Map<String, dynamic>> get onChallengeResponse =>
      _challengeResponseController.stream;
  Stream<Map<String, dynamic>> get onGameEvent => _gameEventController.stream;
  Stream<Map<String, dynamic>> get onMatchOver => _matchOverController.stream;

  // ════════════════════════════════════════════════════════
  // LOBBY — join when entering the school lobby screen
  // ════════════════════════════════════════════════════════
  Map<String, dynamic> _lobbyPresencePayload({
    required String userId,
    required String username,
    required int elo,
    required int beeFiveXp,
    required String status,
  }) =>
      {
        'user_id': userId,
        'username': username,
        'elo': elo,
        'xp': beeFiveXp,
        'institution': _lobbyInstitutionName ?? '',
        'country_code': _lobbyCountryCode ?? '',
        'status': status,
      };

  Future<void> joinLobby({
    required String schoolId,
    required String userId,
    required String username,
    required int elo,
    required int beeFiveXp,
    String? institutionName,
    String? countryCode,
  }) async {
    // Clean up any existing channel first
    await leaveLobby();

    _lobbyInstitutionName = institutionName?.trim();
    if (_lobbyInstitutionName != null && _lobbyInstitutionName!.isEmpty) {
      _lobbyInstitutionName = null;
    }

    final cc = countryCode?.trim().toUpperCase();
    _lobbyCountryCode = (cc != null && cc.isNotEmpty) ? cc : null;

    // [schoolId] kept for API compatibility; presence is global for all institutions.
    _lobbyChannel = _client.channel('lobby:$universalLobbyChannelKey');

    unawaited(touchAccountActivity());

    // ── Listen for incoming challenges ───────────────────
    _lobbyChannel!.onBroadcast(
      event: 'challenge',
      callback: (payload) {
        final data = _unwrapChallengePayload(payload);
        if (data['to_id']?.toString() == userId) {
          _challengeController.add(data);
        }
      },
    );

    // ── Listen for challenge responses ───────────────────
    _lobbyChannel!.onBroadcast(
      event: 'challenge_response',
      callback: (payload) {
        final data = _unwrapChallengeResponsePayload(payload);
        if (data['challenger_id']?.toString() == userId) {
          _challengeResponseController.add(data);
        }
      },
    );

    // ── Listen for presence changes (who is online) ──────
    _lobbyChannel!.onPresenceSync((RealtimePresenceSyncPayload _) {
      final state = _lobbyChannel!.presenceState();
      final raw = state.expand((single) => single.presences).map((p) {
        return PlayerPresence.fromMap(
          Map<String, dynamic>.from(p.payload as Map),
        );
      }).where((p) => p.userId.isNotEmpty && p.userId != userId);

      // One row per user — if multiple presence shards exist, keep busiest (in match > searching > idle).
      final byId = <String, PlayerPresence>{};
      for (final p in raw) {
        final existing = byId[p.userId];
        if (existing == null ||
            PlayerPresence.statusRank(p.status) >
                PlayerPresence.statusRank(existing.status)) {
          byId[p.userId] = p;
        }
      }

      final viewerElo = elo;

      // Closest ELO first — feels like natural opponents / peers at this school.
      final players = byId.values.toList()
        ..sort((a, b) {
          final da = (a.elo - viewerElo).abs();
          final db = (b.elo - viewerElo).abs();
          final byDist = da.compareTo(db);
          if (byDist != 0) return byDist;
          final byElo = b.elo.compareTo(a.elo);
          if (byElo != 0) return byElo;
          return a.username.compareTo(b.username);
        });
      _onlinePlayersController.add(players);
    });

    // ── Subscribe and announce presence ─────────────────
    _lobbyChannel!.subscribe((status, error) async {
      if (status == RealtimeSubscribeStatus.subscribed) {
        await _lobbyChannel!.track(
          _lobbyPresencePayload(
            userId: userId,
            username: username,
            elo: elo,
            beeFiveXp: beeFiveXp,
            status: 'idle',
          ),
        );
      }
    });
  }

  Future<void> leaveLobby() async {
    if (_lobbyChannel != null) {
      await _lobbyChannel!.untrack();
      await _client.removeChannel(_lobbyChannel!);
      _lobbyChannel = null;
    }
    _lobbyInstitutionName = null;
    _lobbyCountryCode = null;
  }

  /// Clears the signed-in user's [mg_profiles.school_id] and drops lobby/match realtime channels.
  /// Use from Settings when the player wants to leave their current school or default lobby link.
  Future<LeaveSchoolLobbyOutcome> leaveSchoolLobby() async {
    final user = _client.auth.currentUser;
    if (user == null) {
      return LeaveSchoolLobbyOutcome.failure('You must be signed in.');
    }

    await leaveLobby();
    await leaveMatch();

    try {
      final rows = List<Map<String, dynamic>>.from(
        await _client
            .from('mg_profiles')
            .select('school_id')
            .eq('id', user.id)
            .limit(1),
      );

      if (rows.isEmpty) {
        return LeaveSchoolLobbyOutcome.success(unlinkedSchool: false);
      }

      final raw = rows.first['school_id'];
      final String? schoolId = raw == null
          ? null
          : (raw is String
              ? (raw.trim().isEmpty ? null : raw.trim())
              : raw.toString().trim().isEmpty
                  ? null
                  : raw.toString());

      if (schoolId == null || schoolId.isEmpty) {
        return LeaveSchoolLobbyOutcome.success(unlinkedSchool: false);
      }

      await _client.from('mg_profiles').update({'school_id': null}).eq('id', user.id);
      return LeaveSchoolLobbyOutcome.success(unlinkedSchool: true);
    } on PostgrestException catch (e) {
      return LeaveSchoolLobbyOutcome.failure(e.message);
    } catch (_) {
      return LeaveSchoolLobbyOutcome.failure(
        'Something went wrong. Check your connection and try again.',
      );
    }
  }

  // ════════════════════════════════════════════════════════
  // PRESENCE STATUS — update your status in the lobby
  // ════════════════════════════════════════════════════════

  /// Call this when player taps "Find Match"
  Future<void> setSearching({
    required String userId,
    required String username,
    required int elo,
    required int beeFiveXp,
  }) async {
    await _lobbyChannel?.track(
      _lobbyPresencePayload(
        userId: userId,
        username: username,
        elo: elo,
        beeFiveXp: beeFiveXp,
        status: 'searching',
      ),
    );
  }

  /// Call this when player cancels search or match ends
  Future<void> setIdle({
    required String userId,
    required String username,
    required int elo,
    required int beeFiveXp,
  }) async {
    await _lobbyChannel?.track(
      _lobbyPresencePayload(
        userId: userId,
        username: username,
        elo: elo,
        beeFiveXp: beeFiveXp,
        status: 'idle',
      ),
    );
  }

  /// Call when this user opens the live match screen so others see them as busy.
  Future<void> setInMatch({
    required String userId,
    required String username,
    required int elo,
    required int beeFiveXp,
  }) async {
    await _lobbyChannel?.track(
      _lobbyPresencePayload(
        userId: userId,
        username: username,
        elo: elo,
        beeFiveXp: beeFiveXp,
        status: 'in_match',
      ),
    );
  }

  // ════════════════════════════════════════════════════════
  // CHALLENGES
  // ════════════════════════════════════════════════════════

  /// Send a direct challenge to another player
  Future<void> sendChallenge({
    required String fromId,
    required String fromUsername,
    required int fromElo,
    required int fromBeeFiveXp,
    required String toId,
    required String matchId,
  }) async {
    await _lobbyChannel?.sendBroadcastMessage(
      event: 'challenge',
      payload: {
        'from_id': fromId,
        'from_username': fromUsername,
        'from_elo': fromElo,
        'from_xp': fromBeeFiveXp,
        'to_id': toId,
        'match_id': matchId,
      },
    );
  }

  /// Respond to a challenge (accept or decline)
  Future<void> respondToChallenge({
    required String matchId,
    required String challengerId, // the person who sent the challenge
    required bool accepted,
    required String responderId,
    required String responderUsername,
  }) async {
    await _lobbyChannel?.sendBroadcastMessage(
      event: 'challenge_response',
      payload: {
        'match_id': matchId,
        'challenger_id': challengerId,
        'accepted': accepted,
        'responder_id': responderId,
        'responder_username': responderUsername,
      },
    );
  }

  // ════════════════════════════════════════════════════════
  // MATCH — join when both players enter the match screen
  // ════════════════════════════════════════════════════════
  Future<void> joinMatch({
    required String matchId,
    required String userId,
    required String opponentId,
  }) async {
    await leaveMatch();

    _matchChannel = _client.channel('match:$matchId');

    // ── Listen for game events from opponent ─────────────
    _matchChannel!.onBroadcast(
      event: 'game_event',
      callback: (payload) {
        final data = _unwrapGameEventPayload(payload);
        final sender =
            (data['player_id'] ?? data['playerId'])?.toString();
        if (sender != null && sender != userId) {
          _gameEventController.add(data);
        }
      },
    );

    // ── Listen for match over ────────────────────────────
    _matchChannel!.onBroadcast(
      event: 'match_over',
      callback: (payload) {
        _matchOverController.add(_unwrapMatchOverPayload(payload));
      },
    );

    // ── Detect opponent disconnect ───────────────────────
    _matchChannel!.onPresenceLeave((RealtimePresenceLeavePayload payload) {
      final opponentLeft = payload.leftPresences
          .any((p) => p.payload['user_id'] == opponentId);
      if (opponentLeft) {
        _matchOverController.add({
          'winner_id': userId,
          'reason': 'opponent_disconnected',
        });
      }
    });

    // ── Subscribe and track presence ─────────────────────
    final subscribed = Completer<void>();
    _matchChannel!.subscribe((status, error) async {
      if (status == RealtimeSubscribeStatus.subscribed) {
        if (!subscribed.isCompleted) subscribed.complete();
        await _matchChannel!.track({'user_id': userId});
      } else if (status == RealtimeSubscribeStatus.channelError) {
        if (!subscribed.isCompleted) {
          subscribed.completeError(
            error ?? Exception('Realtime match channel error'),
          );
        }
      }
    });

    try {
      await subscribed.future.timeout(const Duration(seconds: 20));
    } on TimeoutException {
      // Allow match UI anyway; events may arrive once the socket catches up.
    } catch (_) {
      // Same: do not block entering the match if subscribe is slow.
    }
  }

  Future<void> leaveMatch() async {
    if (_matchChannel != null) {
      await _matchChannel!.untrack();
      await _client.removeChannel(_matchChannel!);
      _matchChannel = null;
    }
  }

  // ════════════════════════════════════════════════════════
  // LIVE GAME EVENTS — send during a match
  // ════════════════════════════════════════════════════════

  /// Call this whenever something happens in your game
  /// e.g. sendGameEvent({ 'answer': 'A', 'score': 3 })
  Future<void> sendGameEvent(
      String playerId, Map<String, dynamic> eventData) async {
    final ch = _matchChannel;
    if (ch == null) return;
    final payload = <String, dynamic>{
      'player_id': playerId,
      ...eventData,
    };
    // Prefer REST broadcast — reliably reaches other clients even if WS push
    // is buffered or the channel is still settling (common on emulators).
    try {
      await ch.httpSend(event: 'game_event', payload: payload);
    } catch (_) {
      await ch.sendBroadcastMessage(
        event: 'game_event',
        payload: payload,
      );
    }
  }

  Future<void> _sendMatchBroadcast({
    required String event,
    required Map<String, dynamic> payload,
  }) async {
    final ch = _matchChannel;
    if (ch == null) return;
    try {
      await ch.httpSend(event: event, payload: payload);
    } catch (_) {
      await ch.sendBroadcastMessage(event: event, payload: payload);
    }
  }

  // ════════════════════════════════════════════════════════
  // SUBMIT MATCH RESULT — calls the Edge Function for ELO
  // ════════════════════════════════════════════════════════
  Future<Map<String, dynamic>> submitMatchResult({
    required String player1Id,
    required String player2Id,
    String? winnerId,
    bool isDraw = false,
    bool voidNoMoves = false,
  }) async {
    // Commit on server first so the DB is authoritative, then notify clients.
    final response = await _client.functions.invoke(
      'submit-match',
      body: {
        'player1_id': player1Id,
        'player2_id': player2Id,
        if (!isDraw && winnerId != null) 'winner_id': winnerId,
        'is_draw': isDraw,
        if (voidNoMoves) 'void_no_moves': true,
      },
    );

    final data = Map<String, dynamic>.from(response.data as Map);

    if (isDraw) {
      await _sendMatchBroadcast(
        event: 'match_over',
        payload: <String, dynamic>{
          'is_draw': true,
          if (voidNoMoves) 'void_no_moves': true,
          'player1Change': data['player1Change'],
          'player2Change': data['player2Change'],
        },
      );
    } else {
      await _sendMatchBroadcast(
        event: 'match_over',
        payload: <String, dynamic>{
          'winner_id': winnerId,
          'winnerChange': data['winnerChange'],
          'loserChange': data['loserChange'],
        },
      );
    }

    return data;
  }

  /// Recorded games between two users (either orientation in [mg_matches]).
  Future<int> countCompletedMatchesBetween(String userA, String userB) async {
    if (userA == userB) return 0;
    try {
      final result = await _client
          .from('mg_matches')
          .select('id')
          .or(
            'and(player1_id.eq.$userA,player2_id.eq.$userB),'
            'and(player1_id.eq.$userB,player2_id.eq.$userA)',
          )
          .count(CountOption.exact);
      return result.count;
    } catch (_) {
      return 0;
    }
  }

  // ════════════════════════════════════════════════════════
  // LEADERBOARD — fetch or stream school rankings
  // ════════════════════════════════════════════════════════

  /// One-time fetch of the school leaderboard
  Future<List<Map<String, dynamic>>> getLeaderboard(String schoolId) async {
    final data = await _client
        .from('mg_profiles')
        .select('id, username, elo, wins, losses, country_code')
        .eq('school_id', schoolId)
        .order('elo', ascending: false)
        .limit(100);
    return List<Map<String, dynamic>>.from(data);
  }

  /// Live stream — updates whenever any player's ELO changes (one institution).
  Stream<List<Map<String, dynamic>>> leaderboardStream(String schoolId) {
    return _client
        .from('mg_profiles')
        .stream(primaryKey: ['id'])
        .eq('school_id', schoolId)
        .order('elo', ascending: false)
        .limit(100);
  }

  /// All players with a school, ranked by ELO (global rankings tab).
  /// Realtime streams cannot filter null server-side; over-fetch then keep top 100 linked players.
  Stream<List<Map<String, dynamic>>> globalLeaderboardStream() {
    return _client
        .from('mg_profiles')
        .stream(primaryKey: ['id'])
        .order('elo', ascending: false)
        .limit(300)
        .map((rows) => rows
            .where((r) =>
                r['school_id'] != null && r['school_id'].toString().isNotEmpty)
            .take(100)
            .toList());
  }

  /// One-time fetch with institution names for global leaderboard.
  Future<List<Map<String, dynamic>>> getGlobalLeaderboard() async {
    final data = await _client
        .from('mg_profiles')
        .select(
          'id, username, elo, wins, losses, school_id, country_code, mg_schools(name)',
        )
        .not('school_id', 'is', null)
        .order('elo', ascending: false)
        .limit(100);
    return List<Map<String, dynamic>>.from(data);
  }

  static String _usernameIlikePattern(String query) {
    final trimmed = query.trim();
    if (trimmed.isEmpty) return '';
    final safe = trimmed.replaceAll(RegExp(r'[%_\\]'), '');
    if (safe.isEmpty) return '';
    return '%$safe%';
  }

  /// Username search across all ranked (school-linked) players.
  Future<List<Map<String, dynamic>>> searchGlobalLeaderboard(String query) async {
    final pattern = _usernameIlikePattern(query);
    if (pattern.isEmpty) return [];

    final data = await _client
        .from('mg_profiles')
        .select(
          'id, username, elo, wins, losses, school_id, country_code, mg_schools(name)',
        )
        .not('school_id', 'is', null)
        .ilike('username', pattern)
        .order('elo', ascending: false)
        .limit(50);
    return List<Map<String, dynamic>>.from(data);
  }

  /// Username search within one institution's leaderboard.
  Future<List<Map<String, dynamic>>> searchInstitutionalLeaderboard(
    String schoolId,
    String query,
  ) async {
    final pattern = _usernameIlikePattern(query);
    if (pattern.isEmpty) return [];

    final data = await _client
        .from('mg_profiles')
        .select('id, username, elo, wins, losses, country_code')
        .eq('school_id', schoolId)
        .ilike('username', pattern)
        .order('elo', ascending: false)
        .limit(50);
    return List<Map<String, dynamic>>.from(data);
  }

  /// Rank = 1 + players with strictly higher ELO (ties share rank).
  Future<int?> getLeaderboardRank({
    required int elo,
    String? schoolId,
  }) =>
      _leaderboardRankFor(elo: elo, schoolId: schoolId);

  static String? institutionNameFromProfileRow(Map<String, dynamic> row) {
    final nested = row['mg_schools'];
    if (nested is Map) {
      final n = nested['name']?.toString().trim();
      if (n != null && n.isNotEmpty) return n;
    }
    return null;
  }

  static int _parseProfileInt(dynamic v, {int fallback = 0}) {
    if (v is int) return v;
    if (v is num) return v.toInt();
    return int.tryParse(v?.toString() ?? '') ?? fallback;
  }

  /// Rank = 1 + number of players with strictly higher ELO (ties share rank).
  Future<int?> _leaderboardRankFor({
    required int elo,
    String? schoolId,
  }) async {
    try {
      var query = _client.from('mg_profiles').select('id').gt('elo', elo);
      if (schoolId != null) {
        query = query.eq('school_id', schoolId);
      } else {
        query = query.not('school_id', 'is', null);
      }
      final result = await query.count(CountOption.exact);
      return result.count + 1;
    } catch (_) {
      return null;
    }
  }

  Future<String?> getProfileCountryCode(String userId) async {
    try {
      final row = await _client
          .from('mg_profiles')
          .select('country_code')
          .eq('id', userId)
          .maybeSingle();
      if (row == null) return null;
      final cc = row['country_code']?.toString().trim();
      if (cc == null || cc.isEmpty) return null;
      return cc.toUpperCase();
    } catch (_) {
      return null;
    }
  }

  /// Updates [mg_profiles.country_code] and auth metadata for the signed-in user.
  Future<String?> updateProfileCountry(String countryCode) async {
    final user = _client.auth.currentUser;
    if (user == null) return 'You must be signed in.';

    final cc = countryCode.trim().toUpperCase();
    if (cc.length != 2 || countryCodeToFlagEmoji(cc).isEmpty) {
      return 'Please choose a valid country.';
    }

    try {
      await _client
          .from('mg_profiles')
          .update({'country_code': cc})
          .eq('id', user.id);
      await _client.auth.updateUser(
        UserAttributes(data: {'country_code': cc}),
      );
      return null;
    } on PostgrestException catch (e) {
      return e.message;
    } catch (_) {
      return 'Could not update country. Check your connection and try again.';
    }
  }

  /// Dashboard: institution, ELO rank title, global / institutional position, win streak.
  Future<OnlineDashboardStats> fetchOnlineDashboardStats(String userId) async {
    try {
      final raw = await _client
          .from('mg_profiles')
          .select('id, elo, win_streak, school_id, mg_schools(name)')
          .eq('id', userId)
          .maybeSingle();

      if (raw == null) {
        return OnlineDashboardStats.unavailable();
      }

      final row = Map<String, dynamic>.from(raw);
      final elo = _parseProfileInt(row['elo'], fallback: 1200);
      final winStreak = _parseProfileInt(row['win_streak']);
      final schoolRaw = row['school_id'];
      final hasSchool =
          schoolRaw != null && schoolRaw.toString().trim().isNotEmpty;
      final institutionName = institutionNameFromProfileRow(row);

      int? globalRank;
      int? institutionalRank;

      if (hasSchool) {
        globalRank = await _leaderboardRankFor(elo: elo);
        institutionalRank = await _leaderboardRankFor(
          elo: elo,
          schoolId: schoolRaw.toString(),
        );
      }

      return OnlineDashboardStats.fromProfile(
        institutionName: institutionName,
        elo: elo,
        globalRank: globalRank,
        institutionalRank: institutionalRank,
        winStreak: winStreak,
        hasSchool: hasSchool,
      );
    } catch (_) {
      return OnlineDashboardStats.unavailable();
    }
  }

  /// Full name saved at sign-up in auth [User.userMetadata] under `full_name`.
  static String? _fullNameFromUserMetadata(User user) {
    final raw = user.userMetadata?['full_name'];
    if (raw == null) return null;
    final s = raw.toString().trim();
    return s.isEmpty ? null : s;
  }

  /// Auth email for denormalizing onto [mg_profiles.email] (source of truth remains auth).
  /// Only sync real contact emails onto mg_profiles — not synthetic username logins.
  static Map<String, String> _emailFieldIfPresent(User user) {
    final e = user.email?.trim();
    if (e == null || e.isEmpty) return {};
    if (e.toLowerCase().endsWith('@$kBeefiveInternalEmailDomain')) return {};
    return {'email': e};
  }

  /// Username for a new [mg_profiles] row when none exists yet (valid chars, unique-ish).
  static String _usernameForNewMgProfile(User user) {
    final meta = user.userMetadata?['username'];
    if (meta is String) {
      final t = meta.trim();
      if (t.length >= 3 && RegExp(r'^[a-zA-Z0-9_-]+$').hasMatch(t)) {
        return t.length > 32 ? t.substring(0, 32) : t;
      }
    }
    final email = user.email;
    if (email != null && email.contains('@')) {
      var local = email
          .split('@')
          .first
          .replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '_');
      if (local.isEmpty) local = 'user';
      if (local.length < 3) local = '${local}_bee';
      return local.length > 32 ? local.substring(0, 32) : local;
    }
    final hex = user.id.replaceAll('-', '');
    return 'p_${hex.substring(0, hex.length >= 12 ? 12 : hex.length)}';
  }

  static JoinSchoolOutcome _outcomeFromProfileRow({
    required Map<String, dynamic> row,
    required User user,
    required String schoolId,
  }) {
    final rawName = row['username'];
    String displayName = '';
    if (rawName is String && rawName.trim().isNotEmpty) {
      displayName = rawName.trim();
    } else {
      final meta = user.userMetadata?['username'];
      if (meta != null && meta.toString().trim().isNotEmpty) {
        displayName = meta.toString().trim();
      } else {
        final email = user.email;
        displayName = (email != null && email.contains('@'))
            ? email.split('@').first
            : 'Player';
      }
    }

    final eloRaw = row['elo'];
    final elo = eloRaw is int
        ? eloRaw
        : (eloRaw is num ? eloRaw.toInt() : 1200);

    return JoinSchoolOutcome.success(
      schoolId: schoolId,
      userId: user.id,
      username: displayName,
      elo: elo,
    );
  }

  /// Join a school using a join code. On success returns [JoinSchoolOutcome.success]
  /// with fields needed to open the school lobby screen.
  ///
  /// Preferentially calls RPC [mg_join_school_for_user] (migration 20260511120000) so the
  /// merge runs as SECURITY DEFINER and is not blocked by client RLS. Falls back to direct
  /// PostgREST when the RPC is not deployed yet.
  Future<JoinSchoolOutcome> joinDefaultLobby() {
    return joinSchool(_defaultLobbyJoinCode);
  }

  static String get defaultLobbyJoinCode => _defaultLobbyJoinCode;

  Future<JoinSchoolOutcome> joinSchool(String joinCode) async {
    final user = _client.auth.currentUser;
    if (user == null) {
      return JoinSchoolOutcome.failure('You must be signed in to join a school.');
    }

    final normalized = joinCode.toUpperCase().trim();
    if (normalized.isEmpty) {
      return JoinSchoolOutcome.failure('Please enter your school’s join code.');
    }

    try {
      Map<String, dynamic>? rpcRow;
      try {
        final raw = await _client.rpc(
          'mg_join_school_for_user',
          params: {'p_join_code': normalized},
        );
        rpcRow = _mapFromJoinSchoolRpc(raw);
      } on PostgrestException catch (e) {
        if (!_joinSchoolRpcNotDeployed(e)) {
          return _joinSchoolRpcErrorOutcome(e);
        }
        rpcRow = null;
      }

      if (rpcRow != null) {
        final sid = rpcRow['school_id']?.toString();
        if (sid != null && sid.isNotEmpty) {
          return _outcomeFromProfileRow(row: rpcRow, user: user, schoolId: sid);
        }
      }

      return await _joinSchoolClientOnly(normalized, user);
    } on PostgrestException catch (e) {
      if (e.code == 'PGRST116') {
        return JoinSchoolOutcome.failure(
          'No matching school or profile row returned (often RLS or wrong school join code). '
          'Check mg_schools SELECT and mg_profiles UPDATE policies for role authenticated.',
        );
      }
      final msg = e.message.toLowerCase();
      if (msg.contains('permission') ||
          msg.contains('policy') ||
          msg.contains('rls') ||
          msg.contains('row-level security')) {
        return JoinSchoolOutcome.failure(
          'Could not join (database permission). '
          'In Supabase, allow authenticated users to read mg_schools and update their mg_profiles row.',
        );
      }
      return JoinSchoolOutcome.failure(e.message);
    } catch (_) {
      return JoinSchoolOutcome.failure(
        'Something went wrong. Check your connection and try again.',
      );
    }
  }

  static Map<String, dynamic>? _mapFromJoinSchoolRpc(dynamic raw) {
    if (raw == null) return null;
    if (raw is Map<String, dynamic>) return raw;
    if (raw is Map) return Map<String, dynamic>.from(raw);
    if (raw is List && raw.isNotEmpty) {
      return _mapFromJoinSchoolRpc(raw.first);
    }
    if (raw is String && raw.trim().isNotEmpty) {
      try {
        return _mapFromJoinSchoolRpc(jsonDecode(raw));
      } catch (_) {
        return null;
      }
    }
    return null;
  }

  /// True when the DB has not been migrated with [mg_join_school_for_user] yet.
  static bool _joinSchoolRpcNotDeployed(PostgrestException e) {
    final m = e.message.toLowerCase();
    if (m.contains('could not find the function')) return true;
    if (m.contains('schema cache')) return true;
    if ('${e.code}' == '42883') return true;
    return false;
  }

  static JoinSchoolOutcome _joinSchoolRpcErrorOutcome(PostgrestException e) {
    final m = e.message.toLowerCase();
    if (m.contains('invalid_join_code')) {
      return JoinSchoolOutcome.failure(
        'Invalid school join code, or that code is not in the database yet.',
      );
    }
    if (m.contains('not_authenticated')) {
      return JoinSchoolOutcome.failure('You must be signed in to join a school.');
    }
    return JoinSchoolOutcome.failure(e.message);
  }

  /// Client-side join (RLS-dependent). Used when [mg_join_school_for_user] RPC is absent.
  Future<JoinSchoolOutcome> _joinSchoolClientOnly(
    String normalized,
    User user,
  ) async {
    final schoolRows = List<Map<String, dynamic>>.from(
      await _client
          .from('mg_schools')
          .select('id')
          .eq('join_code', normalized)
          .limit(1),
    );

    if (schoolRows.isEmpty) {
      return JoinSchoolOutcome.failure(
        'Invalid school join code, or your account cannot read schools yet. '
        'Confirm the code and that Supabase RLS allows authenticated SELECT on mg_schools.',
      );
    }

    final schoolIdRaw = schoolRows.first['id'];
    if (schoolIdRaw == null) {
      return JoinSchoolOutcome.failure(
        'Invalid school join code. Check with your school for the correct code.',
      );
    }
    final schoolId = schoolIdRaw.toString();

    final existingProfile = List<Map<String, dynamic>>.from(
      await _client
          .from('mg_profiles')
          .select('id')
          .eq('id', user.id)
          .limit(1),
    );

    final displayFullName = _fullNameFromUserMetadata(user);
    List<Map<String, dynamic>> savedRows;

    if (existingProfile.isEmpty) {
      PostgrestException? insertError;
      try {
        savedRows = List<Map<String, dynamic>>.from(
          await _client
              .from('mg_profiles')
              .insert({
                'id': user.id,
                'username': _usernameForNewMgProfile(user),
                'full_name': ?displayFullName,
                ..._emailFieldIfPresent(user),
                'school_id': schoolId,
                'elo': 1200,
                'wins': 0,
                'losses': 0,
              })
              .select('id, username, elo')
              .limit(1),
        );
      } on PostgrestException catch (e) {
        insertError = e;
        String? mergeErrText;
        try {
          savedRows = await _mergeMgProfileSchoolJoin(
            user: user,
            schoolId: schoolId,
            displayFullName: displayFullName,
          );
        } on PostgrestException catch (me) {
          savedRows = [];
          mergeErrText = me.message;
        }
        if (savedRows.isEmpty && mergeErrText != null) {
          insertError = PostgrestException(
            message:
                '${insertError.message} · update fallback: $mergeErrText',
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint,
          );
        }
      }

      if (savedRows.isEmpty) {
        if (insertError == null) {
          return JoinSchoolOutcome.failure(
            'Profile insert ran but no row was returned. '
            'Check mg_profiles RLS allows SELECT on your own row after insert.',
          );
        }
        final dup = insertError.code == '23505' ||
            insertError.message.toLowerCase().contains('duplicate');
        if (dup) {
          return JoinSchoolOutcome.failure(
            'A profile already exists for this account but it could not be read or updated '
            '(RLS). In Supabase → mg_profiles → policies: allow authenticated SELECT and '
            'UPDATE where auth.uid() = id.',
          );
        }
        return JoinSchoolOutcome.failure(
          'No player profile exists yet and creating one failed: ${insertError.message}. '
          'Apply migrations bee_five/supabase/migrations/20260511120000_mg_join_school_rpc.sql '
          'and 20260511200000_mg_join_school_rpc_v2.sql, then run SQL on your Supabase project.',
        );
      }
    } else {
      savedRows = await _mergeMgProfileSchoolJoin(
        user: user,
        schoolId: schoolId,
        displayFullName: displayFullName,
      );

      if (savedRows.isEmpty) {
        return JoinSchoolOutcome.failure(
          'Your school could not be saved (the update matched no row or was blocked). '
          'In Supabase → mg_profiles → RLS: add UPDATE for role authenticated with '
          'USING (auth.uid() = id) and WITH CHECK (auth.uid() = id). '
          'See bee_five/supabase/migrations/20260202140000_mg_school_join_rls.sql',
        );
      }
    }

    return _outcomeFromProfileRow(
      row: savedRows.first,
      user: user,
      schoolId: schoolId,
    );
  }

  /// Updates school + contact fields when insert failed or profile already existed.
  Future<List<Map<String, dynamic>>> _mergeMgProfileSchoolJoin({
    required User user,
    required String schoolId,
    String? displayFullName,
  }) async {
    final updates = <String, dynamic>{
      'school_id': schoolId,
      ..._emailFieldIfPresent(user),
    };
    if (displayFullName case final fullName?) {
      updates['full_name'] = fullName;
    }
    final raw = await _client
        .from('mg_profiles')
        .update(updates)
        .eq('id', user.id)
        .select('id, username, elo')
        .limit(1);
    return List<Map<String, dynamic>>.from(raw);
  }

  /// Country code from auth [User.userMetadata] under `country_code`.
  static String? _countryCodeFromUserMetadata(User user) {
    final raw = user.userMetadata?['country_code'];
    if (raw == null) return null;
    final s = raw.toString().trim().toUpperCase();
    return s.length == 2 ? s : null;
  }

  /// Refreshes [mg_profiles.last_active_at] for the signed-in user (90-day retention).
  Future<void> touchAccountActivity() async {
    if (_client.auth.currentUser == null) return;
    try {
      await _client.rpc('touch_account_activity');
    } catch (_) {}
  }

  /// Merge auth metadata into [mg_profiles] after login.
  Future<void> syncMgProfileFromAuthMetadata() async {
    final user = _client.auth.currentUser;
    if (user == null) return;

    await touchAccountActivity();

    final fullName = _fullNameFromUserMetadata(user);
    final countryCode = _countryCodeFromUserMetadata(user);
    final authEmail = user.email?.trim();
    final hasContactEmail = authEmail != null &&
        authEmail.isNotEmpty &&
        !authEmail.toLowerCase().endsWith('@$kBeefiveInternalEmailDomain');

    if (fullName == null && !hasContactEmail && countryCode == null) return;

    try {
      final existing = await _client
          .from('mg_profiles')
          .select('full_name, email, country_code')
          .eq('id', user.id)
          .maybeSingle();

      if (existing == null) {
        await _client.from('mg_profiles').insert({
          'id': user.id,
          'username': _usernameForNewMgProfile(user),
          if (fullName != null && fullName.isNotEmpty) 'full_name': fullName,
          'country_code': ?countryCode,
          if (hasContactEmail) 'email': authEmail,
          'elo': 1200,
          'wins': 0,
          'losses': 0,
        });
        return;
      }

      final updates = <String, dynamic>{};
      if (hasContactEmail) {
        updates['email'] = authEmail;
      }
      if (fullName != null) {
        final dbFull = existing['full_name'];
        if (dbFull == null || dbFull.toString().trim().isEmpty) {
          updates['full_name'] = fullName;
        }
      }
      if (countryCode != null) {
        final dbCountry = existing['country_code'];
        if (dbCountry == null || dbCountry.toString().trim().isEmpty) {
          updates['country_code'] = countryCode;
        }
      }
      if (updates.isEmpty) return;

      await _client.from('mg_profiles').update(updates).eq('id', user.id);
    } catch (_) {
      // Best-effort; lobby/join flows still work without DB contact fields.
    }
  }

  /// Create or patch profile after signup (needs JWT row-level policies).
  Future<void> createProfile(
    String username, {
    String? fullName,
    String? countryCode,
  }) async {
    final user = _client.auth.currentUser;
    if (user == null) return;

    final cc = countryCode?.trim().toUpperCase();
    final metaCountry = _countryCodeFromUserMetadata(user);
    final resolvedCountry =
        (cc != null && cc.isNotEmpty) ? cc : metaCountry;

    final payload = <String, dynamic>{
      'id': user.id,
      'username': username,
      'elo': 1200,
      'wins': 0,
      'losses': 0,
      ..._emailFieldIfPresent(user),
      if (fullName != null && fullName.isNotEmpty) 'full_name': fullName,
      'country_code': ?resolvedCountry,
    };

    try {
      await _client.from('mg_profiles').insert(payload);
    } on PostgrestException catch (e) {
      final dup = e.code == '23505' ||
          e.message.toLowerCase().contains('duplicate');
      if (!dup) rethrow;

      await _client.from('mg_profiles').update({
        'username': username,
        ..._emailFieldIfPresent(user),
        if (fullName != null && fullName.isNotEmpty) 'full_name': fullName,
        'country_code': ?resolvedCountry,
      }).eq('id', user.id);
    }

    await touchAccountActivity();
  }

  // ── Cleanup ──────────────────────────────────────────────
  void dispose() {
    leaveLobby();
    leaveMatch();
    _onlinePlayersController.close();
    _challengeController.close();
    _challengeResponseController.close();
    _gameEventController.close();
    _matchOverController.close();
  }
}