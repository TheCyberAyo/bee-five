// Async (multi-day) Bee Five: challenges, saved moves, notifications.

import 'package:supabase_flutter/supabase_flutter.dart';

import '../game_board_codec.dart';
import '../widgets/online_bee_five_board.dart';

class AsyncChallengeRow {
  final String id;
  final String challengerId;
  final String challengedId;
  final String status;
  final String? matchId;
  final String? challengerUsername;

  const AsyncChallengeRow({
    required this.id,
    required this.challengerId,
    required this.challengedId,
    required this.status,
    this.matchId,
    this.challengerUsername,
  });

  factory AsyncChallengeRow.fromMap(Map<String, dynamic> map) {
    final name = map['challenger_username']?.toString().trim();
    return AsyncChallengeRow(
      id: map['id']?.toString() ?? '',
      challengerId: map['challenger_id']?.toString() ?? '',
      challengedId: map['challenged_id']?.toString() ?? '',
      status: map['status']?.toString() ?? 'pending',
      matchId: map['match_id']?.toString(),
      challengerUsername:
          (name != null && name.isNotEmpty) ? name : null,
    );
  }
}

class AsyncMatchRow {
  final String id;
  final String player1Id;
  final String player2Id;
  final List<List<int>> board;
  final int currentSeat;
  final String status;
  final String? winnerId;
  final DateTime? lastMoveAt;
  final DateTime? turnDeadlineAt;

  const AsyncMatchRow({
    required this.id,
    required this.player1Id,
    required this.player2Id,
    required this.board,
    required this.currentSeat,
    required this.status,
    this.winnerId,
    this.lastMoveAt,
    this.turnDeadlineAt,
  });

  bool get isActive => status == 'active';

  bool get isForfeited => status == 'forfeited';

  bool get isFinished =>
      status == 'completed' || status == 'draw' || status == 'forfeited';

  Duration? get timeLeft {
    final deadline = turnDeadlineAt;
    if (deadline == null || !isActive) return null;
    return deadline.difference(DateTime.now().toUtc());
  }

  bool get isTurnExpired {
    final left = timeLeft;
    return left != null && left.isNegative;
  }

  int seatFor(String userId) {
    if (userId == player1Id) return 1;
    if (userId == player2Id) return 2;
    return 0;
  }

  String opponentIdFor(String userId) =>
      userId == player1Id ? player2Id : player1Id;

  factory AsyncMatchRow.fromMap(Map<String, dynamic> map) {
    DateTime? lastMove;
    final rawLast = map['last_move_at'];
    if (rawLast is String) {
      lastMove = DateTime.tryParse(rawLast);
    }
    DateTime? turnDeadline;
    final rawDeadline = map['turn_deadline_at'];
    if (rawDeadline is String) {
      turnDeadline = DateTime.tryParse(rawDeadline);
    }
    return AsyncMatchRow(
      id: map['id']?.toString() ?? '',
      player1Id: map['player1_id']?.toString() ?? '',
      player2Id: map['player2_id']?.toString() ?? '',
      board: parseAsyncBoard(map['board']),
      currentSeat: (map['current_seat'] as num?)?.toInt() ?? 1,
      status: map['status']?.toString() ?? 'active',
      winnerId: map['winner_id']?.toString(),
      lastMoveAt: lastMove,
      turnDeadlineAt: turnDeadline,
    );
  }
}

class SaveAsyncMoveResult {
  final List<List<int>> board;
  final int currentSeat;
  final String status;
  final String? winnerId;
  final bool isDraw;
  final DateTime? turnDeadlineAt;

  const SaveAsyncMoveResult({
    required this.board,
    required this.currentSeat,
    required this.status,
    this.winnerId,
    this.isDraw = false,
    this.turnDeadlineAt,
  });

  factory SaveAsyncMoveResult.fromMap(Map<String, dynamic> map) {
    DateTime? turnDeadline;
    final rawDeadline = map['turn_deadline_at'];
    if (rawDeadline is String) {
      turnDeadline = DateTime.tryParse(rawDeadline);
    }
    return SaveAsyncMoveResult(
      board: parseAsyncBoard(map['board']),
      currentSeat: (map['current_seat'] as num?)?.toInt() ?? 1,
      status: map['status']?.toString() ?? 'active',
      winnerId: map['winner_id']?.toString(),
      isDraw: map['is_draw'] == true,
      turnDeadlineAt: turnDeadline,
    );
  }
}

class AsyncGameService {
  AsyncGameService._();
  static final AsyncGameService instance = AsyncGameService._();

  final _client = Supabase.instance.client;

  Future<String?> sendAsyncChallenge(String challengedUserId) async {
    try {
      final id = await _client.rpc<String>(
        'mg_send_async_challenge',
        params: {'p_challenged_id': challengedUserId},
      );
      return id;
    } on PostgrestException catch (e) {
      throw AsyncGameException(e.message);
    }
  }

  Future<String> acceptAsyncChallenge(String challengeId) async {
    try {
      final matchId = await _client.rpc<String>(
        'mg_accept_async_challenge',
        params: {'p_challenge_id': challengeId},
      );
      return matchId;
    } on PostgrestException catch (e) {
      throw AsyncGameException(e.message);
    }
  }

  Future<void> declineAsyncChallenge(String challengeId) async {
    try {
      await _client.rpc(
        'mg_decline_async_challenge',
        params: {'p_challenge_id': challengeId},
      );
    } on PostgrestException catch (e) {
      throw AsyncGameException(e.message);
    }
  }

