import 'xp_ledger.dart';
import 'dart:async';
import 'dart:math' as math;

import 'account_preferences.dart';

import 'supabase_client.dart';

/// Matches keys in `dashboard_page.dart` / `xp_service.dart` (do not import those here — circular).
const String _prefLoginStreakKey = 'login_streak';
const String _prefClassicBestStreakKey = 'classic_best_streak';
const String _prefDailyChallengeDate = 'daily_challenge_date';
const String _prefDailyChallengeWon = 'daily_challenge_won';
const String _prefAdventureConsecutiveWins = 'adventure_consecutive_wins';
const String _prefAdventureLevelsFirstClearXp =
    'adventure_levels_first_clear_xp';
const String _prefAdventureFirstClearXpMigrated =
    'adventure_first_clear_xp_migrated';

/// Local preference keys.
///
/// `_prefAdventureCurrentLevel` existed historically and stored "highest reached".
/// We now track both the currently selected level and the highest unlocked level.
const String _prefAdventureCurrentLevel = 'adventure_current_level';
const String _prefAdventureHighestUnlockedLevel =
    'adventure_highest_unlocked_level';
const String _prefLegacyHighestUnlockedGame = 'highest_unlocked_game';
const String _prefLegacyCurrentGameLevel = 'current_game_level';
const String _prefAdventureResetPending = 'adventure_progress_reset_pending';

Timer? _syncProgressDebounce;

/// Debounced merge + upload after prefs change (XP, classic streak, etc.).
void scheduleProgressCloudSync() {
  final owner = supabaseClient?.auth.currentUser?.id;
  if (owner == null) return;
  _syncProgressDebounce?.cancel();
  _syncProgressDebounce = Timer(const Duration(milliseconds: 900), () async {
    if (supabaseClient?.auth.currentUser?.id != owner) return;
    try {
      await syncAdventureProgress(preferLocalDashboardStats: true);
    } catch (_) {}
  });
}

class AdventureProgressData {
  final int currentGame;
  final int highestUnlockedGame;
  final List<int> gamesCompleted;
  final int gamesWon;

  /// From Supabase row when present; null if column missing or not signed in.
  final int? userXp;
  final int? loginStreak;
  final int? classicBestStreak;
  final XpAuxState? xpAux;

  const AdventureProgressData({
    required this.currentGame,
    required this.highestUnlockedGame,
    required this.gamesCompleted,
    required this.gamesWon,
    this.userXp,
    this.loginStreak,
    this.classicBestStreak,
    this.xpAux,
  });
}

class XpAuxState {
  final String? dailyChallengeDate;
  final bool? dailyChallengeWon;
  final int adventureConsecutiveWins;
  final int adventureConsecutiveLosses;
  final List<int> adventureLevelsFirstClear;
  final bool adventureFirstClearXpMigrated;

  const XpAuxState({
    this.dailyChallengeDate,
    this.dailyChallengeWon,
    this.adventureConsecutiveWins = 0,
    this.adventureConsecutiveLosses = 0,
    this.adventureLevelsFirstClear = const [],
    this.adventureFirstClearXpMigrated = false,
  });
}

int _clampLevel(int level) => level.clamp(1, 0x7FFFFFFF);

Future<int> getLocalAdventureCurrentLevel() async {
  final prefs = await AccountPreferences.getInstance();
  return _clampLevel(prefs.getInt(_prefAdventureCurrentLevel) ?? 1);
}

Future<int> getLocalAdventureHighestUnlockedLevel() async {
  final prefs = await AccountPreferences.getInstance();
  final current = prefs.getInt(_prefAdventureCurrentLevel) ?? 1;
  final highest = prefs.getInt(_prefAdventureHighestUnlockedLevel);
  return _clampLevel(highest ?? current);
}

Future<void> setLocalAdventureCurrentLevel(int level) async {
  final prefs = await AccountPreferences.getInstance();
  await prefs.setInt(_prefAdventureCurrentLevel, _clampLevel(level));
}

