import 'package:shared_preferences/shared_preferences.dart';
import 'supabase_client.dart';

const String _prefAdventureLevel = 'adventure_current_level';

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

Future<int> getLocalAdventureLevel() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getInt(_prefAdventureLevel) ?? 1;
}

Future<void> setLocalAdventureLevel(int level) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setInt(_prefAdventureLevel, level.clamp(1, 0x7FFFFFFF));
}

Future<AdventureProgressData?> _loadRemoteAdventureProgress(String userId) async {
  if (supabaseClient == null) return null;
  try {
    final data = await supabaseClient!
        .from('adventure_progress')
        .select()
        .eq('user_id', userId)
        .single();
    final current = (data['current_game'] as num?)?.toInt() ?? 1;
    final highest = (data['highest_unlocked_game'] as num?)?.toInt() ?? current;
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
  required int level,
  int? gamesWon,
}) async {
  if (supabaseClient == null) return;
  final safeLevel = level.clamp(1, 0x7FFFFFFF);
  final completed = safeLevel > 1 ? List.generate(safeLevel - 1, (i) => i + 1) : <int>[];
  await supabaseClient!.from('adventure_progress').upsert({
    'user_id': userId,
    'current_game': safeLevel,
    'highest_unlocked_game': safeLevel,
    'games_completed': completed,
    'games_won': gamesWon ?? completed.length,
    'updated_at': DateTime.now().toIso8601String(),
  });
}

/// Merge local and remote progress using the highest reached level.
/// If signed out or Supabase is unavailable, this only uses local storage.
Future<int> syncAdventureProgress() async {
  final localLevel = await getLocalAdventureLevel();
  final userId = supabaseClient?.auth.currentUser?.id;
  if (userId == null) return localLevel;

  final remote = await _loadRemoteAdventureProgress(userId);
  if (remote == null) {
    await _upsertRemoteAdventureProgress(userId: userId, level: localLevel);
    return localLevel;
  }

  final remoteLevel = remote.currentGame > remote.highestUnlockedGame
      ? remote.currentGame
      : remote.highestUnlockedGame;
  final mergedLevel = localLevel > remoteLevel ? localLevel : remoteLevel;

  if (mergedLevel != localLevel) {
    await setLocalAdventureLevel(mergedLevel);
  }

  if (mergedLevel != remoteLevel) {
    await _upsertRemoteAdventureProgress(
      userId: userId,
      level: mergedLevel,
      gamesWon: remote.gamesWon > 0 ? remote.gamesWon : null,
    );
  }

  return mergedLevel;
}

/// Save level locally and remotely (if signed in).
Future<void> saveAdventureLevel(int level) async {
  final safeLevel = level.clamp(1, 0x7FFFFFFF);
  await setLocalAdventureLevel(safeLevel);
  final userId = supabaseClient?.auth.currentUser?.id;
  if (userId == null) return;
  await _upsertRemoteAdventureProgress(userId: userId, level: safeLevel);
}

Future<void> resetAdventureProgress() async {
  await saveAdventureLevel(1);
}
