import 'dart:async';
import 'package:flutter/material.dart';
import 'home_page.dart';

/// Two-step splash flow: "Product of" + mindgrind (yellow, 7s), then BEE-FIVE logo (black, 7s), then home.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  static const Duration _screenDuration = Duration(seconds: 7);

  int _step = 0; // 0: Product of + mindgrind, 1: BEE-FIVE image
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer(_screenDuration, () {
      if (!mounted) return;
      if (_step == 0) {
        setState(() => _step = 1);
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
    return _BeeFiveLogoScreen();
  }
}

/// Shared logo size so MindGrind matches BEE-FIVE logo on second splash.
const _splashLogoSize = 220.0;

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
                  errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Second splash: black background, centered BEE-FIVE.png and "BEE-FIVE" text.
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
                width: _splashLogoSize,
                height: _splashLogoSize,
                child: Image.asset(
                  'assets/BEE-FIVE.png',
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => const SizedBox.shrink(),
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
