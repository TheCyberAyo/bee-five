import 'package:shared_preferences/shared_preferences.dart';
import 'supabase_client.dart';

/// Captures the account before any await. An in-flight task can never write to
/// the account that happens to sign in later. Legacy unscoped data stays guest-only.
class AccountPreferences {
  final SharedPreferences _prefs;
  final String? userId;
  AccountPreferences(this._prefs, this.userId);
  static Future<AccountPreferences> getInstance() {
    final owner = supabaseClient?.auth.currentUser?.id;
    return forUser(owner);
  }

  static Future<AccountPreferences> forUser(String? userId) async =>
      AccountPreferences(await SharedPreferences.getInstance(), userId);
  static const _accountKeys = {
    'user_xp',
    'login_streak',
    'last_login_date',
    'classic_best_streak',
    'daily_challenge_date',
    'daily_challenge_won',
    'adventure_consecutive_losses',
    'adventure_consecutive_wins',
    'adventure_current_level',
    'adventure_highest_unlocked_level',
    'adventure_levels_first_clear_xp',
    'adventure_first_clear_xp_migrated',
    'highest_unlocked_game',
    'current_game_level',
    'adventure_progress_reset_pending',
    'xp_ledger_v1',
  };
  String _key(String key) =>
      userId != null && _accountKeys.contains(key) ? '$key:$userId' : key;
  int? getInt(String key) => _prefs.getInt(_key(key));
  bool? getBool(String key) => _prefs.getBool(_key(key));
  String? getString(String key) => _prefs.getString(_key(key));
  List<String>? getStringList(String key) => _prefs.getStringList(_key(key));
  bool containsKey(String key) => _prefs.containsKey(_key(key));
  Future<bool> setInt(String key, int value) => _prefs.setInt(_key(key), value);
  Future<bool> setBool(String key, bool value) =>
      _prefs.setBool(_key(key), value);
  Future<bool> setString(String key, String value) =>
      _prefs.setString(_key(key), value);
  Future<bool> setStringList(String key, List<String> value) =>
      _prefs.setStringList(_key(key), value);
  Future<bool> remove(String key) => _prefs.remove(_key(key));
}
