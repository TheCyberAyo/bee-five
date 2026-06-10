import 'package:flutter/material.dart';
import '../contexts/auth_context.dart';
import 'sign_in_page.dart';
import 'sign_up_page.dart';
import 'welcome_auth_page.dart';
import '../splash_screen.dart';

enum AuthScreen {
  welcome,
  signIn,
  signUp,
}

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
  AuthScreen _screen = AuthScreen.welcome;
  bool _signUpOpenedFromWelcome = false;

  @override
  void didUpdateWidget(covariant AuthGate oldWidget) {
    super.didUpdateWidget(oldWidget);
    final wasInApp =
        oldWidget.auth.user != null || oldWidget.auth.isGuest;
    final nowInApp =
        widget.auth.user != null || widget.auth.isGuest;
    if (wasInApp && !nowInApp && !widget.auth.loading) {
      setState(() {
        _screen = AuthScreen.welcome;
        _signUpOpenedFromWelcome = false;
      });
    }

    if (oldWidget.auth.isGuest &&
        !widget.auth.isGuest &&
        widget.auth.user == null &&
        !widget.auth.loading) {
      final forSignUp = widget.auth.takeOpenSignUpAfterLeaveGuest();
      setState(() {
        _screen = forSignUp ? AuthScreen.signUp : AuthScreen.signIn;
        _signUpOpenedFromWelcome = forSignUp;
      });
    }
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

    if (widget.auth.user == null && !widget.auth.isGuest) {
      switch (_screen) {
        case AuthScreen.welcome:
          return WelcomeAuthPage(
            onContinueAsGuest: () => widget.auth.enterGuestMode(),
            onSignIn: () =>
                setState(() => _screen = AuthScreen.signIn),
            onSignUp: () => setState(() {
              _signUpOpenedFromWelcome = true;
              _screen = AuthScreen.signUp;
            }),
          );

        case AuthScreen.signIn:
          return SignInPage(
            auth: widget.auth,
            onBackToWelcome: () =>
                setState(() => _screen = AuthScreen.welcome),
            onNavigateToSignUp: () => setState(() {
              _signUpOpenedFromWelcome = false;
              _screen = AuthScreen.signUp;
            }),
          );

        case AuthScreen.signUp:
          return SignUpPage(
            auth: widget.auth,
            backButtonLabel: _signUpOpenedFromWelcome
                ? '← Back'
                : '← Back to Sign In',
            onBack: () => setState(() {
              if (_signUpOpenedFromWelcome) {
                _signUpOpenedFromWelcome = false;
                _screen = AuthScreen.welcome;
              } else {
                _screen = AuthScreen.signIn;
              }
            }),
            onNavigateToSignIn: () =>
                setState(() => _screen = AuthScreen.signIn),
          );
      }
    }

    return SplashScreen(auth: widget.auth);
  }
}