Future<void> setLocalAdventureHighestUnlockedLevel(int level) async {
  final prefs = await AccountPreferences.getInstance();
  await prefs.setInt(_prefAdventureHighestUnlockedLevel, _clampLevel(level));
}

Future<AdventureProgressData?> _loadRemoteAdventureProgress(
  String userId,
) async {
  if (supabaseClient == null) return null;
  try {
    final data = await supabaseClient!
        .from('adventure_progress')
        .select()
        .eq('user_id', userId)
        .maybeSingle();
    if (data == null) return null;
    final current = _clampLevel((data['current_game'] as num?)?.toInt() ?? 1);
    final highestRaw = (data['highest_unlocked_game'] as num?)?.toInt();
    final highest = _clampLevel(highestRaw ?? current);
    final completedRaw = data['games_completed'] as List<dynamic>? ?? const [];
    final completed =
        completedRaw.map((e) => (e as num).toInt()).where((e) => e > 0).toList()
          ..sort();
    final won = (data['games_won'] as num?)?.toInt() ?? 0;
    final xpRaw = data['user_xp'];
    final streakRaw = data['login_streak'];
    final classicRaw = data['classic_best_streak'];
    return AdventureProgressData(
      currentGame: current,
      highestUnlockedGame: highest,
      gamesCompleted: completed,
      gamesWon: won,
      userXp: xpRaw is num ? xpRaw.toInt() : null,
      loginStreak: streakRaw is num ? streakRaw.toInt() : null,
      classicBestStreak: classicRaw is num ? classicRaw.toInt() : null,
      xpAux: _xpAuxFromRemoteMap(Map<String, dynamic>.from(data)),
    );
  } catch (_) {
    rethrow;
  }
}

Future<void> _upsertRemoteAdventureProgress({
  required String userId,
  required int currentGame,
  required int highestUnlockedGame,
  int? gamesWon,
  int? dashboardLoginStreak,
  int? dashboardClassicBest,
  XpAuxState? xpAux,
}) async {
  if (supabaseClient == null) return;
  final safeCurrent = _clampLevel(currentGame);
  final safeHighest = _clampLevel(highestUnlockedGame);
  final completed = safeHighest > 1
      ? List.generate(safeHighest - 1, (i) => i + 1)
      : <int>[];
  final prefs = await AccountPreferences.forUser(userId);
  final streakOut =
      dashboardLoginStreak ?? prefs.getInt(_prefLoginStreakKey) ?? 0;
  final classicOut =
      dashboardClassicBest ?? prefs.getInt(_prefClassicBestStreakKey) ?? 0;
  final auxOut = xpAux ?? await _readLocalXpAuxState(prefs);
  final ts = DateTime.now().toIso8601String();
  final legacyPayload = <String, dynamic>{
    'user_id': userId,
    'current_game': safeCurrent,
    'highest_unlocked_game': safeHighest,
    'games_completed': completed,
    'games_won': gamesWon ?? completed.length,
    'updated_at': ts,
  };
  final statsPayload = <String, dynamic>{
    ...legacyPayload,
    'login_streak': streakOut,
    'classic_best_streak': classicOut,
  };
  final fullPayload = <String, dynamic>{
    ...statsPayload,
    ..._xpAuxToRemoteMap(auxOut),
  };
  await supabaseClient!
      .from('adventure_progress')
      .upsert(fullPayload, onConflict: 'user_id');
}

int _mergeMaxStat(int local, int? remote) {
  if (remote == null) return local;
  return math.max(local, remote);
}

String _todayDateString() {
  final now = DateTime.now();
  final month = now.month.toString().padLeft(2, '0');
  final day = now.day.toString().padLeft(2, '0');
  return '${now.year}-$month-$day';
}

