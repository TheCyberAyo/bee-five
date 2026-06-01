import 'package:flutter/material.dart';
import '../adventure_progress_service.dart';
import '../contexts/auth_context.dart';
import '../services/multiplayer_service.dart';
import '../supabase_client.dart';

/// Sign-in with BeeFive username + password (no email field for users).
class SignInPage extends StatefulWidget {
  const SignInPage({
    super.key,
    required this.auth,
    required this.onNavigateToSignUp,
    required this.onBackToWelcome,
  });

  final AuthContext auth;
  final VoidCallback onNavigateToSignUp;
  final VoidCallback? onBackToWelcome;

  @override
  State<SignInPage> createState() => _SignInPageState();
}

class _SignInPageState extends State<SignInPage> {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();

  String? _error;
  bool _loading = false;
  bool _obscurePassword = true;

  static final _usernameRegex = RegExp(r'^[a-zA-Z0-9_-]+$');

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  String? _validateUsername(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Please enter your username';
    }
    final t = value.trim();
    if (t.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (!_usernameRegex.hasMatch(t)) {
      return 'Username can only contain letters, numbers, underscores, and hyphens';
    }
    return null;
  }

  String? _validatePassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Please enter your password';
    }
    return null;
  }

  Future<void> _handleSubmit() async {
    setState(() {
      _error = null;
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

    try {
      final response = await widget.auth.signIn(
        username: _usernameController.text,
        password: _passwordController.text,
      );

      if (!mounted) return;

      if (response.session != null || response.user != null) {
        try {
          await syncAdventureProgress();
        } catch (_) {}
        try {
          await MultiplayerService().syncMgProfileFromAuthMetadata();
        } catch (_) {}
        if (!mounted) return;
        setState(() => _loading = false);
        return;
      }

      setState(() {
        _error =
            'Invalid username or password. Please try again.';
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      final s = e.toString().toLowerCase();
      String errMsg = 'Invalid username or password. Please try again.';
      if (s.contains('invalid login') ||
          s.contains('invalid_credentials') ||
          s.contains('invalid_grant')) {
        errMsg = 'Invalid username or password. Please try again.';
      }
      setState(() {
        _error = errMsg;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

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
                if (widget.onBackToWelcome != null) ...[
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton(
                      onPressed: _loading ? null : widget.onBackToWelcome,
                      child: const Text(
                        '← Back',
                        style: TextStyle(
                          color: Color(0xFFFFC30B),
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
                Text(
                  '🐝 Sign In',
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Welcome back! Sign in with your BeeFive username.',
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
                  controller: _usernameController,
                  decoration: InputDecoration(
                    labelText: 'Username',
                    hintText: 'your_username',
                    helperText: 'Same username you chose at sign up',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    filled: true,
                    fillColor: isDark ? const Color(0xFF2a2a2a) : null,
                  ),
                  textCapitalization: TextCapitalization.none,
                  autocorrect: false,
                  enabled: !_loading,
                  validator: _validateUsername,
                  onChanged: (_) => setState(() => _error = null),
                ),
                const SizedBox(height: 20),
                TextFormField(
                  controller: _passwordController,
                  decoration: InputDecoration(
                    labelText: 'Password',
                    hintText: '••••••••',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    filled: true,
                    fillColor: isDark ? const Color(0xFF2a2a2a) : null,
                    suffixIcon: TextButton(
                      onPressed: () =>
                          setState(() => _obscurePassword = !_obscurePassword),
                      child: Text(
                        _obscurePassword ? 'Show' : 'Hide',
                        style: const TextStyle(
                          color: Color(0xFFFFC30B),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                  obscureText: _obscurePassword,
                  autocorrect: false,
                  enabled: !_loading,
                  validator: _validatePassword,
                  onChanged: (_) => setState(() => _error = null),
                ),
                const SizedBox(height: 28),
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
                            'Sign In',
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
                      "Don't have an account? ",
                      style: TextStyle(
                        color: isDark ? Colors.grey : Colors.black87,
                        fontSize: 14,
                      ),
                    ),
                    TextButton(
                      onPressed: _loading ? null : widget.onNavigateToSignUp,
                      child: const Text(
                        'Sign Up',
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
