import 'dart:async';
import 'dart:math' as math;

import 'package:shared_preferences/shared_preferences.dart';

import 'supabase_client.dart';

/// Matches keys in `dashboard_page.dart` / `xp_service.dart` (do not import those here — circular).
const String _prefUserXpKey = 'user_xp';
const String _prefLoginStreakKey = 'login_streak';
const String _prefClassicBestStreakKey = 'classic_best_streak';
const String _prefDailyChallengeDate = 'daily_challenge_date';
const String _prefDailyChallengeWon = 'daily_challenge_won';
const String _prefAdventureConsecutiveLosses = 'adventure_consecutive_losses';
const String _prefAdventureConsecutiveWins = 'adventure_consecutive_wins';
const String _prefAdventureLevelsFirstClearXp = 'adventure_levels_first_clear_xp';
const String _prefAdventureFirstClearXpMigrated = 'adventure_first_clear_xp_migrated';

/// Matches default XP in `xp_service.dart`.
const int _defaultUserXp = 10;

/// Local preference keys.
///
/// `_prefAdventureCurrentLevel` existed historically and stored "highest reached".
/// We now track both the currently selected level and the highest unlocked level.
const String _prefAdventureCurrentLevel = 'adventure_current_level';
const String _prefAdventureHighestUnlockedLevel = 'adventure_highest_unlocked_level';
const String _prefLegacyHighestUnlockedGame = 'highest_unlocked_game';
const String _prefLegacyCurrentGameLevel = 'current_game_level';
const String _prefAdventureResetPending = 'adventure_progress_reset_pending';

Timer? _syncProgressDebounce;

/// Debounced merge + upload after prefs change (XP, classic streak, etc.).
void scheduleProgressCloudSync() {
  _syncProgressDebounce?.cancel();
  _syncProgressDebounce = Timer(const Duration(milliseconds: 900), () async {
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
  final prefs = await SharedPreferences.getInstance();
  return _clampLevel(prefs.getInt(_prefAdventureCurrentLevel) ?? 1);
}

Future<int> getLocalAdventureHighestUnlockedLevel() async {
  final prefs = await SharedPreferences.getInstance();
  final current = prefs.getInt(_prefAdventureCurrentLevel) ?? 1;
  final highest = prefs.getInt(_prefAdventureHighestUnlockedLevel);
  return _clampLevel(highest ?? current);
}

Future<void> setLocalAdventureCurrentLevel(int level) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setInt(_prefAdventureCurrentLevel, _clampLevel(level));
}

Future<void> setLocalAdventureHighestUnlockedLevel(int level) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setInt(_prefAdventureHighestUnlockedLevel, _clampLevel(level));
}

Future<AdventureProgressData?> _loadRemoteAdventureProgress(String userId) async {
  if (supabaseClient == null) return null;
  try {
    final data = await supabaseClient!
        .from('adventure_progress')
        .select()
        .eq('user_id', userId)
        .single();
    final current = _clampLevel((data['current_game'] as num?)?.toInt() ?? 1);
    final highestRaw = (data['highest_unlocked_game'] as num?)?.toInt();
    final highest = _clampLevel(highestRaw ?? current);
    final completedRaw = data['games_completed'] as List<dynamic>? ?? const [];
    final completed = completedRaw
        .map((e) => (e as num).toInt())
        .where((e) => e > 0)
        .toList()
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
    return null;
  }
}

Future<void> _upsertRemoteAdventureProgress({
  required String userId,
  required int currentGame,
  required int highestUnlockedGame,
  int? gamesWon,
  int? dashboardXp,
  int? dashboardLoginStreak,
  int? dashboardClassicBest,
  XpAuxState? xpAux,
}) async {
  if (supabaseClient == null) return;
  final safeCurrent = _clampLevel(currentGame);
  final safeHighest = _clampLevel(highestUnlockedGame);
  final completed = safeHighest > 1 ? List.generate(safeHighest - 1, (i) => i + 1) : <int>[];
  final prefs = await SharedPreferences.getInstance();
  final xpOut = dashboardXp ?? prefs.getInt(_prefUserXpKey) ?? _defaultUserXp;
  final streakOut = dashboardLoginStreak ?? prefs.getInt(_prefLoginStreakKey) ?? 0;
  final classicOut = dashboardClassicBest ?? prefs.getInt(_prefClassicBestStreakKey) ?? 0;
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
    'user_xp': xpOut,
    'login_streak': streakOut,
    'classic_best_streak': classicOut,
  };
  final fullPayload = <String, dynamic>{
    ...statsPayload,
    ..._xpAuxToRemoteMap(auxOut),
  };
  try {
    await supabaseClient!.from('adventure_progress').upsert(
      fullPayload,
      onConflict: 'user_id',
    );
  } catch (_) {
    try {
      await supabaseClient!.from('adventure_progress').upsert(
        statsPayload,
        onConflict: 'user_id',
      );
    } catch (_) {
      await supabaseClient!.from('adventure_progress').upsert(
        legacyPayload,
        onConflict: 'user_id',
      );
    }
  }
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

