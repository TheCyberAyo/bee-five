import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:bee_five/account_preferences.dart';
import 'package:bee_five/xp_ledger.dart';
import 'package:bee_five/xp_service.dart';

class Backend {
  int xp;
  int losses = 0;
  bool failAfterCommit = false;
  Completer<void>? pause;
  final started = Completer<void>();
  final ids = <String>{};
  Backend(this.xp);
  Future<Map<String, dynamic>> apply(List<dynamic> events) async {
    if (!started.isCompleted) started.complete();
    if (pause != null) await pause!.future;
    for (final event in events) {
      if (!ids.add(event['id'] as String)) continue;
      final reason = event['reason'] as String;
      xp = (xp + xpAmounts[reason]!).clamp(0, 0x7fffffff);
      if (reason == 'adventure_failure') losses++;
      if (reason == 'adventure_reset') losses = 0;
    }
    if (failAfterCommit) {
      failAfterCommit = false;
      throw StateError('reply lost');
    }
    return {'user_xp': xp, 'adventure_consecutive_losses': losses};
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() => SharedPreferences.setMockInitialValues({}));
  test('ad and competitive XP require server confirmation', () async {
    final prefs = await AccountPreferences.forUser('a');
    for (final reason in ['rewarded_ad', 'live_win', 'live_loss']) {
      await expectLater(recordXpEvent(prefs, reason), throwsArgumentError);
    }
  });
  test('accounts and guest preferences remain isolated', () async {
    final guest = await AccountPreferences.forUser(null);
    await guest.setInt('user_xp', 100);
    final a = await AccountPreferences.forUser('a');
    final b = await AccountPreferences.forUser('b');
    expect((await readXpLedger(a)).xp, 10);
    await recordXpEvent(a, 'adventure_win');
    expect((await readXpLedger(a)).xp, 11);
    expect((await readXpLedger(b)).xp, 10);
    expect((await readXpLedger(guest)).xp, 100);
    await a.setInt('adventure_current_level', 12);
    expect(b.getInt('adventure_current_level'), isNull);
  });
  test('fresh and stale devices preserve server zero', () async {
    final prefs = await AccountPreferences.forUser('a');
    await prefs.setInt('user_xp', 20);
    await syncXpLedger(prefs, transport: Backend(0).apply);
    expect((await readXpLedger(prefs)).xp, 0);
  });
  test('concurrent rewards are serialized without losing increments', () async {
    final prefs = await AccountPreferences.forUser('a');
    await Future.wait(
      List.generate(20, (_) => recordXpEvent(prefs, 'adventure_win')),
    );
    expect((await readXpLedger(prefs)).xp, 30);
    final backend = Backend(10);
    await syncXpLedger(prefs, transport: backend.apply);
    expect(backend.xp, 30);
  });
  test('rewards earned during sync survive the response', () async {
    final prefs = await AccountPreferences.forUser('a');
    final backend = Backend(10)..pause = Completer<void>();
    final syncing = syncXpLedger(prefs, transport: backend.apply);
    await backend.started.future;
    await recordXpEvent(prefs, 'adventure_win');
    backend.pause!.complete();
    await syncing;
    expect(backend.xp, 11);
    expect((await readXpLedger(prefs)).xp, 11);
  });
  test('reply loss retains events and retry never awards twice', () async {
    final prefs = await AccountPreferences.forUser('a');
    final backend = Backend(10)..failAfterCommit = true;
    await recordXpEvent(prefs, 'classic_three_wins');
    await expectLater(
      syncXpLedger(prefs, transport: backend.apply),
      throwsStateError,
    );
    // New preferences instance simulates reopening the account after interruption.
    final reopened = await AccountPreferences.forUser('a');
    await syncXpLedger(reopened, transport: backend.apply);
    expect(backend.xp, 12);
    expect((await readXpLedger(reopened)).xp, 12);
  });
  test('failed request preserves pending deductions', () async {
    final prefs = await AccountPreferences.forUser('a');
    await recordXpEvent(prefs, 'adventure_loss');
    await expectLater(
      syncXpLedger(prefs, transport: (_) async => throw StateError('offline')),
      throwsStateError,
    );
    expect((await readXpLedger(prefs)).xp, 9);
    final backend = Backend(10);
    await syncXpLedger(prefs, transport: backend.apply);
    expect(backend.xp, 9);
  });
  test('clear resets synced failure streak permanently', () async {
    final prefs = await AccountPreferences.forUser('a');
    final backend = Backend(10)..losses = 4;
    await syncXpLedger(prefs, transport: backend.apply);
    await recordXpEvent(prefs, 'adventure_reset');
    await syncXpLedger(prefs, transport: backend.apply);
    await syncXpLedger(prefs, transport: backend.apply);
    expect((await readXpLedger(prefs)).losses, 0);
    expect(backend.losses, 0);
  });
  test('Classic rewards actual wins 3 and 6', () async {
    final rewards = <int>[];
    for (var win = 1; win <= 6; win++) {
      if ((await onClassicStreakWin(win)).$2 > 0) rewards.add(win);
    }
    expect(rewards, [3, 6]);
    expect(await getXp(), 14);
  });
  test('guest losses clamp at zero', () async {
    final prefs = await AccountPreferences.forUser(null);
    await prefs.setInt('user_xp', 0);
    await recordXpEvent(prefs, 'adventure_loss');
    expect((await readXpLedger(prefs)).xp, 0);
    await recordXpEvent(prefs, 'adventure_win');
    expect((await readXpLedger(prefs)).xp, 1);
  });
}
