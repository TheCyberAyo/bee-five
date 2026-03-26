import 'package:shared_preferences/shared_preferences.dart';
import 'supabase_client.dart';

/// Local preference keys.
///
/// `_prefAdventureCurrentLevel` existed historically and stored "highest reached".
/// We now track both the currently selected level and the highest unlocked level.
const String _prefAdventureCurrentLevel = 'adventure_current_level';
const String _prefAdventureHighestUnlockedLevel = 'adventure_highest_unlocked_level';

class AdventureProgressData {
  final int currentGame;
  final int highestUnlockedGame;
  final List<int> gamesCompleted;
  final int gamesWon;

  const AdventureProgressData({
    required this.currentGame,
    required this.highestUnlockedGame,
    required this.gamesCompleted,
    required this.gamesWon,
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
    return AdventureProgressData(
      currentGame: current,
      highestUnlockedGame: highest,
      gamesCompleted: completed,
      gamesWon: won,
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
}) async {
  if (supabaseClient == null) return;
  final safeCurrent = _clampLevel(currentGame);
  final safeHighest = _clampLevel(highestUnlockedGame);
  final completed = safeHighest > 1 ? List.generate(safeHighest - 1, (i) => i + 1) : <int>[];
  await supabaseClient!.from('adventure_progress').upsert({
    'user_id': userId,
    'current_game': safeCurrent,
    'highest_unlocked_game': safeHighest,
    'games_completed': completed,
    'games_won': gamesWon ?? completed.length,
    'updated_at': DateTime.now().toIso8601String(),
  });
}

/// Merge local and remote progress.
///
/// - **Highest unlocked** only ever increases (unless explicitly reset).
/// - **Current level** can be any level the player chooses to replay.
Future<AdventureProgressData> syncAdventureProgress() async {
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
    );
  }

  final remote = await _loadRemoteAdventureProgress(userId);
  if (remote == null) {
    final mergedHighest = localHighest > localCurrent ? localHighest : localCurrent;
    await _upsertRemoteAdventureProgress(
      userId: userId,
      currentGame: localCurrent,
      highestUnlockedGame: mergedHighest,
    );
    if (mergedHighest != localHighest) {
      await setLocalAdventureHighestUnlockedLevel(mergedHighest);
    }
    return AdventureProgressData(
      currentGame: localCurrent,
      highestUnlockedGame: mergedHighest,
      gamesCompleted: mergedHighest > 1 ? List.generate(mergedHighest - 1, (i) => i + 1) : const <int>[],
      gamesWon: mergedHighest > 1 ? (mergedHighest - 1) : 0,
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

  if (mergedCurrent != remote.currentGame || mergedHighest != remote.highestUnlockedGame) {
    await _upsertRemoteAdventureProgress(
      userId: userId,
      currentGame: mergedCurrent,
      highestUnlockedGame: mergedHighest,
      gamesWon: remote.gamesWon > 0 ? remote.gamesWon : null,
    );
  }

  return AdventureProgressData(
    currentGame: mergedCurrent,
    highestUnlockedGame: mergedHighest,
    gamesCompleted: mergedHighest > 1 ? List.generate(mergedHighest - 1, (i) => i + 1) : const <int>[],
    gamesWon: remote.gamesWon > 0 ? remote.gamesWon : (mergedHighest > 1 ? (mergedHighest - 1) : 0),
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
  final userId = supabaseClient?.auth.currentUser?.id;
  if (userId == null) return;
  await _upsertRemoteAdventureProgress(userId: userId, currentGame: 1, highestUnlockedGame: 1, gamesWon: 0);
}
