import 'package:flutter/material.dart';

/// First screen after launch: guest, sign in, or sign up.
class WelcomeAuthPage extends StatelessWidget {
  const WelcomeAuthPage({
    super.key,
    required this.onContinueAsGuest,
    required this.onSignIn,
    required this.onSignUp,
  });

  final VoidCallback onContinueAsGuest;
  final VoidCallback onSignIn;
  final VoidCallback onSignUp;

  static const Color _yellow = Color(0xFFFFC30B);
  static const String _mascotAsset = 'assets/mapImagery/beefivemascot.png';

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? const Color(0xFF1a1a1a) : Colors.white;
    final titleColor = isDark ? Colors.white : Colors.black;
    final subtitleColor = isDark ? Colors.grey : Colors.black87;

    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 20),
              Text(
                '🐝 BEE FIVE',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 36,
                  fontWeight: FontWeight.bold,
                  color: titleColor,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'How would you like to play?',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 17,
                  color: subtitleColor,
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 14),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Text(
                  'NB: You CANNOT challenge other players online if you enter as a guest!',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.redAccent.shade100 : Colors.red.shade700,
                    height: 1.35,
                  ),
                ),
              ),
              const Spacer(),
              SizedBox(
                height: 52,
                child: OutlinedButton(
                  onPressed: onContinueAsGuest,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: titleColor,
                    side: const BorderSide(color: Colors.black87, width: 2),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'Continue as Guest',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              SizedBox(
                height: 52,
                child: ElevatedButton(
                  onPressed: onSignIn,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _yellow,
                    foregroundColor: Colors.black,
                    side: const BorderSide(color: Colors.black, width: 3),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'Sign In',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              SizedBox(
                height: 52,
                child: OutlinedButton(
                  onPressed: onSignUp,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: titleColor,
                    side: const BorderSide(color: Colors.black87, width: 2),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'Sign Up',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Center(
                child: Image.asset(
                  _mascotAsset,
                  height: 180,
                  fit: BoxFit.contain,
                  errorBuilder: (_, _, _) => const Text(
                    '🐝',
                    style: TextStyle(fontSize: 96),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }
}
