import 'dart:async';
import 'package:flutter/material.dart';
import 'package:app_links/app_links.dart';
import '../contexts/auth_context.dart';

/// Handles bee-five:// deep links for email confirmation and password reset.
/// Ensures users are led back into the app with proper error handling.
class DeepLinkHandler extends StatefulWidget {
  const DeepLinkHandler({
    super.key,
    required this.auth,
    required this.child,
  });

  final AuthContext auth;
  final Widget child;

  @override
  State<DeepLinkHandler> createState() => _DeepLinkHandlerState();
}

class _DeepLinkHandlerState extends State<DeepLinkHandler> {
  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _linkSub;

  @override
  void initState() {
    super.initState();
    _handleInitialLink();
    _linkSub = _appLinks.uriLinkStream.listen(_handleUri);
  }

  @override
  void dispose() {
    _linkSub?.cancel();
    super.dispose();
  }

  Future<void> _handleInitialLink() async {
    try {
      final uri = await _appLinks.getInitialLink();
      if (uri != null) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _handleUri(uri);
        });
      }
    } catch (_) {}
  }

  Future<void> _handleUri(Uri? uri) async {
    if (uri == null || uri.scheme != 'bee-five') return;

    // e.g. bee-five://confirm-email or bee-five://reset-password
    final pathBase = uri.host.isNotEmpty
        ? uri.host
        : (uri.pathSegments.isNotEmpty ? uri.pathSegments.first : '');

    // Email confirmation: bee-five://confirm-email (fragment optional; e.g. when opened from browser page)
    // Don't set session — show "Confirmed" and prompt user to sign in in the app.
    if (pathBase == 'confirm-email' || pathBase.startsWith('confirm-email')) {
      if (!mounted) return;
      _showEmailConfirmedScreen(context);
      return;
    }

    // Password reset: bee-five://reset-password (PKCE: ?code=... or implicit: #access_token=...&refresh_token=...)
    if (pathBase == 'reset-password' || pathBase.startsWith('reset-password')) {
      try {
        // Use getSessionFromUrl so both PKCE (query code) and implicit (fragment tokens) work
        final err = await widget.auth.setSessionFromRecoveryUrl(uri);
        if (!mounted) return;
        if (err != null) {
          _showError(
            context,
            'Reset link invalid',
            err.message.contains('code_verifier') || err.message.contains('verifier')
                ? 'Open BEE FIVE, use Forgot password again, then tap the new link from the same device.'
                : 'This password reset link is invalid or has expired. Please request a new one from the app.',
          );
          return;
        }
        // Sync session into AuthContext so AuthGate sees user != null when we set recovery flag
        widget.auth.syncSessionFromClient();
        widget.auth.setRecoverySessionPending(true);
        // No dialog — AuthGate will show ResetPasswordPage immediately
      } catch (e) {
        if (!mounted) return;
        _showError(
          context,
          'Something went wrong',
          'We couldn\'t complete the reset. Please use Forgot password again and tap the new link on this device.',
        );
      }
    }
  }

  void _showError(BuildContext context, String title, String message) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!context.mounted) return;
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(title),
          content: Text(message),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('OK'),
            ),
          ],
        ),
      );
    });
  }

  static const Color _confirmYellow = Color(0xFFFFC30B);

  void _showEmailConfirmedScreen(BuildContext context) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!context.mounted) return;
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (ctx) => Scaffold(
            backgroundColor: _confirmYellow,
            body: SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.check_circle_outline,
                      size: 80,
                      color: Colors.black87,
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      'Email confirmed!',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Return to the app and sign in with your email and password.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 18,
                        color: Colors.black87,
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 40),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () => Navigator.of(ctx).pop(),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.black87,
                          foregroundColor: _confirmYellow,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: const BorderSide(color: Colors.black, width: 2),
                          ),
                        ),
                        child: const Text(
                          'Continue',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    });
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
