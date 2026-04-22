import 'package:shared_preferences/shared_preferences.dart';

import 'adventure_progress_service.dart' show scheduleProgressCloudSync;

/// Pref keys (must match dashboard_page.dart).
const String _prefUserXp = 'user_xp';
const String _prefLoginStreak = 'login_streak';

/// Default XP for new users.
const int defaultXp = 10;

/// XP awarded per calendar day of logging in.
const int xpPerLoginDay = 2;

/// XP for 3 consecutive wins in classic game.
const int xpClassicThreeWins = 2;

/// XP for winning a hard practice game.
const int xpHardPracticeWin = 1;

/// XP lost per adventure game loss (each loss = -1 XP).
const int xpAdventureOneLoss = 1;

/// XP for 2 consecutive adventure game wins.
const int xpAdventureTwoWins = 1;

/// XP for completing a multiple-of-10 adventure level.
const int xpAdventureMultipleOf10 = 5;

/// XP for winning the daily challenge (once per day).
const int xpDailyChallengeWin = 3;

const String _prefLastLoginDate = 'last_login_date';
const String _prefDailyChallengeDate = 'daily_challenge_date';
const String _prefDailyChallengeWon = 'daily_challenge_won';
const String _prefAdventureConsecutiveLosses = 'adventure_consecutive_losses';
const String _prefAdventureConsecutiveWins = 'adventure_consecutive_wins';
const String _prefAdventureHighestUnlockedLevel = 'adventure_highest_unlocked_level';
const String _prefAdventureCurrentLevel = 'adventure_current_level';

Future<bool> _isAdventureFrontierLevel(int levelJustPlayedOrCompleted) async {
  final prefs = await SharedPreferences.getInstance();
  final highest = prefs.getInt(_prefAdventureHighestUnlockedLevel) ??
      prefs.getInt(_prefAdventureCurrentLevel) ??
      1;
  // XP should only be earned when the player is progressing at their highest unlocked level.
  return levelJustPlayedOrCompleted == highest;
}

/// Ensures XP is initialized to [defaultXp] if never set.
Future<void> ensureXpInitialized() async {
  final prefs = await SharedPreferences.getInstance();
  if (prefs.getInt(_prefUserXp) == null) {
    await prefs.setInt(_prefUserXp, defaultXp);
  }
}

/// Call when app is opened (e.g. home page init). Adds +2 XP per calendar day
/// of login and updates streak.
Future<void> onAppOpen() async {
  final prefs = await SharedPreferences.getInstance();
  await ensureXpInitialized();

  final now = DateTime.now();
  final today = '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
  final last = prefs.getString(_prefLastLoginDate);

  if (last == today) return; // Already counted today

  int xp = prefs.getInt(_prefUserXp) ?? defaultXp;
  int streak = prefs.getInt(_prefLoginStreak) ?? 0;

  if (last == null) {
    streak = 1;
  } else {
    final lastDate = DateTime.tryParse(last);
    if (lastDate != null) {
      final diff = now.difference(lastDate).inDays;
      if (diff == 1) {
        streak += 1;
      } else if (diff > 1) {
        streak = 1;
      }
    } else {
      streak = 1;
    }
  }

  xp += xpPerLoginDay;
  await prefs.setInt(_prefUserXp, xp);
  await prefs.setInt(_prefLoginStreak, streak);
  await prefs.setString(_prefLastLoginDate, today);
  scheduleProgressCloudSync();
}

/// Returns current XP (never null after [ensureXpInitialized]).
Future<int> getXp() async {
  final prefs = await SharedPreferences.getInstance();
  await ensureXpInitialized();
  return prefs.getInt(_prefUserXp) ?? defaultXp;
}

/// Adds [delta] XP (clamped so total is non-negative).
Future<int> addXp(int delta) async {
  if (delta <= 0) return await getXp();
  final prefs = await SharedPreferences.getInstance();
  final current = prefs.getInt(_prefUserXp) ?? defaultXp;
  final next = current + delta;
  await prefs.setInt(_prefUserXp, next);
  scheduleProgressCloudSync();
  return next;
}

/// Removes [delta] XP (clamped so total is non-negative).
Future<int> removeXp(int delta) async {
  if (delta <= 0) return await getXp();
  final prefs = await SharedPreferences.getInstance();
  final current = prefs.getInt(_prefUserXp) ?? defaultXp;
  final next = (current - delta).clamp(0, 0x7FFFFFFF);
  await prefs.setInt(_prefUserXp, next);
  scheduleProgressCloudSync();
  return next;
}