  Future<List<AsyncChallengeRow>> fetchPendingChallengesForMe() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return [];
    try {
      final rows = List<Map<String, dynamic>>.from(
        await _client
            .from('mg_async_challenges')
            .select()
            .eq('challenged_id', uid)
            .eq('status', 'pending')
            .order('created_at', ascending: false),
      );
      final out = <AsyncChallengeRow>[];
      for (final row in rows) {
        final m = Map<String, dynamic>.from(row);
        final cid = m['challenger_id']?.toString();
        if (cid != null && cid.isNotEmpty) {
          try {
            final prof = await _client
                .from('mg_profiles')
                .select('username')
                .eq('id', cid)
                .maybeSingle();
            if (prof != null) {
              m['challenger_username'] = prof['username'];
            }
          } catch (_) {}
        }
        out.add(AsyncChallengeRow.fromMap(m));
      }
      return out;
    } catch (_) {
      return [];
    }
  }

  Future<void> applyExpiredTurnForfeits({String? matchId}) async {
    try {
      await _client.rpc(
        'mg_forfeit_expired_async_turns',
        params: {'p_match_id': matchId},
      );
    } catch (_) {}
  }

  Future<AsyncMatchRow?> syncMatch(String matchId) async {
    try {
      final response = await _client.functions.invoke(
        'async-game',
        body: {'action': 'sync_match', 'match_id': matchId},
      );
      final data = Map<String, dynamic>.from(response.data as Map);
      if (data['ok'] != true) return fetchMatch(matchId);
      final matchMap = Map<String, dynamic>.from(data['match'] as Map);
      matchMap['player1_id'] ??= '';
      matchMap['player2_id'] ??= '';
      final existing = await _client
          .from('mg_async_matches')
          .select('player1_id, player2_id, last_move_at')
          .eq('id', matchId)
          .maybeSingle();
      if (existing != null) {
        matchMap['player1_id'] = existing['player1_id'];
        matchMap['player2_id'] = existing['player2_id'];
        matchMap['last_move_at'] = existing['last_move_at'];
      }
      return AsyncMatchRow.fromMap(matchMap);
    } catch (_) {
      await applyExpiredTurnForfeits(matchId: matchId);
      return fetchMatch(matchId);
    }
  }

  static String formatTurnTimeLeft(Duration? left) {
    if (left == null) return '';
    if (left.isNegative) return 'Time expired';
    final hours = left.inHours;
    final mins = left.inMinutes.remainder(60);
    if (hours >= 1) return '${hours}h ${mins}m left';
    if (mins >= 1) return '${mins}m left';
    return '${left.inSeconds}s left';
  }

  Future<List<AsyncMatchRow>> fetchActiveMatchesForMe() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return [];
    try {
      await applyExpiredTurnForfeits();
      final rows = List<Map<String, dynamic>>.from(
        await _client
            .from('mg_async_matches')
            .select()
            .eq('status', 'active')
            .or('player1_id.eq.$uid,player2_id.eq.$uid')
            .order('last_move_at', ascending: false),
      );
      return rows.map(AsyncMatchRow.fromMap).toList();
    } catch (_) {
      return [];
    }
  }

  Future<AsyncMatchRow?> fetchMatch(String matchId) async {
    try {
      await applyExpiredTurnForfeits(matchId: matchId);
      final row = await _client
          .from('mg_async_matches')
          .select()
          .eq('id', matchId)
          .maybeSingle();
      if (row == null) return null;
      return AsyncMatchRow.fromMap(Map<String, dynamic>.from(row));
    } catch (_) {
      return null;
    }
  }

  Future<SaveAsyncMoveResult> saveMove({
    required String matchId,
    required int row,
    required int col,
  }) async {
    try {
      final response = await _client.functions.invoke(
        'async-game',
        body: {
          'action': 'save_move',
          'match_id': matchId,
          'row': row,
          'col': col,
        },
      );
      final data = Map<String, dynamic>.from(response.data as Map);
      if (data['ok'] != true) {
        throw AsyncGameException(data['error']?.toString() ?? 'Save failed');
      }
      return SaveAsyncMoveResult.fromMap(data);
    } on FunctionException catch (e) {
      final details = e.details;
      if (details is Map) {
        if (details['error'] != null) {
          throw AsyncGameException(details['error'].toString());
        }
        if (details['status'] == 'forfeited') {
          throw AsyncGameException(
            details['error']?.toString() ??
                'Your 24-hour turn window expired.',
          );
        }
      }
      throw AsyncGameException(e.reasonPhrase ?? 'Could not save move');
    }
  }

  Future<void> upsertPushToken(String fcmToken, {String? platform}) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return;
    await _client.from('mg_push_tokens').upsert({
      'user_id': uid,
      'fcm_token': fcmToken,
      'platform': platform,
      'updated_at': DateTime.now().toUtc().toIso8601String(),
    });
  }

  Stream<List<Map<String, dynamic>>> notificationStream() {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) {
      return const Stream.empty();
    }
    return _client
        .from('mg_notifications')
        .stream(primaryKey: ['id'])
        .eq('user_id', uid)
        .order('created_at', ascending: false)
        .limit(20);
  }

  /// Canonical player ids for display (matches live online seats).
  static String displayPlayer1Id(String a, String b) =>
      onlineMatchPlayer1Id(a, b);

  static String displayPlayer2Id(String a, String b) =>
      onlineMatchPlayer2Id(a, b);
}

class AsyncGameException implements Exception {
  final String message;
  const AsyncGameException(this.message);
  @override
  String toString() => message;
}
