import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../supabase_client.dart';

/// Auth state and methods. Same format/order as BeefiveApp AuthContext.
class AuthContext extends ChangeNotifier {
  User? _user;
  Session? _session;
  bool _loading = true;
  bool _recoverySessionPending = false;
  StreamSubscription<AuthState>? _authSubscription;

  User? get user => _user;
  Session? get session => _session;
  bool get loading => _loading;
  bool get recoverySessionPending => _recoverySessionPending;

  AuthContext() {
    _init();
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
    _loading = false;
    notifyListeners();

    _authSubscription = supabaseClient!.auth.onAuthStateChange.listen((data) {
      if (data.event == AuthChangeEvent.signedOut) {
        _session = null;
        _user = null;
        _loading = false;
      } else {
        _session = data.session;
        _user = data.session?.user;
        _loading = false;
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
    _loading = false;
    notifyListeners();
  }

  Future<AuthException?> resetPasswordForEmail(String email) async {
    if (supabaseClient == null) return null;
    try {
      await supabaseClient!.auth.resetPasswordForEmail(
        email.trim(),
        redirectTo: 'bee-five://reset-password',
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
