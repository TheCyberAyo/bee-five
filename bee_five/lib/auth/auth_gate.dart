import '../onboarding/first_play_gate.dart';
import 'package:flutter/material.dart';
import '../contexts/auth_context.dart';
import '../home_page.dart';
import 'sign_in_page.dart';
import 'sign_up_page.dart';
import '../splash_screen.dart';

enum AuthScreen {
  signIn,
  signUp,
}

/// App shell: splash → home for everyone (signed-in or guest).
/// Sign in / sign up only when requested (e.g. Live Matches).
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
  AuthScreen _screen = AuthScreen.signUp;
  bool _splashDone = false;

  @override
  void didUpdateWidget(covariant AuthGate oldWidget) {
    super.didUpdateWidget(oldWidget);

    // Live Matches left guest mode to collect credentials.
    if (oldWidget.auth.isGuest &&
        !widget.auth.isGuest &&
        widget.auth.user == null &&
        !widget.auth.loading) {
      final forSignUp = widget.auth.takeOpenSignUpAfterLeaveGuest();
      setState(() {
        _screen = forSignUp ? AuthScreen.signUp : AuthScreen.signIn;
      });
    }

    // Signed in after auth — return to home (skip splash).
    if (oldWidget.auth.user == null && widget.auth.user != null) {
      setState(() => _splashDone = true);
    }

    // Cancelled auth back into guest — stay on home.
    if (!oldWidget.auth.isGuest &&
        widget.auth.isGuest &&
        widget.auth.user == null) {
      setState(() => _splashDone = true);
    }
  }

  void _cancelAuth() {
    widget.auth.enterGuestMode();
    setState(() => _splashDone = true);
  }

  void _onSplashComplete() {
    if (!mounted) return;
    setState(() => _splashDone = true);
  }

  @override
  Widget build(BuildContext context) {
    if (widget.auth.loading) {
      return const Scaffold(
        backgroundColor: Color(0xFFFFC30B),
        body: Center(
          child: CircularProgressIndicator(color: Colors.black87),
        ),
      );
    }

    // Unsigned and not in guest mode → register / sign-in (Live Matches gate).
    final needsAuth = widget.auth.user == null && !widget.auth.isGuest;

    if (needsAuth) {
      switch (_screen) {
        case AuthScreen.signIn:
          return SignInPage(
            auth: widget.auth,
            onBackToWelcome: _cancelAuth,
            onNavigateToSignUp: () =>
                setState(() => _screen = AuthScreen.signUp),
          );

        case AuthScreen.signUp:
          return SignUpPage(
            auth: widget.auth,
            backButtonLabel: '← Back',
            onBack: _cancelAuth,
            onNavigateToSignIn: () =>
                setState(() => _screen = AuthScreen.signIn),
          );
      }
    }

    if (!_splashDone) {
      return SplashScreen(
        auth: widget.auth,
        onComplete: _onSplashComplete,
      );
    }

    return FirstPlayGate(
      key: ValueKey(widget.auth.user?.id ?? 'guest'),
      homeBuilder: (_) => const HomePage(),
    );
  }
}
