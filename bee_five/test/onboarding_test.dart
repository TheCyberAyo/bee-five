import 'dart:io';
import 'dart:ui' as ui;

import 'package:bee_five/classic_ai_game.dart';
import 'package:bee_five/adventure_game.dart' show AdventureGame;
import 'package:bee_five/onboarding/adventure_rule_tips.dart';
import 'package:bee_five/onboarding/first_play_gate.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    if (const bool.fromEnvironment('SAVE_ONBOARDING_PREVIEW')) {
      final font = File('/System/Library/Fonts/Supplemental/Arial.ttf');
      if (await font.exists()) {
        final loader = FontLoader('Roboto');
        loader.addFont(
          font.readAsBytes().then((bytes) => ByteData.sublistView(bytes)),
        );
        await loader.load();
      }
    }
  });

  setUp(() {
    SharedPreferences.setMockInitialValues({'bee_five_sound_enabled': false});
    final messenger =
        TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
    messenger.setMockMessageHandler(
      'plugins.flutter.io/google_mobile_ads',
      (_) async => const StandardMethodCodec().encodeSuccessEnvelope(null),
    );
    for (final name in [
      'xyz.luan/audioplayers',
      'xyz.luan/audioplayers.global',
    ]) {
      messenger.setMockMethodCallHandler(MethodChannel(name), (call) async {
        if (call.method == 'create') {
          final id = (call.arguments as Map)['playerId'];
          messenger.setMockMethodCallHandler(
            MethodChannel('xyz.luan/audioplayers/events/$id'),
            (_) async => null,
          );
        }
        return 1;
      });
    }
    messenger.setMockMethodCallHandler(
      const MethodChannel('xyz.luan/audioplayers.global/events'),
      (_) async => null,
    );
  });

  Future<void> phone(WidgetTester tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
  }

  Widget gate() => MaterialApp(
    home: FirstPlayGate(
      homeBuilder: (_) => const Scaffold(body: Text('Home ready')),
    ),
  );

  testWidgets('skip opens home and is remembered on next launch', (
    tester,
  ) async {
    await phone(tester);
    await tester.pumpWidget(gate());
    await tester.pumpAndSettle();
    expect(
      find.text('Connect five of your pieces in a row to win.'),
      findsOneWidget,
    );
    expect(find.byType(WinningLineExample), findsNWidgets(3));
    await tester.tap(find.text('Skip'));
    await tester.pumpAndSettle();
    expect(find.text('Home ready'), findsOneWidget);
    expect(
      (await SharedPreferences.getInstance()).getBool(firstPlayHandledKey),
      isTrue,
    );
    await tester.pumpWidget(const SizedBox());
    await tester.pumpWidget(gate());
    await tester.pumpAndSettle();
    expect(find.text('Home ready'), findsOneWidget);
  });

  testWidgets(
    'practice is easy, untimed, prompts first move and can be skipped',
    (tester) async {
      await phone(tester);
      await tester.pumpWidget(gate());
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Try an easy practice match'));
      await tester.tap(find.text('Try an easy practice match'));
      await tester.pumpAndSettle();
      final game = tester.widget<ClassicAIGame>(find.byType(ClassicAIGame));
      expect(game.initialDifficulty, 'easy');
      expect(game.initialTimer, 0);
      expect(game.isGuidedPractice, isTrue);
      expect(
        find.text('Tap any empty square to place your first piece.'),
        findsOneWidget,
      );
      await tester.tap(find.byKey(const ValueKey('practice_cell_4_4')));
      await tester.pump();
      expect(
        find.text('Tap any empty square to place your first piece.'),
        findsNothing,
      );
      await tester.pump(const Duration(seconds: 1));
      await tester.tap(find.text('Skip'));
      await tester.pumpAndSettle();
      expect(find.text('Home ready'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'finishing guided practice is remembered and Continue opens home',
    (tester) async {
      await phone(tester);
      await tester.pumpWidget(gate());
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Try an easy practice match'));
      await tester.tap(find.text('Try an easy practice match'));
      await tester.pumpAndSettle();
      // Arrange a nearly won board, then finish through the real tap handler.
      final dynamic gameState = tester.state(find.byType(ClassicAIGame));
      gameState.setState(() {
        gameState.board = List.generate(10, (_) => List<int>.filled(10, 0));
        for (var col = 0; col < 4; col++) {
          gameState.board[0][col] = 1;
        }
      });
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('practice_cell_0_4')));
      await tester.pumpAndSettle(const Duration(seconds: 3));
      expect(find.text('You win!'), findsOneWidget);
      expect(
        (await SharedPreferences.getInstance()).getBool(firstPlayHandledKey),
        isTrue,
      );
      await tester.tap(find.text('Continue'));
      await tester.pumpAndSettle();
      expect(find.text('Home ready'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('Adventure waits on rules without starting the turn clock', (
    tester,
  ) async {
    await phone(tester);
    tester.view.physicalSize = const Size(600, 1000);
    await tester.pumpWidget(
      MaterialApp(home: AdventureGame(initialGame: 5, onBackToMenu: (_) {})),
    );
    await tester.pumpAndSettle();
    expect(find.byType(AdventureRuleBriefing), findsOneWidget);
    await tester.pump(const Duration(seconds: 30));
    expect(find.byType(AdventureRuleBriefing), findsOneWidget);
    final dynamic adventureState = tester.state(find.byType(AdventureGame));
    expect(adventureState.gameStarted, isFalse);
    expect(adventureState.timeLeft, 12);
    await tester.ensureVisible(find.text('Got it — continue'));
    await tester.tap(find.text('Got it — continue'));
    await tester.pump();
    expect(find.byType(AdventureRuleBriefing), findsNothing);
    await tester.pumpWidget(const SizedBox());
    await tester.pump(const Duration(seconds: 5));
    expect(tester.takeException(), isNull);
  });

  test('round-specific explanations match active mechanics', () {
    List<String> ids(int level, int round) =>
        adventureRuleTips(level, round).map((t) => t.id).toList();
    expect(ids(1, 1), containsAll(['timer_12', 'ai_starts']));
    expect(ids(1, 1), isNot(contains('blind_play')));
    expect(ids(5, 1), contains('blocked_cells'));
    expect(ids(17, 1), contains('piece_capacity'));
    expect(ids(42, 1), contains('blind_play'));
    expect(ids(50, 1), contains('strategic_blocks'));
    expect(ids(50, 1), isNot(contains('rearrangement')));
    expect(ids(50, 2), contains('blind_play'));
    expect(ids(50, 2), isNot(contains('blocked_cells')));
    expect(ids(50, 3), contains('rearrangement'));
    expect(ids(50, 4), contains('piece_swapping'));
    expect(ids(210, 1), contains('temporary_blind'));
    expect(ids(210, 2), isNot(contains('temporary_blind')));
  });

  testWidgets(
    'intro and contextual rules render on a small phone with large text',
    (tester) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      Widget frame(Widget child) => MaterialApp(
        home: MediaQuery(
          data: const MediaQueryData(
            size: Size(320, 640),
            textScaler: TextScaler.linear(1.5),
          ),
          child: child,
        ),
      );
      await tester.pumpWidget(
        frame(FirstPlayIntroduction(onSkip: () {}, onPractice: () {})),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(
        frame(
          AdventureRuleBriefing(
            level: 1000,
            round: 3,
            tips: adventureRuleTips(1000, 3),
            onContinue: () {},
            onExit: () {},
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await tester.ensureVisible(find.text('Got it — continue'));
      var continued = false;
      await tester.pumpWidget(
        frame(
          AdventureRuleBriefing(
            level: 5,
            round: 1,
            tips: adventureRuleTips(5, 1),
            onContinue: () => continued = true,
            onExit: () {},
          ),
        ),
      );
      await tester.ensureVisible(find.text('Got it — continue'));
      await tester.tap(find.text('Got it — continue'));
      expect(continued, isTrue);
    },
  );

  testWidgets('render onboarding previews', (tester) async {
    await phone(tester);
    Future<void> render(Widget child, String filename) async {
      final key = GlobalKey();
      await tester.pumpWidget(
        MaterialApp(
          home: RepaintBoundary(key: key, child: child),
        ),
      );
      await tester.pumpAndSettle();
      if (const bool.fromEnvironment('SAVE_ONBOARDING_PREVIEW')) {
        await tester.runAsync(() async {
          final boundary =
              key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
          final image = await boundary.toImage();
          final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
          await File(
            '/tmp/$filename.png',
          ).writeAsBytes(bytes!.buffer.asUint8List());
          image.dispose();
        });
      }
      expect(tester.takeException(), isNull);
    }

    await render(
      FirstPlayIntroduction(onSkip: () {}, onPractice: () {}),
      'bee-five-onboarding-preview',
    );
    await render(
      AdventureRuleBriefing(
        level: 50,
        round: 2,
        tips: adventureRuleTips(50, 2),
        onContinue: () {},
        onExit: () {},
      ),
      'bee-five-rules-preview',
    );
    await render(
      ClassicAIGame(
        initialDifficulty: 'easy',
        initialTimer: 0,
        isGuidedPractice: true,
        onBackToMenu: () {},
      ),
      'bee-five-practice-preview',
    );
    await tester.pumpWidget(const SizedBox());
    await tester.pump();
  });
}
