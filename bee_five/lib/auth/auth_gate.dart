import 'package:flutter/material.dart';
import '../contexts/auth_context.dart';
import 'sign_in_page.dart';
import 'sign_up_page.dart';
import 'forgot_password_page.dart';
import 'reset_password_page.dart';
import '../splash_screen.dart';

/// Auth gate: Auth first (sign-in if not logged in), then Splash, then Home.
/// Same format and order as BeefiveApp SimpleWelcome.
enum AuthScreen { signIn, signUp, forgotPassword, resetPassword }

class AuthGate extends StatefulWidget {
  const AuthGate({
    super.key,
    required this.auth,
  });

  final AuthContext auth;

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  AuthScreen _screen = AuthScreen.signIn;

  @override
  Widget build(BuildContext context) {
    // 1. Loading: show loading
    if (widget.auth.loading) {
      return const Scaffold(
        backgroundColor: Color(0xFFFFC30B),
        body: Center(
          child: CircularProgressIndicator(color: Colors.black87),
        ),
      );
    }

    // 2. Recovery from password-reset link: user has session but must set new password
    if (widget.auth.user != null && widget.auth.recoverySessionPending) {
      return ResetPasswordPage(
        auth: widget.auth,
        onBack: () {
          widget.auth.clearRecoverySessionPending();
          widget.auth.signOut();
        },
        onSuccess: () {
          widget.auth.clearRecoverySessionPending();
        },
      );
    }

    // 3. Not logged in: show auth screens (sign-in, sign-up, forgot, reset)
    if (widget.auth.user == null) {
      switch (_screen) {
        case AuthScreen.signIn:
          return SignInPage(
            auth: widget.auth,
            onNavigateToSignUp: () => setState(() => _screen = AuthScreen.signUp),
            onNavigateToForgotPassword: () =>
                setState(() => _screen = AuthScreen.forgotPassword),
            onTrySetNewPassword: () {
              widget.auth.syncSessionFromClient();
              if (widget.auth.user != null) {
                widget.auth.setRecoverySessionPending(true);
              }
            },
          );
        case AuthScreen.signUp:
          return SignUpPage(
            auth: widget.auth,
            onBack: () => setState(() => _screen = AuthScreen.signIn),
            onNavigateToSignIn: () => setState(() => _screen = AuthScreen.signIn),
          );
        case AuthScreen.forgotPassword:
          return ForgotPasswordPage(
            auth: widget.auth,
            onBack: () => setState(() => _screen = AuthScreen.signIn),
            onNavigateToSignIn: () =>
                setState(() => _screen = AuthScreen.signIn),
          );
        case AuthScreen.resetPassword:
          return ResetPasswordPage(
            auth: widget.auth,
            onBack: () => setState(() => _screen = AuthScreen.signIn),
            onSuccess: () => setState(() => _screen = AuthScreen.signIn),
          );
      }
    }

    // 4. Logged in: show Splash, then Home
    return const SplashScreen();
  }
}