Future<XpAuxState> _readLocalXpAuxState(SharedPreferences prefs) async {
  final clearedRaw = prefs.getStringList(_prefAdventureLevelsFirstClearXp) ?? const [];
  final cleared = clearedRaw
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
    adventureConsecutiveLosses: prefs.getInt(_prefAdventureConsecutiveLosses) ?? 0,
    adventureLevelsFirstClear: cleared,
    adventureFirstClearXpMigrated:
        prefs.getBool(_prefAdventureFirstClearXpMigrated) ?? false,
  );
}

Future<void> _writeLocalXpAuxState(SharedPreferences prefs, XpAuxState aux) async {
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
  await prefs.setInt(_prefAdventureConsecutiveWins, aux.adventureConsecutiveWins);
  await prefs.setInt(_prefAdventureConsecutiveLosses, aux.adventureConsecutiveLosses);
  final list = aux.adventureLevelsFirstClear.map((e) => e.toString()).toList()
    ..sort((a, b) => int.parse(a).compareTo(int.parse(b)));
  await prefs.setStringList(_prefAdventureLevelsFirstClearXp, list);
  await prefs.setBool(_prefAdventureFirstClearXpMigrated, aux.adventureFirstClearXpMigrated);
}

XpAuxState _xpAuxFromRemoteMap(Map<String, dynamic> data) {
  final clearedRaw = data['adventure_levels_first_clear'] as List<dynamic>? ?? const [];
  final cleared = clearedRaw
      .map((e) => (e as num).toInt())
      .where((e) => e > 0)
      .toList()
    ..sort();
  final wonRaw = data['daily_challenge_won'];
  return XpAuxState(
    dailyChallengeDate: data['daily_challenge_date'] as String?,
    dailyChallengeWon: wonRaw is bool ? wonRaw : null,
    adventureConsecutiveWins: (data['adventure_consecutive_wins'] as num?)?.toInt() ?? 0,
    adventureConsecutiveLosses: (data['adventure_consecutive_losses'] as num?)?.toInt() ?? 0,
    adventureLevelsFirstClear: cleared,
    adventureFirstClearXpMigrated: data['adventure_first_clear_xp_migrated'] == true,
  );
}

Map<String, dynamic> _xpAuxToRemoteMap(XpAuxState aux) => {
      'daily_challenge_date': aux.dailyChallengeDate,
      'daily_challenge_won': aux.dailyChallengeWon,
      'adventure_consecutive_wins': aux.adventureConsecutiveWins,
      'adventure_consecutive_losses': aux.adventureConsecutiveLosses,
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
      dailyChallengeWon: local.dailyChallengeWon == true || remote.dailyChallengeWon == true,
    );
  }
  if (remotePlayedToday) {
    return (dailyChallengeDate: today, dailyChallengeWon: remote.dailyChallengeWon);
  }
  if (localPlayedToday) {
    return (dailyChallengeDate: today, dailyChallengeWon: local.dailyChallengeWon);
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
    adventureConsecutiveLosses: math.max(
      local.adventureConsecutiveLosses,
      remote.adventureConsecutiveLosses,
    ),
    adventureLevelsFirstClear:
        _mergeFirstClearLevels(local.adventureLevelsFirstClear, remote.adventureLevelsFirstClear),
    adventureFirstClearXpMigrated:
        local.adventureFirstClearXpMigrated || remote.adventureFirstClearXpMigrated,
  );
}