/// Adventure: call when player loses a game. Returns (new XP, delta). Applies -1 XP per loss.
/// Also resets consecutive wins.
Future<(int, int)> onAdventureMatchLost({int? levelJustPlayed}) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setInt(_prefAdventureConsecutiveWins, 0); // reset win streak on loss

  if (levelJustPlayed != null) {
    final eligible = await _isAdventureFrontierLevel(levelJustPlayed);
    if (!eligible) {
      final xp = await getXp();
      return (xp, 0);
    }
  }

  final newXp = await removeXp(xpAdventureOneLoss);
  return (newXp, -xpAdventureOneLoss);
}

/// Adventure: call when player wins a game. Returns (new XP, delta). +1 if 2 consecutive wins.
Future<(int, int)> onAdventureGameWon({int? levelJustPlayed}) async {
  if (levelJustPlayed != null) {
    final eligible = await _isAdventureFrontierLevel(levelJustPlayed);
    if (!eligible) {
      final xp = await getXp();
      return (xp, 0);
    }
  }

  final prefs = await SharedPreferences.getInstance();
  int wins = prefs.getInt(_prefAdventureConsecutiveWins) ?? 0;
  wins += 1;
  await prefs.setInt(_prefAdventureConsecutiveWins, wins);

  if (wins >= 2) {
    await prefs.setInt(_prefAdventureConsecutiveWins, 0);
    final newXp = await addXp(xpAdventureTwoWins);
    return (newXp, xpAdventureTwoWins);
  }
  final xp = await getXp();
  return (xp, 0);
}

/// Adventure: call when player wins the level (before advancing). Resets consecutive losses.
/// Pass [levelJustCompleted] (e.g. currentGame before increment). Returns (new XP, delta). +5 if multiple of 10.
Future<(int, int)> onAdventureLevelWon(int levelJustCompleted) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setInt(_prefAdventureConsecutiveLosses, 0);
  // consecutive wins are not reset on level win (they carry across levels)

  final eligible = await _isAdventureFrontierLevel(levelJustCompleted);
  if (!eligible) {
    final xp = await getXp();
    return (xp, 0);
  }

  if (levelJustCompleted > 0 && levelJustCompleted % 10 == 0) {
    final newXp = await addXp(xpAdventureMultipleOf10);
    return (newXp, xpAdventureMultipleOf10);
  }
  final xp = await getXp();
  return (xp, 0);
}

/// Classic: call when human wins in classic streak mode. Returns (new XP, delta). +2 if 3rd consecutive win.
Future<(int, int)> onClassicStreakWin(int classicGamesWonAfterThisWin) async {
  if (classicGamesWonAfterThisWin >= 3 && classicGamesWonAfterThisWin % 3 == 0) {
    final newXp = await addXp(xpClassicThreeWins);
    return (newXp, xpClassicThreeWins);
  }
  final xp = await getXp();
  return (xp, 0);
}

/// Practice: call when human wins a hard practice game. Returns (new XP, delta). +1 XP.
Future<(int, int)> onHardPracticeWin() async {
  final newXp = await addXp(xpHardPracticeWin);
  return (newXp, xpHardPracticeWin);
}

/// Daily challenge: returns whether the user played today and if so whether they won.
/// (playedToday, wonOrNull). wonOrNull is null if not played today.
Future<(bool playedToday, bool? won)> getDailyChallengeStatus() async {
  final prefs = await SharedPreferences.getInstance();
  final now = DateTime.now();
  final today = '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
  final lastDate = prefs.getString(_prefDailyChallengeDate);
  if (lastDate != today) return (false, null);
  final won = prefs.getBool(_prefDailyChallengeWon);
  return (true, won);
}

/// Daily challenge: call when the user finishes today's challenge. Awards +3 XP if [won].
Future<int> setDailyChallengeResult(bool won) async {
  final prefs = await SharedPreferences.getInstance();
  final now = DateTime.now();
  final today = '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
  await prefs.setString(_prefDailyChallengeDate, today);
  await prefs.setBool(_prefDailyChallengeWon, won);
  if (won) return await addXp(xpDailyChallengeWin);
  scheduleProgressCloudSync();
  return await getXp();
}

/// Returns today's challenge game index (0-based). Same for all users on the same calendar day.
int getTodaysChallengeGameIndex() {
  final now = DateTime.now();
  final dayCode = now.year * 10000 + now.month * 100 + now.day;
  return dayCode % 6; // 6 different challenge types
}
