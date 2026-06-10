import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../auth/beefive_internal_auth.dart';
import '../supabase_client.dart';

/// Same value as `prefUsername` in `dashboard_page.dart` (kept here to avoid circular imports).
const String _kUserDisplayNamePrefKey = 'user_display_name';

/// Auth state and methods. Username-first: Supabase stores synthetic `${username}@beefive.app`.
class AuthContext extends ChangeNotifier {
  User? _user;
  Session? _session;
  bool _loading = true;
  bool _isGuest = false;
  bool _openSignUpAfterLeaveGuest = false;
  StreamSubscription<AuthState>? _authSubscription;

  User? get user => _user;
  Session? get session => _session;
  bool get loading => _loading;

  /// Local-only “play without account”; cleared on [signOut] or when a Supabase session exists.
  bool get isGuest => _isGuest;

  AuthContext() {
    _init();
  }

  /// Skip account sign-in; cleared when a Supabase session exists or on [signOut].
  void enterGuestMode() {
    if (_isGuest) return;
    _isGuest = true;
    notifyListeners();
  }

  /// Leave guest mode so the auth gate can show sign-in / sign-up (e.g. from Live Matches).
  void leaveGuestMode({bool forSignUp = false}) {
    if (!_isGuest) return;
    _isGuest = false;
    _openSignUpAfterLeaveGuest = forSignUp;
    notifyListeners();
  }

  /// One-shot flag read by [AuthGate] after [leaveGuestMode].
  bool takeOpenSignUpAfterLeaveGuest() {
    final openSignUp = _openSignUpAfterLeaveGuest;
    _openSignUpAfterLeaveGuest = false;
    return openSignUp;
  }

  static void _persistUsernameFromUserToPrefs(User user) {
    final raw = user.userMetadata?['username'];
    if (raw == null) return;
    final name = raw.toString().trim();
    if (name.isEmpty) return;
    SharedPreferences.getInstance().then(
      (prefs) => prefs.setString(_kUserDisplayNamePrefKey, name),
    );
  }

  void _init() {
    if (supabaseClient == null) {
      _loading = false;
      notifyListeners();
      return;
    }

    final currentSession = supabaseClient!.auth.currentSession;
    _session = currentSession;
    _user = currentSession?.user;
    if (_user != null) {
      _isGuest = false;
      _persistUsernameFromUserToPrefs(_user!);
    }
    _loading = false;
    notifyListeners();

    _authSubscription = supabaseClient!.auth.onAuthStateChange.listen((data) {
      if (data.event == AuthChangeEvent.signedOut) {
        _session = null;
        _user = null;
        _loading = false;
        _isGuest = false;
      } else {
        _session = data.session;
        _user = data.session?.user;
        _loading = false;
        if (_user != null) {
          _isGuest = false;
          _persistUsernameFromUserToPrefs(_user!);
        }
      }
      notifyListeners();
    });
  }

  /// Sign up with [username], [password], and required [fullName].
  /// Supabase auth uses a synthetic `${username}@beefive.app` only — never shown as an email field.
  /// Turn off “Confirm email” for the Email provider in Supabase so users are not blocked on signup.
  Future<AuthResponse> signUp({
    required String username,
    required String password,
    required String fullName,
    required String countryCode,
  }) async {
    if (supabaseClient == null) {
      return AuthResponse(session: null, user: null);
    }

    final un = normalizeUsername(username);
    final email = internalEmailFromUsername(un);
    final fn = fullName.trim();
    final country = countryCode.trim().toUpperCase();

    return supabaseClient!.auth.signUp(
      email: email,
      password: password,
      data: <String, dynamic>{
        'username': un,
        'full_name': fn,
        'country_code': country,
      },
    );
  }

  /// Sign in with username + password, or pass [email] for flows that already know auth email.
  Future<AuthResponse> signIn({
    required String password,
    String? username,
    String? email,
  }) async {
    if (supabaseClient == null) {
      return AuthResponse(session: null, user: null);
    }

    final resolvedEmail = (email != null && email.trim().isNotEmpty)
        ? email.trim()
        : (username != null && username.trim().isNotEmpty)
            ? internalEmailFromUsername(username)
            : null;

    if (resolvedEmail == null || resolvedEmail.isEmpty) {
      return AuthResponse(session: null, user: null);
    }

    return supabaseClient!.auth.signInWithPassword(
      email: resolvedEmail,
      password: password,
    );
  }

  Future<void> signOut() async {
    if (supabaseClient != null) {
      await supabaseClient!.auth.signOut();
    }
    _session = null;
    _user = null;
    _isGuest = false;
    _loading = false;
    notifyListeners();
  }

  /// Deletes the current user's account via the Supabase Edge Function "delete-user".
  Future<AuthException?> deleteAccount() async {
    if (supabaseClient == null || _user == null) {
      return AuthException('Not signed in or Supabase not configured');
    }
    try {
      final res = await supabaseClient!.functions.invoke('delete-user');
      if (res.status != 200) {
        return AuthException(
          res.data?['message']?.toString() ?? 'Account deletion failed',
        );
      }
      await signOut();
      return null;
    } on AuthException catch (e) {
      return e;
    } catch (e) {
      return AuthException(e.toString());
    }
  }

  @override
  void dispose() {
    _authSubscription?.cancel();
    super.dispose();
  }
}
