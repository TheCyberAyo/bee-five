import 'xp_ledger.dart';
import 'dart:math' as math;

import 'account_preferences.dart';

import 'adventure_progress_service.dart' show scheduleProgressCloudSync;

/// Pref keys (must match dashboard_page.dart).
const String _prefUserXp = 'user_xp';
const String _prefLoginStreak = 'login_streak';

/// Default XP for new users.
const int defaultXp = 10;

/// XP for 3 consecutive wins in classic game.
const int xpClassicThreeWins = 2;

/// XP for winning a hard practice game.
const int xpHardPracticeWin = 1;

/// XP for winning an adventure game/match.
const int xpAdventureMatchWin = 1;

/// XP for clearing adventure levels 10, 20, 30, …
const int xpAdventureMilestoneLevelWin = 3;

/// XP lost per adventure game loss (each loss = -1 XP).
const int xpAdventureOneLoss = 1;

/// Frontier-level failures before offering a rewarded ad to skip to the next level.
const int adventureLossesBeforeSkipAdOffer = 4;

/// School lobby multiplayer: win / loss delta (loss uses [removeXp], clamped at 0).
const int xpSchoolLobbyMatchDelta = 1;

/// XP awarded after watching a rewarded ad on the home map / Gain XP flows.
const int xpRewardedAdWatch = 2;

const String _prefLastLoginDate = 'last_login_date';
const String _prefDailyChallengeDate = 'daily_challenge_date';
const String _prefDailyChallengeWon = 'daily_challenge_won';
const String _prefAdventureConsecutiveWins = 'adventure_consecutive_wins';
const String _prefAdventureHighestUnlockedLevel =
    'adventure_highest_unlocked_level';
const String _prefAdventureCurrentLevel = 'adventure_current_level';
const String _prefAdventureLevelsFirstClearXp =
    'adventure_levels_first_clear_xp';
const String _prefAdventureFirstClearXpMigrated =
    'adventure_first_clear_xp_migrated';

/// One-time: treat all levels strictly below the current top as already rewarded for first-clear
/// (+1) so existing saves do not mass-award XP on upgrade.
Future<void> _ensureAdventureFirstClearXpMigrated(
  AccountPreferences prefs,
) async {
  if (prefs.getBool(_prefAdventureFirstClearXpMigrated) == true) return;

  final current = prefs.getInt(_prefAdventureCurrentLevel) ?? 1;
  final highest = prefs.getInt(_prefAdventureHighestUnlockedLevel) ?? current;
  final top = math.max(current, highest);

  final existing =
      prefs.getStringList(_prefAdventureLevelsFirstClearXp)?.toSet() ??
      <String>{};
  for (int i = 1; i < top; i++) {
    existing.add(i.toString());
  }
  final list = existing.toList()
    ..sort((a, b) => int.parse(a).compareTo(int.parse(b)));
  await prefs.setStringList(_prefAdventureLevelsFirstClearXp, list);
  await prefs.setBool(_prefAdventureFirstClearXpMigrated, true);
  scheduleProgressCloudSync();
}

/// Ensures XP is initialized to [defaultXp] if never set.
Future<void> ensureXpInitialized() async {
  final prefs = await AccountPreferences.getInstance();
  if (prefs.getInt(_prefUserXp) == null) {
    await prefs.setInt(_prefUserXp, defaultXp);
  }
}

/// Call when app is opened (e.g. home page init). Updates login streak only.
Future<void> onAppOpen() async {
  final prefs = await AccountPreferences.getInstance();
  await ensureXpInitialized();

  final now = DateTime.now();
  final today =
      '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
  final last = prefs.getString(_prefLastLoginDate);

  if (last == today) return;

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

  await prefs.setInt(_prefLoginStreak, streak);
  await prefs.setString(_prefLastLoginDate, today);
  scheduleProgressCloudSync();
}

/// Returns current XP (never null after [ensureXpInitialized]).
Future<int> getXp() async {
  final prefs = await AccountPreferences.getInstance();
  return (await readXpLedger(prefs)).xp;
}

Future<int> _award(String reason, {AccountPreferences? account}) async {
  final prefs = account ?? await AccountPreferences.getInstance();
  final next = await recordXpEvent(prefs, reason);
  scheduleProgressCloudSync();
  return next;
}

/// Consecutive frontier-level failures without clearing the level (persisted for skip-ad offer).
Future<int> getAdventureConsecutiveLosses() async {
  final prefs = await AccountPreferences.getInstance();
  return (await readXpLedger(prefs)).losses;
}

Future<void> resetAdventureConsecutiveLosses() async {
  final prefs = await AccountPreferences.getInstance();
  await recordXpEvent(prefs, 'adventure_reset');
  scheduleProgressCloudSync();
}

