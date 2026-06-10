import 'dart:async';
import 'package:flutter/material.dart';
import 'adventure_progress_service.dart';
import 'contexts/auth_context.dart';
import 'home_page.dart';
import 'services/multiplayer_service.dart';

/// Splash flow: Connect 5 demo (6s), then BEE FIVE logo (2s), then Home.
/// School / default lobby setup happens when the player opens Live Matches.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key, required this.auth});

  final AuthContext auth;

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  static const Duration _connectFiveDuration = Duration(seconds: 6);
  static const Duration _beeFiveDuration = Duration(seconds: 2);

  int _step = 0; // 0: Connect 5 demo, 1: BEE FIVE image
  Timer? _timer;

  Duration get _currentDuration {
    if (_step == 0) return _connectFiveDuration;
    return _beeFiveDuration;
  }

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer(_currentDuration, () {
      if (!mounted) return;

      if (_step == 0) {
        setState(() => _step = 1);
        _startTimer();
      } else {
        _goNext();
      }
    });
  }

  /// Splash complete: sync signed-in progress from Supabase, then open Home.
  Future<void> _goNext() async {
    _timer?.cancel();
    if (!mounted) return;

    if (widget.auth.user != null || widget.auth.isGuest) {
      if (widget.auth.user != null) {
        try {
          await syncAdventureProgress();
        } catch (_) {
          // Still open Home if the network fails; local prefs remain.
        }

        try {
          await MultiplayerService().syncMgProfileFromAuthMetadata();
        } catch (_) {}

        if (!mounted) return;
      }

      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(builder: (_) => const HomePage()),
      );
    } else {
      // Fallback — normally AuthGate handles this
      Navigator.of(context).pop();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_step == 0) {
      return const _ConnectFiveDemoScreen();
    }
    return const _BeeFiveLogoScreen();
  }
}

// ════════════════════════════════════════════════════════════
// BEE FIVE LOGO SIZE
// ════════════════════════════════════════════════════════════

const _beeFiveLogoSize = 300.0;

// ════════════════════════════════════════════════════════════
// CONNECT 5 DEMO SCREEN
// ════════════════════════════════════════════════════════════

class _ConnectFiveDemoScreen extends StatefulWidget {
  const _ConnectFiveDemoScreen();

  @override
  State<_ConnectFiveDemoScreen> createState() =>
      _ConnectFiveDemoScreenState();
}

class _ConnectFiveDemoScreenState extends State<_ConnectFiveDemoScreen>
    with SingleTickerProviderStateMixin {
  static const Color _splashYellow = Color(0xFFFFC30B);
  static const int _squareCount = 5;
  static const double _squareSize = 56.0;
  static const double _gap = 8.0;

  static const List<int> _playOrder = [2, 4, 1, 0, 3];
  static const List<bool> _isBlack = [true, false, true, false, true];

  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 6),
    )..forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final side = MediaQuery.sizeOf(context).shortestSide;

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Center(
          child: SizedBox(
            width: side,
            height: side,
            child: Container(
              color: _splashYellow,
              child: AnimatedBuilder(
                animation: _controller,
                builder: (context, _) {
                  return Column(
                    children: [
                      const SizedBox(height: 32),
                      Center(
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: List.generate(_squareCount, (index) {
                            final position = _playOrder.indexOf(index);
                            final threshold =
                                (position + 0.5) / _squareCount;

                            final visible = position >= 0 &&
                                _controller.value >= threshold;

                            final isBlack = position >= 0
                                ? _isBlack[position]
                                : false;

                            return Padding(
                              padding: EdgeInsets.only(
                                right: index < _squareCount - 1 ? _gap : 0,
                              ),
                              child: _buildSquare(
                                hasPiece: visible,
                                isBlack: isBlack,
                              ),
                            );
                          }),
                        ),
                      ),
                      const Spacer(),
                    ],
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSquare({required bool hasPiece, required bool isBlack}) {
    return Container(
      width: _squareSize,
      height: _squareSize,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: Colors.black87, width: 2),
        borderRadius: BorderRadius.circular(8),
      ),
      child: hasPiece
          ? Center(
              child: Container(
                width: _squareSize * 0.5,
                height: _squareSize * 0.5,
                decoration: BoxDecoration(
                  color: isBlack
                      ? Colors.black
                      : const Color(0xFFFFC30B),
                  shape: BoxShape.circle,
                ),
              ),
            )
          : null,
    );
  }
}

// ════════════════════════════════════════════════════════════
// BEE FIVE LOGO SCREEN
// ════════════════════════════════════════════════════════════

class _BeeFiveLogoScreen extends StatelessWidget {
  const _BeeFiveLogoScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 48),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: _beeFiveLogoSize,
                height: _beeFiveLogoSize,
                child: Image.asset(
                  'assets/BEE-FIVE.png',
                  fit: BoxFit.contain,
                  errorBuilder: (_, _, _) => const SizedBox.shrink(),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'BEE FIVE',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                  letterSpacing: 2,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}