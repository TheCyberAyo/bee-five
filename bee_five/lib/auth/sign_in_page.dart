import 'package:flutter/material.dart';
import '../contexts/auth_context.dart';
import '../supabase_client.dart';

/// Sign-in page. Same format and order as BeefiveApp SignInPage.
class SignInPage extends StatefulWidget {
  const SignInPage({
    super.key,
    required this.auth,
    required this.onNavigateToSignUp,
    required this.onNavigateToForgotPassword,
  });

  final AuthContext auth;
  final VoidCallback onNavigateToSignUp;
  final VoidCallback onNavigateToForgotPassword;

  @override
  State<SignInPage> createState() => _SignInPageState();
}

class _SignInPageState extends State<SignInPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  String? _error;
  bool _loading = false;
  bool _obscurePassword = true;

  static final _emailRegex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
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
        _error = 'Supabase is not configured. Please add SUPABASE_URL and SUPABASE_ANON_KEY to .env';
        _loading = false;
      });
      return;
    }

    try {
      final response = await widget.auth.signIn(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );

      if (!mounted) return;

      if (response.session != null || response.user != null) {
        // Success - AuthGate will auto-navigate to Splash then Home
        return;
      }

      String errMsg = 'Failed to sign in. Please try again.';
      final ex = response;
      if (ex.toString().contains('Invalid login credentials')) {
        errMsg = 'Invalid email or password. Please try again.';
      } else if (ex.toString().contains('Email not confirmed')) {
        errMsg =
            'Please check your email and confirm your account before signing in.';
      }
      setState(() {
        _error = errMsg;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      String errMsg = 'Failed to sign in. Please try again.';
      final s = e.toString();
      if (s.contains('Invalid login credentials')) {
        errMsg = 'Invalid email or password. Please try again.';
      } else if (s.contains('Email not confirmed')) {
        errMsg =
            'Please check your email and confirm your account before signing in.';
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
                  'Welcome back! Sign in to continue playing.',
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
                    labelText: 'Email',
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
                        style: TextStyle(
                          color: const Color(0xFFFFC30B),
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
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: _loading ? null : widget.onNavigateToForgotPassword,
                    child: const Text(
                      'Forgot Password?',
                      style: TextStyle(
                        color: Color(0xFFFFC30B),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
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