Future<XpAuxState> _readLocalXpAuxState(AccountPreferences prefs) async {
  final clearedRaw =
      prefs.getStringList(_prefAdventureLevelsFirstClearXp) ?? const [];
  final cleared =
      clearedRaw
          .map((e) => int.tryParse(e))
          .whereType<int>()
          .where((e) => e > 0)
          .toList()
        ..sort();
  return XpAuxState(
    dailyChallengeDate: prefs.getString(_prefDailyChallengeDate),
    dailyChallengeWon: prefs.containsKey(_prefDailyChallengeWon)
        ? prefs.getBool(_prefDailyChallengeWon)
        : null,
    adventureConsecutiveWins: prefs.getInt(_prefAdventureConsecutiveWins) ?? 0,
    adventureConsecutiveLosses: (await readXpLedger(prefs)).losses,
    adventureLevelsFirstClear: cleared,
    adventureFirstClearXpMigrated:
        prefs.getBool(_prefAdventureFirstClearXpMigrated) ?? false,
  );
}

Future<void> _writeLocalXpAuxState(
  AccountPreferences prefs,
  XpAuxState aux,
) async {
  if (aux.dailyChallengeDate == null) {
    await prefs.remove(_prefDailyChallengeDate);
  } else {
    await prefs.setString(_prefDailyChallengeDate, aux.dailyChallengeDate!);
  }
  if (aux.dailyChallengeWon == null) {
    await prefs.remove(_prefDailyChallengeWon);
  } else {
    await prefs.setBool(_prefDailyChallengeWon, aux.dailyChallengeWon!);
  }
  await prefs.setInt(
    _prefAdventureConsecutiveWins,
    aux.adventureConsecutiveWins,
  );
  final list = aux.adventureLevelsFirstClear.map((e) => e.toString()).toList()
    ..sort((a, b) => int.parse(a).compareTo(int.parse(b)));
  await prefs.setStringList(_prefAdventureLevelsFirstClearXp, list);
  await prefs.setBool(
    _prefAdventureFirstClearXpMigrated,
    aux.adventureFirstClearXpMigrated,
  );
}

XpAuxState _xpAuxFromRemoteMap(Map<String, dynamic> data) {
  final clearedRaw =
      data['adventure_levels_first_clear'] as List<dynamic>? ?? const [];
  final cleared =
      clearedRaw.map((e) => (e as num).toInt()).where((e) => e > 0).toList()
        ..sort();
  final wonRaw = data['daily_challenge_won'];
  return XpAuxState(
    dailyChallengeDate: data['daily_challenge_date'] as String?,
    dailyChallengeWon: wonRaw is bool ? wonRaw : null,
    adventureConsecutiveWins:
        (data['adventure_consecutive_wins'] as num?)?.toInt() ?? 0,
    adventureConsecutiveLosses:
        (data['adventure_consecutive_losses'] as num?)?.toInt() ?? 0,
    adventureLevelsFirstClear: cleared,
    adventureFirstClearXpMigrated:
        data['adventure_first_clear_xp_migrated'] == true,
  );
}

Map<String, dynamic> _xpAuxToRemoteMap(XpAuxState aux) => {
  'daily_challenge_date': aux.dailyChallengeDate,
  'daily_challenge_won': aux.dailyChallengeWon,
  'adventure_consecutive_wins': aux.adventureConsecutiveWins,
  'adventure_levels_first_clear': aux.adventureLevelsFirstClear,
  'adventure_first_clear_xp_migrated': aux.adventureFirstClearXpMigrated,
};

List<int> _mergeFirstClearLevels(List<int> local, List<int> remote) {
  final merged = <int>{...local, ...remote}.toList()..sort();
  return merged;
}

