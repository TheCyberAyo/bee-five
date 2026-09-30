import 'dart:convert';
import 'dart:math';
import 'account_preferences.dart';
import 'supabase_client.dart';

const xpAmounts = <String, int>{
  'adventure_win': 1,
  'adventure_milestone': 3,
  'adventure_loss': -1,
  'classic_three_wins': 2,
  'hard_practice_win': 1,
  'adventure_failure': 0,
  'adventure_reset': 0,
};
final _mutations = <String?, Future<void>>{};
final _syncs = <String, Future<void>>{};

Future<T> _locked<T>(String? owner, Future<T> Function() action) {
  final previous = _mutations[owner] ?? Future<void>.value();
  final result = previous.then((_) => action());
  final tail = result.then<void>(
    (_) {},
    onError: (Object error, StackTrace stack) {},
  );
  _mutations[owner] = tail;
  tail.whenComplete(() {
    if (identical(_mutations[owner], tail)) _mutations.remove(owner);
  });
  return result;
}

Map<String, dynamic> _read(AccountPreferences prefs) {
  final raw = prefs.getString('xp_ledger_v1');
  if (raw != null) {
    final saved = Map<String, dynamic>.from(jsonDecode(raw) as Map);
    saved['pending'] = (saved['pending'] as List).where((event) => xpAmounts.containsKey(event['reason'])).toList();
    return saved;
  }
  return {
    'balance': prefs.getInt('user_xp') ?? 10,
    'losses': prefs.getInt('adventure_consecutive_losses') ?? 0,
    'pending': <dynamic>[],
  };
}

({int xp, int losses}) _project(Map<String, dynamic> ledger) {
  var xp = ledger['balance'] as int;
  var losses = ledger['losses'] as int;
  for (final event in ledger['pending'] as List) {
    final reason = event['reason'] as String;
    xp = max(0, xp + xpAmounts[reason]!);
    if (reason == 'adventure_reset') losses = 0;
    if (reason == 'adventure_failure') losses++;
  }
  return (xp: xp, losses: losses);
}

Future<void> _write(
  AccountPreferences prefs,
  Map<String, dynamic> ledger,
) async {
  // One durable value holds both the acknowledged base and the pending events.
  await prefs.setString('xp_ledger_v1', jsonEncode(ledger));
  final state = _project(ledger);
  await prefs.setInt('user_xp', state.xp);
  await prefs.setInt('adventure_consecutive_losses', state.losses);
}

String _eventId() {
  final random = Random.secure();
  final b = List.generate(16, (_) => random.nextInt(256));
  b[6] = (b[6] & 15) | 64;
  b[8] = (b[8] & 63) | 128;
  final h = b.map((v) => v.toRadixString(16).padLeft(2, '0')).join();
  return '${h.substring(0, 8)}-${h.substring(8, 12)}-${h.substring(12, 16)}-${h.substring(16, 20)}-${h.substring(20)}';
}

Future<({int xp, int losses})> readXpLedger(AccountPreferences prefs) =>
    _locked(prefs.userId, () async => _project(_read(prefs)));
Future<int> recordXpEvent(AccountPreferences prefs, String reason) =>
    _locked(prefs.userId, () async {
      if (!xpAmounts.containsKey(reason)) throw ArgumentError.value(reason);
      final ledger = _read(prefs);
      (ledger['pending'] as List).add({'id': _eventId(), 'reason': reason});
      final state = _project(ledger);
      if (prefs.userId == null) {
        ledger['balance'] = state.xp;
        ledger['losses'] = state.losses;
        ledger['pending'] = <dynamic>[];
      }
      await _write(prefs, ledger);
      return state.xp;
    });

/// Injectable transport allows testing retry and in-flight mutations without a backend.
Future<void> syncXpLedger(
  AccountPreferences prefs, {
  Future<Map<String, dynamic>> Function(List<dynamic>)? transport,
}) async {
  final owner = prefs.userId;
  if (owner == null) return;
  final previous = _syncs[owner] ?? Future<void>.value();
  final next = previous.catchError((Object _) {}).then((_) async {
    while (true) {
      final batch = await _locked(
        owner,
        () async =>
            List<dynamic>.from((_read(prefs)['pending'] as List).take(100)),
      );
      final Map<String, dynamic> data;
      if (transport != null) {
        data = await transport(batch);
      } else {
        if (supabaseClient == null) return;
        data = Map<String, dynamic>.from(
          await supabaseClient!.rpc(
                'apply_xp_events',
                params: {'owner_id': owner, 'events': batch},
              )
              as Map,
        );
      }
      if (data['user_xp'] is! int ||
          data['adventure_consecutive_losses'] is! int) {
        throw StateError('Invalid XP ledger response');
      }
      final remaining = await _locked(owner, () async {
        final ids = batch.map((e) => e['id']).toSet();
        final current = _read(prefs);
        final pending = (current['pending'] as List)
            .where((e) => !ids.contains(e['id']))
            .toList();
        await _write(prefs, {
          'balance': data['user_xp'],
          'losses': data['adventure_consecutive_losses'],
          'pending': pending,
        });
        return pending.isNotEmpty;
      });
      if (!remaining) break;
    }
  });
  _syncs[owner] = next;
  try {
    await next;
  } finally {
    if (identical(_syncs[owner], next)) _syncs.remove(owner);
  }
}
