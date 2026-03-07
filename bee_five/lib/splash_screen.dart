import 'dart:async';
import 'package:flutter/material.dart';
import 'home_page.dart';

/// Splash flow: "Product of" + MindGrind (7s), then Connect 5 demo (6s), then BEE-FIVE logo (2s), then home.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  static const Duration _productOfDuration = Duration(seconds: 7);
  static const Duration _connectFiveDuration = Duration(seconds: 6);
  static const Duration _beeFiveDuration = Duration(seconds: 2);

  int _step = 0; // 0: Product of + MindGrind, 1: Connect 5 demo, 2: BEE-FIVE image
  Timer? _timer;

  Duration get _currentDuration {
    if (_step == 0) return _productOfDuration;
    if (_step == 1) return _connectFiveDuration;
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
      } else if (_step == 1) {
        setState(() => _step = 2);
        _startTimer();
      } else {
        _goToHome();
      }
    });
  }

  void _goToHome() {
    _timer?.cancel();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const HomePage()),
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_step == 0) {
      return _ProductOfScreen();
    }
    if (_step == 1) {
      return _ConnectFiveDemoScreen();
    }
    return _BeeFiveLogoScreen();
  }
}

/// Shared logo size for MindGrind (first splash).
const _splashLogoSize = 220.0;

/// BEE-FIVE logo on third splash is larger.
const _beeFiveLogoSize = 300.0;

/// First splash: yellow background, "Product of" and MindGrind logo image (same size as BEE-FIVE logo, central).
class _ProductOfScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFFC30B),
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Product of',
                style: TextStyle(
                  fontSize: 22,
                  color: Colors.black87,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: _splashLogoSize,
                height: _splashLogoSize,
                child: Image.asset(
                  'assets/MindGrind.jpg',
                  fit: BoxFit.contain,
                  errorBuilder: (_, _, _) => const SizedBox.shrink(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Yellow background, horizontal row of 5 squares at top; Connect 5 played in order: black(3rd), yellow(5th), black(2nd), yellow(1st), black(4th).
class _ConnectFiveDemoScreen extends StatefulWidget {
  @override
  State<_ConnectFiveDemoScreen> createState() => _ConnectFiveDemoScreenState();
}

class _ConnectFiveDemoScreenState extends State<_ConnectFiveDemoScreen>
    with SingleTickerProviderStateMixin {
  static const Color _splashYellow = Color(0xFFFFC30B);
  static const int _squareCount = 5;
  static const double _squareSize = 56.0;
  static const double _gap = 8.0;

  /// Play order: (squareIndex 0..4, isBlack). Squares are horizontal: 0=left (1st), 4=right (5th/far end).
  /// Move 1: black on 3rd (index 2), 2: yellow on 5th (index 4), 3: black on 2nd (index 1), 4: yellow on 1st (index 0), 5: black on 4th (index 3).
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
    return Scaffold(
      backgroundColor: _splashYellow,
      body: SafeArea(
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
                      // Use (position + 0.5) so each move appears mid-slot and is visible; the 5th move
                      // appears at 90% of the animation (~5.4s) so it's visible for ~0.6s before the screen changes.
                      final threshold = (position + 0.5) / _squareCount;
                      final visible = position >= 0 && _controller.value >= threshold;
                      final isBlack = position >= 0 ? _isBlack[position] : false;
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
                  color: isBlack ? Colors.black : const Color(0xFFFFC30B),
                  shape: BoxShape.circle,
                ),
              ),
            )
          : null,
    );
  }
}

/// Third splash: black background, centered BEE-FIVE.png (larger) and "BEE-FIVE" text.
class _BeeFiveLogoScreen extends StatelessWidget {
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
              Text(
                'BEE-FIVE',
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