({String? dailyChallengeDate, bool? dailyChallengeWon}) _mergeDailyChallenge(
  XpAuxState local,
  XpAuxState remote,
) {
  final today = _todayDateString();
  final localPlayedToday = local.dailyChallengeDate == today;
  final remotePlayedToday = remote.dailyChallengeDate == today;

  if (localPlayedToday && remotePlayedToday) {
    return (
      dailyChallengeDate: today,
      dailyChallengeWon:
          local.dailyChallengeWon == true || remote.dailyChallengeWon == true,
    );
  }
  if (remotePlayedToday) {
    return (
      dailyChallengeDate: today,
      dailyChallengeWon: remote.dailyChallengeWon,
    );
  }
  if (localPlayedToday) {
    return (
      dailyChallengeDate: today,
      dailyChallengeWon: local.dailyChallengeWon,
    );
  }
  if (local.dailyChallengeDate == null && remote.dailyChallengeDate == null) {
    return (dailyChallengeDate: null, dailyChallengeWon: null);
  }
  if (local.dailyChallengeDate == null) {
    return (
      dailyChallengeDate: remote.dailyChallengeDate,
      dailyChallengeWon: remote.dailyChallengeWon,
    );
  }
  if (remote.dailyChallengeDate == null) {
    return (
      dailyChallengeDate: local.dailyChallengeDate,
      dailyChallengeWon: local.dailyChallengeWon,
    );
  }
  final localDate = local.dailyChallengeDate!;
  final remoteDate = remote.dailyChallengeDate!;
  if (localDate.compareTo(remoteDate) >= 0) {
    return (
      dailyChallengeDate: local.dailyChallengeDate,
      dailyChallengeWon: local.dailyChallengeWon,
    );
  }
  return (
    dailyChallengeDate: remote.dailyChallengeDate,
    dailyChallengeWon: remote.dailyChallengeWon,
  );
}

XpAuxState _mergeXpAuxState(XpAuxState local, XpAuxState remote) {
  final daily = _mergeDailyChallenge(local, remote);
  return XpAuxState(
    dailyChallengeDate: daily.dailyChallengeDate,
    dailyChallengeWon: daily.dailyChallengeWon,
    adventureConsecutiveWins: math.min(
      1,
      math.max(local.adventureConsecutiveWins, remote.adventureConsecutiveWins),
    ),
    adventureConsecutiveLosses: local.adventureConsecutiveLosses,
    adventureLevelsFirstClear: _mergeFirstClearLevels(
      local.adventureLevelsFirstClear,
      remote.adventureLevelsFirstClear,
    ),
    adventureFirstClearXpMigrated:
        local.adventureFirstClearXpMigrated ||
        remote.adventureFirstClearXpMigrated,
  );
}

Future<AdventureProgressData> _localSnapshot(AccountPreferences prefs) async {
  final current = _clampLevel(prefs.getInt(_prefAdventureCurrentLevel) ?? 1);
  final highest = math.max(
    current,
    prefs.getInt(_prefAdventureHighestUnlockedLevel) ?? 1,
  );
  return AdventureProgressData(
    currentGame: current,
    highestUnlockedGame: highest,
    gamesCompleted: highest > 1
        ? List.generate(highest - 1, (i) => i + 1)
        : const [],
    gamesWon: highest - 1,
    userXp: (await readXpLedger(prefs)).xp,
    loginStreak: prefs.getInt(_prefLoginStreakKey) ?? 0,
    classicBestStreak: prefs.getInt(_prefClassicBestStreakKey) ?? 0,
    xpAux: await _readLocalXpAuxState(prefs),
  );
}