/// Merge local and remote progress.
///
/// - **Highest unlocked** only ever increases (unless explicitly reset).
/// - **Current level** can be any level the player chooses to replay.
/// - **XP** on full merge uses the higher of local vs remote (wins propagate across devices).
///   Debounced uploads after local XP changes prefer local so losses are not undone.
/// - **Streak / classic best** use the higher of local vs remote.
Future<AdventureProgressData> syncAdventureProgress({
  bool preferLocalDashboardStats = false,
}) async {
  final prefs = await SharedPreferences.getInstance();
  final resetPending = prefs.getBool(_prefAdventureResetPending) ?? false;
  final localXp = prefs.getInt(_prefUserXpKey) ?? _defaultUserXp;
  final localStreak = prefs.getInt(_prefLoginStreakKey) ?? 0;
  final localClassic = prefs.getInt(_prefClassicBestStreakKey) ?? 0;
  final localXpAux = await _readLocalXpAuxState(prefs);

  final localCurrent = await getLocalAdventureCurrentLevel();
  final localHighest = await getLocalAdventureHighestUnlockedLevel();
  final userId = supabaseClient?.auth.currentUser?.id;
  if (userId == null) {
    final mergedHighest = localHighest > localCurrent ? localHighest : localCurrent;
    final mergedCurrent = localCurrent;
    if (mergedHighest != localHighest) {
      await setLocalAdventureHighestUnlockedLevel(mergedHighest);
    }
    return AdventureProgressData(
      currentGame: mergedCurrent,
      highestUnlockedGame: mergedHighest,
      gamesCompleted: mergedHighest > 1 ? List.generate(mergedHighest - 1, (i) => i + 1) : const <int>[],
      gamesWon: mergedHighest > 1 ? (mergedHighest - 1) : 0,
      userXp: null,
      loginStreak: null,
      classicBestStreak: null,
    );
  }

  final remote = await _loadRemoteAdventureProgress(userId);
  if (resetPending) {
    final forcedHighest = localHighest > localCurrent ? localHighest : localCurrent;
    await _upsertRemoteAdventureProgress(
      userId: userId,
      currentGame: localCurrent,
      highestUnlockedGame: forcedHighest,
      dashboardXp: localXp,
      dashboardLoginStreak: localStreak,
      dashboardClassicBest: localClassic,
      xpAux: localXpAux,
    );
    await prefs.setBool(_prefAdventureResetPending, false);
    await _writeLocalXpAuxState(prefs, localXpAux);
    return AdventureProgressData(
      currentGame: localCurrent,
      highestUnlockedGame: forcedHighest,
      gamesCompleted: forcedHighest > 1 ? List.generate(forcedHighest - 1, (i) => i + 1) : const <int>[],
      gamesWon: forcedHighest > 1 ? (forcedHighest - 1) : 0,
      userXp: localXp,
      loginStreak: localStreak,
      classicBestStreak: localClassic,
      xpAux: localXpAux,
    );
  }

  if (remote == null) {
    final mergedHighest = localHighest > localCurrent ? localHighest : localCurrent;
    await _upsertRemoteAdventureProgress(
      userId: userId,
      currentGame: localCurrent,
      highestUnlockedGame: mergedHighest,
      dashboardXp: localXp,
      dashboardLoginStreak: localStreak,
      dashboardClassicBest: localClassic,
      xpAux: localXpAux,
    );
    if (mergedHighest != localHighest) {
      await setLocalAdventureHighestUnlockedLevel(mergedHighest);
    }
    await _writeLocalXpAuxState(prefs, localXpAux);
    return AdventureProgressData(
      currentGame: localCurrent,
      highestUnlockedGame: mergedHighest,
      gamesCompleted: mergedHighest > 1 ? List.generate(mergedHighest - 1, (i) => i + 1) : const <int>[],
      gamesWon: mergedHighest > 1 ? (mergedHighest - 1) : 0,
      userXp: localXp,
      loginStreak: localStreak,
      classicBestStreak: localClassic,
      xpAux: localXpAux,
    );
  }

  final remoteHighest = remote.highestUnlockedGame > remote.currentGame
      ? remote.highestUnlockedGame
      : remote.currentGame;

  final mergedHighest = () {
    var h = localHighest;
    if (localCurrent > h) h = localCurrent;
    if (remoteHighest > h) h = remoteHighest;
    return h;
  }();

  // Prefer local "current" once the device has any real state beyond defaults.
  // Otherwise (fresh install), use the remote current.
  final hasMeaningfulLocalState = localCurrent != 1 || localHighest != 1;
  final mergedCurrent = _clampLevel(hasMeaningfulLocalState ? localCurrent : remote.currentGame);

  if (mergedCurrent != localCurrent) {
    await setLocalAdventureCurrentLevel(mergedCurrent);
  }
  if (mergedHighest != localHighest) {
    await setLocalAdventureHighestUnlockedLevel(mergedHighest);
  }

  final mergedXp = preferLocalDashboardStats
      ? localXp
      : _mergeMaxStat(localXp, remote.userXp);
  final mergedStreak = _mergeMaxStat(localStreak, remote.loginStreak);
  final mergedClassic = _mergeMaxStat(localClassic, remote.classicBestStreak);
  final mergedXpAux = _mergeXpAuxState(localXpAux, remote.xpAux ?? const XpAuxState());

  if (mergedXp != localXp) await prefs.setInt(_prefUserXpKey, mergedXp);
  if (mergedStreak != localStreak) await prefs.setInt(_prefLoginStreakKey, mergedStreak);
  if (mergedClassic != localClassic) await prefs.setInt(_prefClassicBestStreakKey, mergedClassic);
  await _writeLocalXpAuxState(prefs, mergedXpAux);

  await _upsertRemoteAdventureProgress(
    userId: userId,
    currentGame: mergedCurrent,
    highestUnlockedGame: mergedHighest,
    gamesWon: remote.gamesWon > 0 ? remote.gamesWon : null,
    dashboardXp: mergedXp,
    dashboardLoginStreak: mergedStreak,
    dashboardClassicBest: mergedClassic,
    xpAux: mergedXpAux,
  );

  return AdventureProgressData(
    currentGame: mergedCurrent,
    highestUnlockedGame: mergedHighest,
    gamesCompleted: mergedHighest > 1 ? List.generate(mergedHighest - 1, (i) => i + 1) : const <int>[],
    gamesWon: remote.gamesWon > 0 ? remote.gamesWon : (mergedHighest > 1 ? (mergedHighest - 1) : 0),
    userXp: mergedXp,
    loginStreak: mergedStreak,
    classicBestStreak: mergedClassic,
    xpAux: mergedXpAux,
  );
}

