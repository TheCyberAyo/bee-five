import 'package:flutter/material.dart';
import '../contexts/auth_context.dart';
import '../supabase_client.dart';

/// Reset password page. Same format and order as BeefiveApp ResetPasswordPage.
/// Handles deep link (bee-five://reset-password) for recovery.
class ResetPasswordPage extends StatefulWidget {
  const ResetPasswordPage({
    super.key,
    required this.auth,
    required this.onBack,
    required this.onSuccess,
  });

  final AuthContext auth;
  final VoidCallback onBack;
  final VoidCallback onSuccess;

  @override
  State<ResetPasswordPage> createState() => _ResetPasswordPageState();
}

class _ResetPasswordPageState extends State<ResetPasswordPage> {
  final _formKey = GlobalKey<FormState>();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  String? _error;
  bool _loading = true;
  bool _validSession = false;
  bool _submitting = false;
  bool _obscurePassword = true;
  bool _obscureConfirm = true;

  @override
  void initState() {
    super.initState();
    _checkSession();
  }

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _checkSession() async {
    if (supabaseClient == null) {
      setState(() {
        _error = 'Authentication service is not configured.';
        _loading = false;
      });
      return;
    }

    try {
      final session = supabaseClient!.auth.currentSession;

      if (!mounted) return;

      if (session == null) {
        setState(() {
          _error =
              'Invalid or expired password reset link. Please request a new one.';
          _loading = false;
        });
        return;
      }

      setState(() {
        _validSession = true;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'An unexpected error occurred. Please try again.';
        _loading = false;
      });
    }
  }

  String? _validatePassword(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Please enter a new password';
    }
    if (value.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return null;
  }

  String? _validateConfirmPassword(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Please confirm your password';
    }
    if (value != _passwordController.text) {
      return 'Passwords do not match';
    }
    return null;
  }

  Future<void> _handleSubmit() async {
    setState(() {
      _error = null;
      _submitting = true;
    });

    if (!_formKey.currentState!.validate()) {
      setState(() => _submitting = false);
      return;
    }

    final ex = await widget.auth.updatePassword(_passwordController.text.trim());

    if (!mounted) return;

    if (ex == null) {
      await showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Password Updated!'),
          content: const Text(
            'Your password has been successfully reset. You can now sign in with your new password.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('OK'),
            ),
          ],
        ),
      );
      widget.onSuccess();
      return;
    }

    setState(() {
      _error = ex.message;
      _submitting = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_loading) {
      return Scaffold(
        backgroundColor: isDark ? const Color(0xFF1a1a1a) : Colors.white,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(color: Color(0xFFFFC30B)),
              const SizedBox(height: 20),
              Text(
                'Validating reset link...',
                style: TextStyle(
                  color: isDark ? Colors.grey : Colors.black87,
                  fontSize: 16,
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (!_validSession) {
      return Scaffold(
        backgroundColor: isDark ? const Color(0xFF1a1a1a) : Colors.white,
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextButton(
                  onPressed: widget.onBack,
                  child: const Text(
                    '← Back',
                    style: TextStyle(
                      color: Color(0xFFFFC30B),
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(height: 30),
                Text(
                  'Invalid Link',
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _error ??
                      'This password reset link is invalid or has expired.',
                  style: TextStyle(
                    fontSize: 16,
                    color: isDark ? Colors.grey : Colors.black87,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF1a1a1a) : Colors.white,
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 20),
                TextButton(
                  onPressed: _submitting ? null : widget.onBack,
                  child: const Text(
                    '← Back',
                    style: TextStyle(
                      color: Color(0xFFFFC30B),
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  '🔒 Reset Password',
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  "Enter your new password below. Make sure it's strong and secure.",
                  style: TextStyle(
                    fontSize: 16,
                    color: isDark ? Colors.grey : Colors.black87,
                  ),
                ),
                const SizedBox(height: 30),
                if (_error != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      border: Border(
                        left: BorderSide(color: Colors.red, width: 4),
                      ),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      _error!,
                      style: const TextStyle(color: Colors.red, fontSize: 14),
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
                TextFormField(
                  controller: _passwordController,
                  decoration: InputDecoration(
                    labelText: 'New Password',
                    hintText: 'Enter new password',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    filled: true,
                    fillColor: isDark ? const Color(0xFF2a2a2a) : null,
                    suffixIcon: TextButton(
                      onPressed: () =>
                          setState(() => _obscurePassword = !_obscurePassword),
                      child: Text(
                        _obscurePassword ? 'Hide' : 'Show',
                        style: const TextStyle(
                          color: Color(0xFFFFC30B),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                  obscureText: _obscurePassword,
                  autocorrect: false,
                  enabled: !_submitting,
                  validator: _validatePassword,
                  onChanged: (_) => setState(() => _error = null),
                ),
                const SizedBox(height: 20),
                TextFormField(
                  controller: _confirmPasswordController,
                  decoration: InputDecoration(
                    labelText: 'Confirm New Password',
                    hintText: 'Confirm new password',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    filled: true,
                    fillColor: isDark ? const Color(0xFF2a2a2a) : null,
                    suffixIcon: TextButton(
                      onPressed: () =>
                          setState(() => _obscureConfirm = !_obscureConfirm),
                      child: Text(
                        _obscureConfirm ? 'Hide' : 'Show',
                        style: const TextStyle(
                          color: Color(0xFFFFC30B),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                  obscureText: _obscureConfirm,
                  autocorrect: false,
                  enabled: !_submitting,
                  validator: _validateConfirmPassword,
                  onChanged: (_) => setState(() => _error = null),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _submitting ? null : _handleSubmit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFFFC30B),
                      foregroundColor: Colors.black,
                      disabledBackgroundColor: Colors.grey.shade300,
                      side: const BorderSide(color: Colors.black, width: 3),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: _submitting
                        ? const SizedBox(
                            height: 24,
                            width: 24,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.black,
                            ),
                          )
                        : const Text(
                            'Update Password',
                            style: TextStyle(
                              fontSize: 16,
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
    );
  }
}
