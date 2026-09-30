import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../classic_ai_game.dart';
import '../services/game_analytics.dart';

const firstPlayHandledKey = 'first_play_handled_v1';
const firstPlayTutorialId = 'first_practice_v1';

/// Lazily constructs the home screen after the intro, so lobby invitations and
/// home-screen ads cannot interrupt a player's first practice match.
class FirstPlayGate extends StatefulWidget {
  const FirstPlayGate({super.key, required this.homeBuilder});
  final WidgetBuilder homeBuilder;

  @override
  State<FirstPlayGate> createState() => _FirstPlayGateState();
}

class _FirstPlayGateState extends State<FirstPlayGate> {
  bool _loading = true;
  bool _handled = false;
  bool _practicing = false;
  bool _completed = false;
  bool _leaving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    var handled = false;
    try {
      handled =
          (await SharedPreferences.getInstance()).getBool(
            firstPlayHandledKey,
          ) ??
          false;
    } catch (_) {
      // Storage failure should never prevent playing or skipping.
    }
    if (!mounted) return;
    setState(() {
      _handled = handled;
      _loading = false;
    });
    if (!handled) GameAnalytics.instance.tutorialBegin(firstPlayTutorialId);
  }

  void _complete() {
    if (_completed) return;
    _completed = true;
    GameAnalytics.instance.tutorialComplete(firstPlayTutorialId);
    _rememberHandled();
  }

  Future<void> _leave() async {
    if (_leaving) return;
    _leaving = true;
    if (!_completed) {
      GameAnalytics.instance.event('tutorial_skipped', {
        'tutorial_id': firstPlayTutorialId,
        'step': _practicing ? 'practice' : 'introduction',
      });
    }
    await _rememberHandled();
    if (mounted) setState(() => _handled = true);
  }

  Future<void> _rememberHandled() async {
    try {
      await (await SharedPreferences.getInstance()).setBool(
        firstPlayHandledKey,
        true,
      );
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_handled) return widget.homeBuilder(context);
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _leave();
      },
      child: _practicing
          ? ClassicAIGame(
              initialDifficulty: 'easy',
              initialTimer: 0,
              isGuidedPractice: true,
              onGuidedPracticeComplete: _complete,
              onBackToMenu: _leave,
            )
          : FirstPlayIntroduction(
              onSkip: _leave,
              onPractice: () {
                GameAnalytics.instance.event('tutorial_step', {
                  'tutorial_id': firstPlayTutorialId,
                  'step': 'practice_started',
                });
                setState(() => _practicing = true);
              },
            ),
    );
  }
}

class FirstPlayIntroduction extends StatelessWidget {
  const FirstPlayIntroduction({
    super.key,
    required this.onSkip,
    required this.onPractice,
  });
  final VoidCallback onSkip;
  final VoidCallback onPractice;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFFF8DE),
      appBar: AppBar(
        backgroundColor: const Color(0xFFFFF8DE),
        automaticallyImplyLeading: false,
        title: const Text('Welcome to Bee Five'),
        actions: [TextButton(onPressed: onSkip, child: const Text('Skip'))],
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Connect five of your pieces in a row to win.',
                    style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Take turns placing one piece on an empty square. '
                    'Make a line in any of these directions:',
                    style: TextStyle(fontSize: 17, height: 1.5),
                  ),
                  const SizedBox(height: 24),
                  const Wrap(
                    spacing: 12,
                    runSpacing: 16,
                    alignment: WrapAlignment.center,
                    children: [
                      WinningLineExample(direction: 'Horizontal'),
                      WinningLineExample(direction: 'Vertical'),
                      WinningLineExample(direction: 'Diagonal'),
                    ],
                  ),
                  const SizedBox(height: 24),
                  const Text('Diagonal lines can slope either way.'),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: onPractice,
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.black,
                      foregroundColor: const Color(0xFFFFC30B),
                      padding: const EdgeInsets.all(18),
                    ),
                    child: const Text('Try an easy practice match'),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'You go first. No timer. Take your time.',
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class WinningLineExample extends StatelessWidget {
  const WinningLineExample({super.key, required this.direction});
  final String direction;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Five pieces in a ${direction.toLowerCase()} line win',
      image: true,
      child: ExcludeSemantics(
        child: SizedBox(
          width: 96,
          child: Column(
            children: [
              SizedBox(
                width: 96,
                height: 96,
                child: CustomPaint(painter: _WinningLinePainter(direction)),
              ),
              const SizedBox(height: 8),
              Text(
                direction,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _WinningLinePainter extends CustomPainter {
  _WinningLinePainter(this.direction);
  final String direction;

  @override
  void paint(Canvas canvas, Size size) {
    final cell = size.width / 5;
    canvas.drawRect(Offset.zero & size, Paint()..color = Colors.white);
    final grid = Paint()
      ..color = const Color(0xFFB8AC8A)
      ..strokeWidth = 1;
    for (var i = 0; i <= 5; i++) {
      canvas.drawLine(Offset(i * cell, 0), Offset(i * cell, size.height), grid);
      canvas.drawLine(Offset(0, i * cell), Offset(size.width, i * cell), grid);
    }
    for (var i = 0; i < 5; i++) {
      final row = direction == 'Horizontal' ? 2 : i;
      final col = direction == 'Vertical' ? 2 : i;
      final center = Offset((col + .5) * cell, (row + .5) * cell);
      canvas.drawCircle(center, cell * .35, Paint()..color = Colors.black);
      canvas.drawCircle(
        center,
        cell * .27,
        Paint()..color = const Color(0xFFFFC30B),
      );
    }
  }

  @override
  bool shouldRepaint(_WinningLinePainter oldDelegate) =>
      direction != oldDelegate.direction;
}