/// Save the player's currently selected level.
///
/// This will **never decrease** the highest unlocked level; it only updates the
/// highest if the new current exceeds it.
Future<void> saveAdventureLevel(int level) async {
  final safeCurrent = _clampLevel(level);
  final localHighest = await getLocalAdventureHighestUnlockedLevel();
  final nextHighest = localHighest > safeCurrent ? localHighest : safeCurrent;

  await setLocalAdventureCurrentLevel(safeCurrent);
  if (nextHighest != localHighest) {
    await setLocalAdventureHighestUnlockedLevel(nextHighest);
  }

  // `home_page._loadHighest()` and older code paths still read these legacy keys.
  // Keep them in sync whenever adventure prefs change so cold starts never regress.
  final prefs = await SharedPreferences.getInstance();
  await prefs.setInt(_prefLegacyHighestUnlockedGame, nextHighest);
  await prefs.setInt(_prefLegacyCurrentGameLevel, safeCurrent);

  final userId = supabaseClient?.auth.currentUser?.id;
  if (userId == null) return;

  final remote = await _loadRemoteAdventureProgress(userId);
  final remoteHighest = remote == null
      ? 1
      : (remote.highestUnlockedGame > remote.currentGame ? remote.highestUnlockedGame : remote.currentGame);
  final mergedHighest = remoteHighest > nextHighest ? remoteHighest : nextHighest;

  await _upsertRemoteAdventureProgress(
    userId: userId,
    currentGame: safeCurrent,
    highestUnlockedGame: mergedHighest,
    gamesWon: remote?.gamesWon,
  );
}

Future<void> resetAdventureProgress() async {
  await setLocalAdventureCurrentLevel(1);
  await setLocalAdventureHighestUnlockedLevel(1);
  // Keep legacy keys in sync so dashboard/home never resurrect stale progress.
  final prefs = await SharedPreferences.getInstance();
  await prefs.setBool(_prefAdventureResetPending, true);
  await prefs.setInt(_prefLegacyHighestUnlockedGame, 1);
  await prefs.setInt(_prefLegacyCurrentGameLevel, 1);
  final userId = supabaseClient?.auth.currentUser?.id;
  if (userId == null) {
    await prefs.setBool(_prefAdventureResetPending, false);
    return;
  }
  final xp = prefs.getInt(_prefUserXpKey) ?? _defaultUserXp;
  final streak = prefs.getInt(_prefLoginStreakKey) ?? 0;
  final classic = prefs.getInt(_prefClassicBestStreakKey) ?? 0;
  await _upsertRemoteAdventureProgress(
    userId: userId,
    currentGame: 1,
    highestUnlockedGame: 1,
    gamesWon: 0,
    dashboardXp: xp,
    dashboardLoginStreak: streak,
    dashboardClassicBest: classic,
  );
  await prefs.setBool(_prefAdventureResetPending, false);
}
