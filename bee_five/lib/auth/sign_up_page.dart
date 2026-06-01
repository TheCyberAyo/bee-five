import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../auth/beefive_internal_auth.dart';
import '../contexts/auth_context.dart';
import '../dashboard_page.dart' show prefUsername;
import '../utils/country_data.dart';
import '../widgets/country_picker_sheet.dart';
import '../supabase_client.dart';
import '../services/multiplayer_service.dart';

/// Sign-up: full name, username, password + confirm. No email field — synthetic `@beefive.app` is internal only.
class SignUpPage extends StatefulWidget {
  const SignUpPage({
    super.key,
    required this.auth,
    required this.onBack,
    required this.onNavigateToSignIn,
    this.backButtonLabel = '← Back to Sign In',
  });

  final AuthContext auth;
  final VoidCallback onBack;
  final VoidCallback onNavigateToSignIn;
  final String backButtonLabel;

  @override
  State<SignUpPage> createState() => _SignUpPageState();
}

class _SignUpPageState extends State<SignUpPage> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  String? _error;
  bool _loading = false;
  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  String? _selectedCountryCode = 'ZA';

  static final _usernameRegex = RegExp(r'^[a-zA-Z0-9_-]+$');
  static final _passwordLetterRegex = RegExp(r'[A-Za-z]');

  @override
  void dispose() {
    _fullNameController.dispose();
    _usernameController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  String? _validateFullName(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Please enter your full name';
    }
    if (value.trim().length < 2) {
      return 'Full name must be at least 2 characters';
    }
    return null;
  }

  String? _validateUsername(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Please enter a username';
    }
    if (value.trim().length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (!_usernameRegex.hasMatch(value.trim())) {
      return 'Username can only contain letters, numbers, underscores, and hyphens';
    }
    return null;
  }

  String? _validatePassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Please enter a password';
    }
    if (value.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!_passwordLetterRegex.hasMatch(value)) {
      return 'Password must include at least one letter';
    }
    return null;
  }

  String? _validateConfirmPassword(String? value) {
    if (value == null || value.isEmpty) {
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
      final usernameNorm = normalizeUsername(_usernameController.text);
      final fullName = _fullNameController.text.trim();

      final response = await widget.auth.signUp(
        username: usernameNorm,
        password: _passwordController.text,
        fullName: fullName,
        countryCode: _selectedCountryCode!,
      );

      if (!mounted) return;

      if (response.user != null || response.session != null) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(prefUsername, usernameNorm);

        try {
          await MultiplayerService().createProfile(
            usernameNorm,
            fullName: fullName,
            countryCode: _selectedCountryCode,
          );
        } catch (e) {
          if (!mounted) return;
          setState(() {
            _loading = false;
            _error =
                'Account created, but your online profile could not be saved. '
                'Sign in and try Online Gaming again, or contact support if this persists.';
          });
          return;
        }

        if (!mounted) return;
        setState(() => _loading = false);
        await showDialog<void>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Account created'),
            content: const Text(
              'You can sign in now with your username and password.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('OK'),
              ),
            ],
          ),
        );
        widget.onNavigateToSignIn();
        return;
      }

      String errMsg = 'Sign up failed. Please try again.';
      final s = response.toString().toLowerCase();
      if (s.contains('already registered') ||
          s.contains('user already') ||
          s.contains('duplicate')) {
        errMsg = 'That username is already taken. Please choose another.';
      } else if (s.contains('password')) {
        errMsg =
            'Password is too weak. Use at least 8 characters and include a letter.';
      }
      setState(() {
        _error = errMsg;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      final msg = e.toString().toLowerCase();
      String errMsg = 'Sign up failed. Please try again.';
      if (msg.contains('already registered') ||
          msg.contains('user already') ||
          msg.contains('duplicate') ||
          msg.contains('23505')) {
        errMsg = 'That username is already taken. Please choose another.';
      } else if (msg.contains('password') || msg.contains('weak')) {
        errMsg =
            'Password is too weak. Use at least 8 characters and include a letter.';
      }
      setState(() {
        _error = errMsg;
        _loading = false;
      });
    }
  }

  Future<void> _pickCountry() async {
    if (_loading) return;
    final picked = await showCountryPickerSheet(
      context,
      initialCode: _selectedCountryCode,
    );
    if (picked != null && mounted) {
      setState(() => _selectedCountryCode = picked);
    }
  }

  String? _validateCountry() {
    if (_selectedCountryCode == null || _selectedCountryCode!.isEmpty) {
      return 'Please select your country';
    }
    return null;
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
                TextButton(
                  onPressed: _loading ? null : widget.onBack,
                  child: Text(
                    widget.backButtonLabel,
                    style: const TextStyle(
                      color: Color(0xFFFFC30B),
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  '🐝 Sign Up',
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Full name, username, and password — no email address required.',
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
                  controller: _fullNameController,
                  decoration: InputDecoration(
                    labelText: 'Full Name',
                    hintText: 'e.g. Ayongezwa Dlamini',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    filled: true,
                    fillColor: isDark ? const Color(0xFF2a2a2a) : null,
                    prefixIcon: const Icon(Icons.person_outline),
                  ),
                  textCapitalization: TextCapitalization.words,
                  autocorrect: false,
                  enabled: !_loading,
                  validator: _validateFullName,
                  onChanged: (_) => setState(() => _error = null),
                ),
                const SizedBox(height: 20),
                FormField<String>(
                  initialValue: _selectedCountryCode,
                  validator: (_) => _validateCountry(),
                  builder: (field) {
                    final selected = countryByCode(_selectedCountryCode);
                    return InkWell(
                      onTap: _loading ? null : _pickCountry,
                      borderRadius: BorderRadius.circular(12),
                      child: InputDecorator(
                        decoration: InputDecoration(
                          labelText: 'Country',
                          helperText: 'Your flag appears next to your name online',
                          errorText: field.errorText,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(
                              color: field.hasError ? Colors.red : Colors.grey,
                            ),
                          ),
                          filled: true,
                          fillColor: isDark ? const Color(0xFF2a2a2a) : null,
                          prefixIcon: const Icon(Icons.flag_outlined),
                          suffixIcon: const Icon(Icons.arrow_drop_down),
                        ),
                        child: Text(
                          selected?.labelWithFlag ?? 'Select your country',
                          style: TextStyle(
                            fontSize: 16,
                            color: selected != null
                                ? (isDark ? Colors.white : Colors.black87)
                                : Colors.grey,
                          ),
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 20),
                TextFormField(
                  controller: _usernameController,
                  decoration: InputDecoration(
                    labelText: 'Username',
                    hintText: 'Choose a username',
                    helperText:
                        'Letters, numbers, underscores, hyphens · saved lowercase',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    filled: true,
                    fillColor: isDark ? const Color(0xFF2a2a2a) : null,
                    prefixIcon: const Icon(Icons.badge_outlined),
                  ),
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
                    helperText: 'At least 8 characters with one letter',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    filled: true,
                    fillColor: isDark ? const Color(0xFF2a2a2a) : null,
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: TextButton(
                      onPressed: () => setState(
                          () => _obscurePassword = !_obscurePassword),
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
                const SizedBox(height: 20),
                TextFormField(
                  controller: _confirmPasswordController,
                  decoration: InputDecoration(
                    labelText: 'Confirm Password',
                    hintText: '••••••••',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    filled: true,
                    fillColor: isDark ? const Color(0xFF2a2a2a) : null,
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: TextButton(
                      onPressed: () =>
                          setState(() => _obscureConfirm = !_obscureConfirm),
                      child: Text(
                        _obscureConfirm ? 'Show' : 'Hide',
                        style: const TextStyle(
                          color: Color(0xFFFFC30B),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                  obscureText: _obscureConfirm,
                  autocorrect: false,
                  enabled: !_loading,
                  validator: _validateConfirmPassword,
                  onChanged: (_) => setState(() => _error = null),
                ),
                const SizedBox(height: 30),
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
                            'Sign Up',
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
                      'Already have an account? ',
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
