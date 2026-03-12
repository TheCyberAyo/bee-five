import 'package:flutter/material.dart';
import '../contexts/auth_context.dart';
import '../supabase_client.dart';

/// Forgot password page. Same format and order as BeefiveApp ForgotPasswordPage.
class ForgotPasswordPage extends StatefulWidget {
  const ForgotPasswordPage({
    super.key,
    required this.auth,
    required this.onBack,
    required this.onNavigateToSignIn,
  });

  final AuthContext auth;
  final VoidCallback onBack;
  final VoidCallback onNavigateToSignIn;

  @override
  State<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends State<ForgotPasswordPage> {
  final _formKey = GlobalKey<FormState>();
  final _codeFormKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _codeController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  String? _error;
  bool _loading = false;
  bool _success = false;
  bool _codeSubmitting = false;

  static final _emailRegex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

  @override
  void dispose() {
    _emailController.dispose();
    _codeController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  String? _validateEmail(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Please enter your email address';
    }
    if (!_emailRegex.hasMatch(value.trim())) {
      return 'Please enter a valid email address';
    }
    return null;
  }

  Future<void> _handleSubmit() async {
    setState(() {
      _error = null;
      _success = false;
      _loading = true;
    });

    if (!_formKey.currentState!.validate()) {
      setState(() => _loading = false);
      return;
    }

    if (!isSupabaseConfigured) {
      setState(() {
        _error =
            'Supabase is not configured. Please add SUPABASE_URL and SUPABASE_ANON_KEY to .env';
        _loading = false;
      });
      return;
    }

    final ex = await widget.auth.resetPasswordForEmail(_emailController.text.trim());

    if (!mounted) return;

    if (ex == null) {
      setState(() {
        _success = true;
        _loading = false;
      });
      return;
    }

    String errMsg = ex.message;
    if (ex.message.contains('rate limit')) {
      errMsg = 'Too many requests. Please wait a few minutes before trying again.';
    } else if (ex.message.contains('email')) {
      errMsg = 'Please check your email address and try again.';
    }
    setState(() {
      _error = errMsg;
      _loading = false;
    });
  }

  Future<void> _handleCodeAndPasswordSubmit() async {
    if (!_codeFormKey.currentState!.validate()) return;
    setState(() {
      _error = null;
      _codeSubmitting = true;
    });
    final email = _emailController.text.trim();
    final code = _codeController.text.trim();
    final newPassword = _newPasswordController.text.trim();
    var ex = await widget.auth.verifyOtpForRecovery(email, code);
    if (ex != null) {
      if (!mounted) return;
      final msg = ex.message;
      setState(() {
        _error = msg.contains('expired') ? 'Code expired. Request a new one below.' : msg;
        _codeSubmitting = false;
      });
      return;
    }
    ex = await widget.auth.updatePassword(newPassword);
    if (!mounted) return;
    if (ex != null) {
      final msg = ex.message;
      setState(() {
        _error = msg;
        _codeSubmitting = false;
      });
      return;
    }
    await widget.auth.signOut();
    if (!mounted) return;
    setState(() => _codeSubmitting = false);
    widget.onNavigateToSignIn();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_success) {
      return Scaffold(
        backgroundColor: isDark ? const Color(0xFF1a1a1a) : Colors.white,
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 20),
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
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    border: Border(
                      left: BorderSide(color: Colors.green, width: 4),
                    ),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '✓ Check your email!',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.green.shade800,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        "We've sent a 6-digit code to:",
                        style: TextStyle(
                          color: Colors.green.shade800,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.green),
                        ),
                        child: Text(
                          _emailController.text,
                          style: TextStyle(
                            color: Colors.green.shade800,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Enter the code and your new password below.',
                        style: TextStyle(
                          color: Colors.green.shade800,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                Form(
                  key: _codeFormKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (_error != null) ...[
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.red.shade50,
                            borderRadius: BorderRadius.circular(8),
                            border: Border(left: BorderSide(color: Colors.red, width: 4)),
                          ),
                          child: Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 14)),
                        ),
                        const SizedBox(height: 16),
                      ],
                      TextFormField(
                        controller: _codeController,
                        decoration: InputDecoration(
                          labelText: '6-digit code',
                          hintText: '000000',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          filled: true,
                          fillColor: isDark ? const Color(0xFF2a2a2a) : null,
                        ),
                        keyboardType: TextInputType.number,
                        maxLength: 6,
                        validator: (v) {
                          if (v == null || v.trim().length != 6) return 'Enter the 6-digit code from the email';
                          return null;
                        },
                        onChanged: (_) => setState(() => _error = null),
                      ),
                      const SizedBox(height: 20),
                      TextFormField(
                        controller: _newPasswordController,
                        decoration: InputDecoration(
                          labelText: 'New password',
                          hintText: 'At least 6 characters',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          filled: true,
                          fillColor: isDark ? const Color(0xFF2a2a2a) : null,
                        ),
                        obscureText: true,
                        validator: (v) {
                          if (v == null || v.length < 6) return 'Password must be at least 6 characters';
                          return null;
                        },
                      ),
                      const SizedBox(height: 20),
                      TextFormField(
                        controller: _confirmPasswordController,
                        decoration: InputDecoration(
                          labelText: 'Confirm new password',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          filled: true,
                          fillColor: isDark ? const Color(0xFF2a2a2a) : null,
                        ),
                        obscureText: true,
                        validator: (v) {
                          if (v != _newPasswordController.text) return 'Passwords do not match';
                          return null;
                        },
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        height: 52,
                        child: ElevatedButton(
                          onPressed: _codeSubmitting ? null : _handleCodeAndPasswordSubmit,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFFFC30B),
                            foregroundColor: Colors.black,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: Colors.black, width: 2)),
                          ),
                          child: _codeSubmitting
                              ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                              : const Text('Set new password', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: _codeSubmitting
                      ? null
                      : () {
                          setState(() {
                            _success = false;
                            _emailController.clear();
                            _codeController.clear();
                            _newPasswordController.clear();
                            _confirmPasswordController.clear();
                            _error = null;
                          });
                        },
                  child: const Text(
                    'Send a new code',
                    style: TextStyle(color: Color(0xFFFFC30B), fontWeight: FontWeight.w600),
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Remember your password? ',
                      style: TextStyle(
                        color: isDark ? Colors.grey : Colors.black87,
                        fontSize: 14,
                      ),
                    ),
                    TextButton(
                      onPressed: widget.onNavigateToSignIn,
                      child: const Text(
                        'Sign In',
                        style: TextStyle(
                          color: Color(0xFFFFC30B),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
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
                  onPressed: _loading ? null : widget.onBack,
                  child: const Text(
                    '← Back to Sign In',
                    style: TextStyle(
                      color: Color(0xFFFFC30B),
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  '🔑 Forgot Password?',
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  "Enter your email and we'll send a 6-digit code.",
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
                  controller: _emailController,
                  decoration: InputDecoration(
                    labelText: 'Email Address',
                    hintText: 'your@email.com',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    filled: true,
                    fillColor: isDark ? const Color(0xFF2a2a2a) : null,
                  ),
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                  enabled: !_loading,
                  validator: _validateEmail,
                  onChanged: (_) => setState(() => _error = null),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _loading ? null : _handleSubmit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFFFC30B),
                      foregroundColor: Colors.black,
                      disabledBackgroundColor: Colors.grey.shade300,
                      side: const BorderSide(color: Colors.black, width: 3),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: _loading
                        ? const SizedBox(
                            height: 24,
                            width: 24,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.black,
                            ),
                          )
                        : const Text(
                            'Send Reset Link',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Remember your password? ',
                      style: TextStyle(
                        color: isDark ? Colors.grey : Colors.black87,
                        fontSize: 14,
                      ),
                    ),
                    TextButton(
                      onPressed: _loading ? null : widget.onNavigateToSignIn,
                      child: const Text(
                        'Sign In',
                        style: TextStyle(
                          color: Color(0xFFFFC30B),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