/// Sync progress metadata; XP and resettable failure counters use the event ledger.
Future<AdventureProgressData> syncAdventureProgress({
  bool preferLocalDashboardStats = false,
}) async {
  final prefs = await AccountPreferences.getInstance();
  final userId = prefs.userId;
  final localCurrent = _clampLevel(
    prefs.getInt(_prefAdventureCurrentLevel) ?? 1,
  );
  final localHighest = math.max(
    localCurrent,
    prefs.getInt(_prefAdventureHighestUnlockedLevel) ?? 1,
  );
  final resetPending = prefs.getBool(_prefAdventureResetPending) ?? false;
  AdventureProgressData? remote;
  if (userId != null) {
    // A read failure aborts before any upload; it is never treated as a new player.
    try {
      remote = await _loadRemoteAdventureProgress(userId);
      await syncXpLedger(prefs);
    } catch (_) {
      return _localSnapshot(prefs);
    }
  }
  final aux = await _readLocalXpAuxState(prefs);
  final mergedAux = _mergeXpAuxState(aux, remote?.xpAux ?? const XpAuxState());
  final highest = resetPending
      ? localHighest
      : math.max(localHighest, remote?.highestUnlockedGame ?? 1);
  final current = resetPending || localCurrent != 1 || localHighest != 1
      ? localCurrent
      : remote?.currentGame ?? localCurrent;
  final streak = _mergeMaxStat(
    prefs.getInt(_prefLoginStreakKey) ?? 0,
    remote?.loginStreak,
  );
  final classic = _mergeMaxStat(
    prefs.getInt(_prefClassicBestStreakKey) ?? 0,
    remote?.classicBestStreak,
  );
  if (userId != null) {
    try {
      await _upsertRemoteAdventureProgress(
        userId: userId,
        currentGame: current,
        highestUnlockedGame: highest,
        gamesWon: resetPending ? 0 : remote?.gamesWon,
        dashboardLoginStreak: streak,
        dashboardClassicBest: classic,
        xpAux: mergedAux,
      );
    } catch (_) {
      return _localSnapshot(prefs);
    }
  }
  // Do not replace changes made while a network request was in flight.
  if ((prefs.getInt(_prefAdventureCurrentLevel) ?? 1) == localCurrent) {
    await prefs.setInt(_prefAdventureCurrentLevel, current);
  }
  await prefs.setInt(
    _prefAdventureHighestUnlockedLevel,
    math.max(prefs.getInt(_prefAdventureHighestUnlockedLevel) ?? 1, highest),
  );
  await prefs.setInt(_prefLoginStreakKey, streak);
  await prefs.setInt(_prefClassicBestStreakKey, classic);
  await _writeLocalXpAuxState(prefs, mergedAux);
  if (resetPending) await prefs.setBool(_prefAdventureResetPending, false);
  final latest = await readXpLedger(prefs);
  return AdventureProgressData(
    currentGame: current,
    highestUnlockedGame: highest,
    gamesCompleted: highest > 1
        ? List.generate(highest - 1, (i) => i + 1)
        : const [],
    gamesWon: resetPending ? 0 : remote?.gamesWon ?? highest - 1,
    userXp: latest.xp,
    loginStreak: streak,
    classicBestStreak: classic,
    xpAux: mergedAux,
  );
}

/// Save the player's currently selected level.
///
/// This will **never decrease** the highest unlocked level; it only updates the
/// highest if the new current exceeds it.
Future<void> saveAdventureLevel(int level) async {
  final prefs = await AccountPreferences.getInstance();
  final current = _clampLevel(level);
  final highest = math.max(
    current,
    prefs.getInt(_prefAdventureHighestUnlockedLevel) ?? 1,
  );
  await prefs.setInt(_prefAdventureCurrentLevel, current);
  await prefs.setInt(_prefAdventureHighestUnlockedLevel, highest);
  await prefs.setInt(_prefLegacyHighestUnlockedGame, highest);
  await prefs.setInt(_prefLegacyCurrentGameLevel, current);
  scheduleProgressCloudSync();
}

Future<void> resetAdventureProgress() async {
  final prefs = await AccountPreferences.getInstance();
  await prefs.setInt(_prefAdventureCurrentLevel, 1);
  await prefs.setInt(_prefAdventureHighestUnlockedLevel, 1);
  await prefs.setInt(_prefLegacyHighestUnlockedGame, 1);
  await prefs.setInt(_prefLegacyCurrentGameLevel, 1);
  await recordXpEvent(prefs, 'adventure_reset');
  await prefs.setBool(_prefAdventureResetPending, prefs.userId != null);
  scheduleProgressCloudSync();
}
