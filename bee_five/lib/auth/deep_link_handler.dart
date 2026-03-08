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

    // Fragment: #access_token=...&refresh_token=...&type=signup|recovery
    final fragment = uri.fragment;
    if (fragment.isEmpty) {
      _showError(context, 'Invalid link', 'This link is missing required data. Please try again from your email.');
      return;
    }

    final params = <String, String>{};
    for (final pair in fragment.split('&')) {
      final kv = pair.split('=');
      if (kv.length == 2) {
        params[kv[0]] = Uri.decodeComponent(kv[1]);
      }
    }

    final refreshToken = params['refresh_token'];

    if (refreshToken == null || refreshToken.isEmpty) {
      _showError(context, 'Invalid link', 'This link is missing security tokens. Please use the latest link from your email.');
      return;
    }

    // Email confirmation: bee-five://confirm-email#...&type=signup
    if (pathBase == 'confirm-email' || pathBase.startsWith('confirm-email')) {
      final err = await widget.auth.setSessionFromRefreshToken(refreshToken);
      if (!mounted) return;
      if (err != null) {
        _showError(
          context,
          'Confirmation failed',
          'We couldn’t confirm your email. The link may have expired. Please try signing up again or request a new confirmation email.',
        );
        return;
      }
      _showSuccess(context, 'Email confirmed!', 'You can now sign in and play.');
      return;
    }

    // Password reset: bee-five://reset-password#...&type=recovery
    if (pathBase == 'reset-password' || pathBase.startsWith('reset-password')) {
      final err = await widget.auth.setSessionFromRefreshToken(refreshToken);
      if (!mounted) return;
      if (err != null) {
        _showError(
          context,
          'Reset link invalid',
          'This password reset link is invalid or has expired. Please request a new one from the app.',
        );
        return;
      }
      widget.auth.setRecoverySessionPending(true);
      _showSuccess(context, 'Link opened', 'Enter your new password below.');
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

  void _showSuccess(BuildContext context, String title, String message) {
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

  @override
  Widget build(BuildContext context) => widget.child;
}
