import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../supabase_client.dart';

/// Same value as `prefUsername` in `dashboard_page.dart` (kept here to avoid circular imports).
const String _kUserDisplayNamePrefKey = 'user_display_name';

/// Auth state and methods. Same format/order as BeefiveApp AuthContext.
class AuthContext extends ChangeNotifier {
  User? _user;
  Session? _session;
  bool _loading = true;
  bool _recoverySessionPending = false;
  bool _isGuest = false;
  StreamSubscription<AuthState>? _authSubscription;

  User? get user => _user;
  Session? get session => _session;
  bool get loading => _loading;
  bool get recoverySessionPending => _recoverySessionPending;
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

  Future<AuthResponse> signUp({
    required String email,
    required String password,
    String? username,
  }) async {
    if (supabaseClient == null) {
      return AuthResponse(
        session: null,
        user: null,
      );
    }

    return supabaseClient!.auth.signUp(
      email: email.trim(),
      password: password,
      data: {'username': username ?? email.split('@')[0]},
      emailRedirectTo: 'bee-five://confirm-email',
    );
  }

  /// Set session from refresh token (e.g. from email confirm or password reset link).
  /// Returns null on success, AuthException on failure.
  Future<AuthException?> setSessionFromRefreshToken(String refreshToken) async {
    if (supabaseClient == null) return null;
    try {
      await supabaseClient!.auth.setSession(refreshToken);
      return null;
    } on AuthException catch (e) {
      return e;
    }
  }

  /// Recover session from the password-reset redirect URL (handles both PKCE ?code= and implicit #fragment).
  /// Returns null on success, AuthException on failure.
  Future<AuthException?> setSessionFromRecoveryUrl(Uri uri) async {
    if (supabaseClient == null) return null;
    try {
      await supabaseClient!.auth.getSessionFromUrl(uri);
      return null;
    } on AuthException catch (e) {
      return e;
    }
  }

  /// Sync _session and _user from Supabase client (e.g. after getSessionFromUrl, before setting recovery flag).
  /// Ensures AuthGate sees the user when recoverySessionPending is set so ResetPasswordPage is shown.
  void syncSessionFromClient() {
    if (supabaseClient == null) return;
    _session = supabaseClient!.auth.currentSession;
    _user = _session?.user;
    if (_user != null) _persistUsernameFromUserToPrefs(_user!);
    notifyListeners();
  }

  void setRecoverySessionPending(bool value) {
    if (_recoverySessionPending == value) return;
    _recoverySessionPending = value;
    notifyListeners();
  }

  void clearRecoverySessionPending() {
    setRecoverySessionPending(false);
  }

  Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) async {
    if (supabaseClient == null) {
      return AuthResponse(
        session: null,
        user: null,
      );
    }

    return supabaseClient!.auth.signInWithPassword(
      email: email.trim(),
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

  Future<AuthException?> resetPasswordForEmail(String email) async {
    if (supabaseClient == null) return null;
    try {
      await supabaseClient!.auth.resetPasswordForEmail(email.trim());
      return null;
    } on AuthException catch (e) {
      return e;
    }
  }

  /// Verify the 6-digit code from the reset email, then returns null on success.
  /// Call this before updatePassword when using the in-app code flow.
  Future<AuthException?> verifyOtpForRecovery(String email, String token) async {
    if (supabaseClient == null) return null;
    try {
      await supabaseClient!.auth.verifyOTP(
        email: email.trim(),
        token: token.trim(),
        type: OtpType.recovery,
      );
      return null;
    } on AuthException catch (e) {
      return e;
    }
  }

  Future<AuthException?> updatePassword(String password) async {
    if (supabaseClient == null) return null;
    try {
      await supabaseClient!.auth.updateUser(UserAttributes(password: password));
      return null;
    } on AuthException catch (e) {
      return e;
    }
  }

  /// Deletes the current user's account via the Supabase Edge Function "delete-user".
  /// Call this only when the user is signed in. Signs out on success.
  /// Returns null on success, AuthException on failure (e.g. function not deployed).
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