/// Call when the player fails a frontier adventure level (loss popup). Returns the new streak.
Future<int> recordAdventureLevelFailure(int levelJustFailed) async {
  final prefs = await AccountPreferences.getInstance();
  final current = prefs.getInt(_prefAdventureCurrentLevel) ?? 1;
  final highest = prefs.getInt(_prefAdventureHighestUnlockedLevel) ?? current;
  if (levelJustFailed != math.max(current, highest)) {
    return (await readXpLedger(prefs)).losses;
  }
  await recordXpEvent(prefs, 'adventure_failure');
  final next = (await readXpLedger(prefs)).losses;
  scheduleProgressCloudSync();
  return next;
}

/// Adventure: call when player loses a game. Returns (new XP, delta). Applies -1 XP per loss.
Future<(int, int)> onAdventureMatchLost({int? levelJustPlayed}) async {
  final prefs = await AccountPreferences.getInstance();
  await _ensureAdventureFirstClearXpMigrated(prefs);
  await prefs.setInt(_prefAdventureConsecutiveWins, 0);

  final newXp = await _award('adventure_loss', account: prefs);
  return (newXp, -xpAdventureOneLoss);
}

/// Adventure: call when player wins a game. Returns (new XP, delta).
/// +1 XP per win; +3 XP when clearing levels 10, 20, 30, …
Future<(int, int)> onAdventureGameWon({
  int? levelJustPlayed,
  bool levelClearingWin = false,
}) async {
  final account = await AccountPreferences.getInstance();
  await _ensureAdventureFirstClearXpMigrated(account);
  final delta =
      levelClearingWin &&
          levelJustPlayed != null &&
          levelJustPlayed > 0 &&
          levelJustPlayed % 10 == 0
      ? xpAdventureMilestoneLevelWin
      : xpAdventureMatchWin;
  final newXp = await _award(
    delta == xpAdventureMilestoneLevelWin
        ? 'adventure_milestone'
        : 'adventure_win',
    account: account,
  );
  return (newXp, delta);
}

/// Adventure: call when player wins the level (before advancing). Resets consecutive losses
/// and records first-clear tracking. Match wins already award XP via [onAdventureGameWon].
Future<(int, int)> onAdventureLevelWon(int levelJustCompleted) async {
  final prefs = await AccountPreferences.getInstance();
  await _ensureAdventureFirstClearXpMigrated(prefs);
  await recordXpEvent(prefs, 'adventure_reset');

  final clearedList =
      prefs.getStringList(_prefAdventureLevelsFirstClearXp) ?? [];
  final levelKey = levelJustCompleted.toString();
  if (!clearedList.contains(levelKey)) {
    final nextList = [...clearedList, levelKey]
      ..sort((a, b) => int.parse(a).compareTo(int.parse(b)));
    await prefs.setStringList(_prefAdventureLevelsFirstClearXp, nextList);
  }
  scheduleProgressCloudSync();
  final xp = (await readXpLedger(prefs)).xp;
  return (xp, 0);
}

/// Classic: call when human wins in classic streak mode. Returns (new XP, delta). +2 if 3rd consecutive win.
Future<(int, int)> onClassicStreakWin(int classicGamesWonAfterThisWin) async {
  if (classicGamesWonAfterThisWin >= 3 &&
      classicGamesWonAfterThisWin % 3 == 0) {
    final newXp = await _award('classic_three_wins');
    return (newXp, xpClassicThreeWins);
  }
  final xp = await getXp();
  return (xp, 0);
}

/// Practice: call when human wins a hard practice game. Returns (new XP, delta). +1 XP.
Future<(int, int)> onHardPracticeWin() async {
  final newXp = await _award('hard_practice_win');
  return (newXp, xpHardPracticeWin);
}

/// Daily challenge: returns whether the user played today and if so whether they won.
/// (playedToday, wonOrNull). wonOrNull is null if not played today.
Future<(bool playedToday, bool? won)> getDailyChallengeStatus() async {
  final prefs = await AccountPreferences.getInstance();
  final now = DateTime.now();
  final today =
      '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
  final lastDate = prefs.getString(_prefDailyChallengeDate);
  if (lastDate != today) return (false, null);
  final won = prefs.getBool(_prefDailyChallengeWon);
  return (true, won);
}

/// Daily challenge: call when the user finishes today's challenge. Records result only.
Future<int> setDailyChallengeResult(bool won) async {
  final prefs = await AccountPreferences.getInstance();
  final now = DateTime.now();
  final today =
      '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
  await prefs.setString(_prefDailyChallengeDate, today);
  await prefs.setBool(_prefDailyChallengeWon, won);
  scheduleProgressCloudSync();
  return await getXp();
}

/// Returns today's challenge game index (0-based). Same for all users on the same calendar day.
int getTodaysChallengeGameIndex() {
  final now = DateTime.now();
  final dayCode = now.year * 10000 + now.month * 100 + now.day;
  return dayCode % 6; // 6 different challenge types
}

/// Live Matches require at least 1 XP (send, accept, or rematch).
bool canPlayLiveMatches(int xp) => xp > 0;

const String liveMatchesRequiresXpMessage =
    'You need at least 1 XP to play Live Matches. Earn XP in Adventure or Classic mode, or watch an ad for +$xpRewardedAdWatch XP.';
