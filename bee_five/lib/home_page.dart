import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:math' as math;
import 'package:url_launcher/url_launcher.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'adventure_game.dart';
import 'simple_game.dart';
import 'classic_ai_game.dart';
import 'background_sound.dart';
import 'dashboard_page.dart';
import 'xp_service.dart';

// Adventure stages for map background
class AdventureStage {
  final String name;
  final int games;
  final String emoji;
  final Color color;
  final String description;

  AdventureStage({
    required this.name,
    required this.games,
    required this.emoji,
    required this.color,
    required this.description,
  });
}

final List<AdventureStage> adventureStages = [
  AdventureStage(
    name: "The Whispering Egg",
    games: 1,
    emoji: '🥚',
    color: const Color(0xFFFFE4B5),
    description: "The prophecy of a hero is laid within a golden cell.",
  ),
  AdventureStage(
    name: "Larva of Legends",
    games: 201,
    emoji: '🐛',
    color: const Color(0xFF98FB98),
    description: "A tiny creature begins its fabled journey of growth.",
  ),
  AdventureStage(
    name: "Chamber of Royal Nectar",
    games: 401,
    emoji: '🍯',
    color: const Color(0xFFFFD700),
    description: "A mystical hall where power and destiny are forged.",
  ),
  AdventureStage(
    name: "Silken Cocoon of Secrets",
    games: 601,
    emoji: '🕸️',
    color: const Color(0xFFDDA0DD),
    description: "Spinning a magical shell to transform.",
  ),
  AdventureStage(
    name: "Dreams of the Pupa Realm",
    games: 801,
    emoji: '🦋',
    color: const Color(0xFF87CEEB),
    description: "Visions of wings and future battles stir inside.",
  ),
  AdventureStage(
    name: "Wings of Dawn",
    games: 1001,
    emoji: '🌅',
    color: const Color(0xFFFFA500),
    description: "Breaking free and taking the first heroic flight.",
  ),
  AdventureStage(
    name: "Hive of Trials",
    games: 1201,
    emoji: '🏠',
    color: const Color(0xFF90EE90),
    description: "Training in ancient duties and learning hidden arts.",
  ),
  AdventureStage(
    name: "Trails of Golden Pollen",
    games: 1401,
    emoji: '🌻',
    color: const Color(0xFFFFC30B),
    description: "Quests across wildflower kingdoms to gather treasure.",
  ),
  AdventureStage(
    name: "Sentinel of the Hiveheart",
    games: 1601,
    emoji: '🛡️',
    color: const Color(0xFFB0C4DE),
    description: "Standing guard against dark invaders.",
  ),
  AdventureStage(
    name: "Crown of the Queen-Bee",
    games: 1801,
    emoji: '👑',
    color: const Color(0xFFFF69B4),
    description: "Ascend the throne, lead the swarm, or begin a new dynasty.",
  ),
];

const int totalGames = 2000;
const Color primaryYellow = Color(0xFFFFC30B);

/// Limits text input to [maxWords] words.
class _WordLimitInputFormatter extends TextInputFormatter {
  final int maxWords;
  _WordLimitInputFormatter(this.maxWords);

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    if (newValue.text.isEmpty) return newValue;
    final words = newValue.text.trim().split(RegExp(r'\s+')).where((s) => s.isNotEmpty).toList();
    if (words.length <= maxWords) return newValue;
    final truncated = words.take(maxWords).join(' ');
    return TextEditingValue(
      text: truncated,
      selection: TextSelection.collapsed(offset: truncated.length),
    );
  }
}

/// Returns path for a flat-top hexagon centered at 0,0 with given radius.
Path hexagonPath(double radius) {
  const int sides = 6;
  final path = Path();
  for (int i = 0; i < sides; i++) {
    final angle = (math.pi / 3) * i - math.pi / 6;
    final x = radius * math.cos(angle);
    final y = radius * math.sin(angle);
    if (i == 0) {
      path.moveTo(x, y);
    } else {
      path.lineTo(x, y);
    }
  }
  path.close();
  return path;
}

/// Golden winding path painter: draws a thick path through level positions.
class WindingPathPainter extends CustomPainter {
  final Size screenSize;
  final List<Offset> pathPoints;
  final double pathWidth;

  WindingPathPainter({
    required this.screenSize,
    required this.pathPoints,
    this.pathWidth = 28,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (pathPoints.length < 2) return;
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    paint.color = const Color(0xFF6b5010);
    paint.strokeWidth = pathWidth + 6;
    canvas.drawPath(_pathFromPoints(), paint);
    paint.color = const Color(0xFFa08020);
    paint.strokeWidth = pathWidth;
    canvas.drawPath(_pathFromPoints(), paint);
    paint.color = const Color(0xFFE6AC00);
    paint.strokeWidth = 3;
    canvas.drawPath(_pathFromPoints(), paint);
  }

  Path _pathFromPoints() {
    final path = Path()..moveTo(pathPoints.first.dx, pathPoints.first.dy);
    for (int i = 1; i < pathPoints.length; i++) {
      path.lineTo(pathPoints[i].dx, pathPoints[i].dy);
    }
    return path;
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Single level marker: hexagon with number (gold) or lock (grey). Optional bee on current.
class HexagonLevelMarker extends StatelessWidget {
  final int levelNumber;
  final bool isCurrent;
  final bool isLocked;
  final bool isCompleted;
  final VoidCallback? onTap;
  final double size;

  const HexagonLevelMarker({
    super.key,
    required this.levelNumber,
    this.isCurrent = false,
    this.isLocked = false,
    this.isCompleted = false,
    this.onTap,
    this.size = 36,
  });

  @override
  Widget build(BuildContext context) {
    // Passed = green, current = orange, levels ahead = red
    final Color fillColor;
    if (isCompleted) {
      fillColor = const Color(0xFF4CAF50); // green
    } else if (isCurrent) {
      fillColor = const Color(0xFFFF9800); // orange
    } else {
      fillColor = const Color(0xFFE53935); // red (levels ahead / locked)
    }
    return GestureDetector(
      onTap: isLocked ? null : onTap,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          CustomPaint(
            size: Size(size * 1.15, size * 1.15),
            painter: _HexagonShapePainter(
              fillColor: fillColor,
              borderColor: isCurrent ? Colors.black : Colors.white,
              borderWidth: isCurrent ? 3 : 2,
            ),
          ),
          Positioned.fill(
            child: Center(
              child: isLocked
                  ? const Text('🔒', style: TextStyle(fontSize: 18))
                  : Text(
                      '$levelNumber',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        shadows: [Shadow(color: Colors.black45, offset: Offset(1, 1), blurRadius: 1)],
                      ),
                    ),
            ),
          ),
          if (isCurrent && !isLocked)
            Positioned(
              top: -20,
              left: 0,
              right: 0,
              child: Center(
                child: Text('🐝', style: TextStyle(fontSize: size * 0.55)),
              ),
            ),
        ],
      ),
    );
  }
}

class _HexagonShapePainter extends CustomPainter {
  final Color fillColor;
  final Color borderColor;
  final double borderWidth;

  _HexagonShapePainter({
    required this.fillColor,
    required this.borderColor,
    required this.borderWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.shortestSide / 2 - 2;
    final path = hexagonPath(radius).shift(center);
    canvas.drawPath(
      path,
      Paint()
        ..color = fillColor
        ..style = PaintingStyle.fill,
    );
    canvas.drawPath(
      path,
      Paint()
        ..color = borderColor
        ..style = PaintingStyle.stroke
        ..strokeWidth = borderWidth,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _VolcanoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final path = Path()
      ..moveTo(size.width * 0.5, 0)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
    canvas.drawPath(
      path,
      Paint()
        ..color = const Color(0xFF4a4a4a)
        ..style = PaintingStyle.fill,
    );
    canvas.drawPath(
      path,
      Paint()
        ..color = Colors.black26
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2,
    );
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(size.width * 0.5, size.height * 0.15),
        width: size.width * 0.5,
        height: size.height * 0.15,
      ),
      Paint()..color = const Color(0xFFE74C3C),
    );
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(size.width * 0.5, size.height * 0.12),
        width: size.width * 0.3,
        height: size.height * 0.08,
      ),
      Paint()..color = const Color(0xFFF5B041),
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

enum GameMode {
  menu,
  aiGame,
  adventureGame,
  localMultiplayer,
  privacyPolicy,
  connect,
  settings,
  profile,
  signIn,
  signUp,
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> with TickerProviderStateMixin {
  GameMode gameMode = GameMode.menu;
  bool showDifficultyModal = false;
  bool showTimerModal = false;
  bool showSettingsModal = false;
  bool soundEnabled = true;
  String selectedDifficulty = '';
  String aiDifficulty = 'medium';
  int aiTimer = 15;
  bool isClassicStreakMode = false;
  int currentGame = 1;
  int highestUnlockedGame = totalGames; // All games unlocked for testing
  List<int> gamesCompleted = [];
  double mapScrollY = 0;
  final ScrollController mapScrollController = ScrollController();
  final TextEditingController _talkToUsController = TextEditingController();
  int? _headerXp;
  int _appRating = 0;

  late AnimationController bee1Controller;
  late AnimationController bee2Controller;
  late AnimationController bee3Controller;

  @override
  void initState() {
    super.initState();
    // Load saved sound preference and start looping background sound when player enters the game
      SharedPreferences.getInstance().then((prefs) {
      if (!mounted) return;
      final saved = prefs.getBool(BackgroundSound.soundEnabledKey) ?? true;
      if (saved != soundEnabled) setState(() => soundEnabled = saved);
      final savedRating = prefs.getInt('bee_five_app_rating');
      if (savedRating != null && savedRating != _appRating) setState(() => _appRating = savedRating);
      final savedLevel = prefs.getInt('adventure_current_level');
      if (savedLevel != null && savedLevel != currentGame) {
        setState(() {
          currentGame = savedLevel;
          gamesCompleted = savedLevel > 1 ? List.generate(savedLevel - 1, (i) => i + 1) : [];
        });
      } else if (savedLevel != null && gamesCompleted.isEmpty && savedLevel > 1) {
        setState(() => gamesCompleted = List.generate(savedLevel - 1, (i) => i + 1));
      }
    });
    BackgroundSound.instance.startIfEnabled().then((_) {
      if (mounted) setState(() => soundEnabled = BackgroundSound.instance.soundEnabled);
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      void scrollToLevel1() {
        if (!mounted || !mapScrollController.hasClients) return;
        final pos = mapScrollController.position;
        if (pos.hasContentDimensions && pos.maxScrollExtent > 0) {
          mapScrollController.jumpTo(pos.maxScrollExtent);
        }
      }
      scrollToLevel1();
      Future.delayed(const Duration(milliseconds: 100), scrollToLevel1);
    });
    // Initialize bee animations
    bee1Controller = AnimationController(
      duration: const Duration(seconds: 12),
      vsync: this,
    )..repeat();
    
    bee2Controller = AnimationController(
      duration: const Duration(seconds: 15),
      vsync: this,
    )..repeat();
    
    bee3Controller = AnimationController(
      duration: const Duration(seconds: 18),
      vsync: this,
    )..repeat();
    
    // Delay bee 3 animation
    Future.delayed(const Duration(seconds: 10), () {
      if (mounted) {
        bee3Controller.repeat();
      }
    });
    // XP: apply login bonus and show in header
    onAppOpen().then((_) => getXp()).then((xp) {
      if (mounted) setState(() => _headerXp = xp);
    });
  }

  @override
  void dispose() {
    _talkToUsController.dispose();
    bee1Controller.dispose();
    bee2Controller.dispose();
    bee3Controller.dispose();
    mapScrollController.dispose();
    super.dispose();
  }

  Map<String, double> getGamePosition(int gameNumber, Size screenSize) {
    final isMobile = screenSize.width <= 768;
    final gameIndex = gameNumber - 1;
    final spacing = isMobile ? 60.0 : 80.0;
    final totalHeight = totalGames * spacing;
    final y = totalHeight - (gameIndex * spacing);
    
    final gamesPerSide = 4;
    final sideIndex = (gameIndex / gamesPerSide).floor();
    final positionInSide = gameIndex % gamesPerSide;
    
    double x;
    if (isMobile) {
      if (sideIndex % 2 == 0) {
        if (positionInSide == 0) {
          x = 15;
        } else if (positionInSide == 1) {
          x = 25;
        } else if (positionInSide == 2) {
          x = 35;
        } else {
          x = 45;
        }
      } else {
        if (positionInSide == 0) {
          x = 55;
        } else if (positionInSide == 1) {
          x = 65;
        } else if (positionInSide == 2) {
          x = 55;
        } else {
          x = 45;
        }
      }
    } else {
      if (sideIndex % 2 == 0) {
        if (positionInSide < 2) {
          x = 8 + (positionInSide * 12);
        } else {
          x = 28 + ((positionInSide - 2) * 12);
        }
      } else {
        if (positionInSide < 2) {
          x = 72 + (positionInSide * 12);
        } else {
          x = 52 + ((positionInSide - 2) * 12);
        }
      }
    }
    
    return {
      'left': math.max(5.0, math.min(95.0, x)),
      'top': y,
    };
  }

  List<Widget> _buildMapImagery(Size screenSize, double totalHeight) {
    const imageSize = 144.0; // 2x bigger (was 72)
    const imageSizeSmall = 72.0; // half of honeycomb/pollen for honey and nectar
    const sideOffset = 28.0; // distance from path to place on sides
    final positions = <Widget>[];
    // Pollen at 1, 11, 21, 31, ... on LEFT side of path (not behind numbers)
    for (var level = 1; level <= totalGames; level += 10) {
      final pos = getGamePosition(level, screenSize);
      final pathX = screenSize.width * (pos['left']! / 100);
      final top = (pos['top']! - imageSize / 2).clamp(4.0, totalHeight - imageSize - 4);
      final left = (pathX - imageSize - sideOffset).clamp(4.0, screenSize.width - imageSize - 4);
      positions.add(
        Positioned(
          left: left,
          top: top,
          child: Image.asset(
            'assets/mapImagery/pollen.png',
            width: imageSize,
            height: imageSize,
            fit: BoxFit.contain,
            errorBuilder: (_, Object error, StackTrace? stackTrace) => const SizedBox.shrink(),
          ),
        ),
      );
    }
    // Honeycomb at 5, 15, 25, 35, ... on RIGHT side of path (not behind numbers)
    for (var level = 5; level <= totalGames; level += 10) {
      final pos = getGamePosition(level, screenSize);
      final pathX = screenSize.width * (pos['left']! / 100);
      final top = (pos['top']! - imageSize / 2).clamp(4.0, totalHeight - imageSize - 4);
      final left = (pathX + sideOffset).clamp(4.0, screenSize.width - imageSize - 4);
      positions.add(
        Positioned(
          left: left,
          top: top,
          child: Image.asset(
            'assets/mapImagery/honeycomb.png',
            width: imageSize,
            height: imageSize,
            fit: BoxFit.contain,
            errorBuilder: (_, Object error, StackTrace? stackTrace) => const SizedBox.shrink(),
          ),
        ),
      );
    }
    // Honey at multiples of 16 on RIGHT side (half size; does not overlap nectar)
    for (var level = 16; level <= totalGames; level += 16) {
      final pos = getGamePosition(level, screenSize);
      final pathX = screenSize.width * (pos['left']! / 100);
      final top = (pos['top']! - imageSizeSmall / 2).clamp(4.0, totalHeight - imageSizeSmall - 4);
      final left = (pathX + sideOffset).clamp(4.0, screenSize.width - imageSizeSmall - 4);
      positions.add(
        Positioned(
          left: left,
          top: top,
          child: Image.asset(
            'assets/mapImagery/honey.png',
            width: imageSizeSmall,
            height: imageSizeSmall,
            fit: BoxFit.contain,
            errorBuilder: (_, Object error, StackTrace? stackTrace) => const SizedBox.shrink(),
          ),
        ),
      );
    }
    // Nectar at multiples of 13 on LEFT side (half size; skip multiples of 16 so no overlap with honey)
    for (var level = 13; level <= totalGames; level += 13) {
      if (level % 16 == 0) continue; // same position as honey
      final pos = getGamePosition(level, screenSize);
      final pathX = screenSize.width * (pos['left']! / 100);
      final top = (pos['top']! - imageSizeSmall / 2).clamp(4.0, totalHeight - imageSizeSmall - 4);
      final left = (pathX - imageSizeSmall - sideOffset).clamp(4.0, screenSize.width - imageSizeSmall - 4);
      positions.add(
        Positioned(
          left: left,
          top: top,
          child: Image.asset(
            'assets/mapImagery/nectar.png',
            width: imageSizeSmall,
            height: imageSizeSmall,
            fit: BoxFit.contain,
            errorBuilder: (_, Object error, StackTrace? stackTrace) => const SizedBox.shrink(),
          ),
        ),
      );
    }
    return positions;
  }

  Map<String, int> getVisibleGameRange(Size screenSize) {
    final isMobile = screenSize.width <= 768;
    final spacing = isMobile ? 60.0 : 80.0;
    final totalHeight = totalGames * spacing;
    final viewportHeight = math.max(100.0, (screenSize.height - 324) * 0.9); // map 10% shorter
    final buffer = viewportHeight * 2;
    final startY = math.max(0.0, mapScrollY - buffer);
    final endY = mapScrollY + viewportHeight + buffer;
    final startGame = math.max(1, ((totalHeight - endY) / spacing).floor() + 1);
    final endGame = math.min(totalGames, ((totalHeight - startY) / spacing).floor() + 1);
    return {
      'startGame': math.max(1, startGame - 20),
      'endGame': math.min(totalGames, endGame + 20),
    };
  }

  /// Vertical margin used to center the map between the two yellow bands.
  (double, double) _mapVerticalMargins(Size screenSize) {
    const topOfSpace = 166.0;   // below header + yellow band (74 + 92)
    const bottomOfSpaceFromBottom = 140.0; // above footer yellow band
    final availableHeight = screenSize.height - topOfSpace - bottomOfSpaceFromBottom;
    final mapHeight = (screenSize.height - 324) * 0.9;
    final totalMargin = math.max(0.0, availableHeight - mapHeight);
    // More margin at bottom so the map sits higher / more centred
    final marginTop = totalMargin * 0.25;
    final marginBottom = totalMargin * 0.75;
    return (marginTop, marginBottom);
  }

  Widget buildMapBackground(Size screenSize) {
    if (gameMode != GameMode.menu) {
      return const SizedBox.shrink();
    }
    
    final isMobile = screenSize.width <= 768;
    final spacing = isMobile ? 60.0 : 80.0;
    final totalHeight = totalGames * spacing;
    final visibleRange = getVisibleGameRange(screenSize);
    final (mapMarginTop, mapMarginBottom) = _mapVerticalMargins(screenSize);
    
    return Stack(
      children: [
        // Header: back up 10px (top 0), opacity 0.5, padding top -20px, padding bottom -10px, height -30px
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          child: Container(
            height: 74,
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.5),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.25),
                  blurRadius: 8,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            padding: EdgeInsets.only(
              top: 10,
              left: isMobile ? 12 : 16,
              right: isMobile ? 12 : 16,
              bottom: 0,
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Logo centered in header
                Center(
                  child: Image.asset(
                    'assets/BEE-FIVE.png',
                    height: isMobile ? 44 : 52,
                    fit: BoxFit.contain,
                    errorBuilder: (_, Object error, StackTrace? stackTrace) => Text(
                      'BEE-FIVE',
                      style: TextStyle(
                        fontSize: isMobile ? 18 : 22,
                        fontWeight: FontWeight.w900,
                        color: primaryYellow,
                      ),
                    ),
                  ),
                ),
                // Right side: XP gem + profile
                Positioned(
                  right: 0,
                  top: 0,
                  bottom: 0,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _buildHeaderXpGem(isMobile),
                      GestureDetector(
                  onTap: () => setState(() => gameMode = GameMode.profile),
                  child: Container(
                    width: isMobile ? 40 : 48,
                    height: isMobile ? 40 : 48,
                    decoration: BoxDecoration(
                      color: const Color(0xFF2c2c2c),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.black, width: 2),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.3),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: const Center(
                      child: Text('👤', style: TextStyle(fontSize: 24)),
                    ),
                  ),
                ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        
        // Yellow band between header and map: BEE-FIVE (black) + tagline
        Positioned(
          top: 74,
          left: 0,
          right: 0,
          height: 92,
          child: Container(
            color: primaryYellow,
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'BEE-FIVE',
                  style: TextStyle(
                    fontSize: isMobile ? 36 : 40,
                    fontWeight: FontWeight.w900,
                    color: Colors.black,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 4),
                RichText(
                  textAlign: TextAlign.center,
                  text: TextSpan(
                    style: TextStyle(
                      fontSize: isMobile ? 15 : 18,
                      fontWeight: FontWeight.w600,
                    ),
                    children: [
                      const TextSpan(text: 'Connect 5', style: TextStyle(color: Colors.red)),
                      const TextSpan(text: ' ● ', style: TextStyle(color: Colors.black87)),
                      const TextSpan(text: 'Outthink', style: TextStyle(color: Colors.orange)),
                      const TextSpan(text: ' ● ', style: TextStyle(color: Colors.black87)),
                      const TextSpan(text: 'Win', style: TextStyle(color: Colors.green)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        // Map Container (world map style) - centred vertically
        Positioned(
          top: 166 + mapMarginTop,
          left: 0,
          right: 0,
          bottom: 140 + mapMarginBottom,
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0xFFe8d48b),
                  Color(0xFFc9b85c),
                  Color(0xFFa89840),
                  Color(0xFF8b7a2e),
                ],
              ),
              border: Border.all(
                color: Colors.black,
                width: 3,
              ),
            ),
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                NotificationListener<ScrollNotification>(
              onNotification: (notification) {
                if (notification is ScrollUpdateNotification) {
                  setState(() {
                    mapScrollY = mapScrollController.offset;
                  });
                }
                return false;
              },
              child: SingleChildScrollView(
                controller: mapScrollController,
                child: SizedBox(
                  height: totalHeight,
                  width: screenSize.width,
                  child: Stack(
                    children: [
                      // 1) Hills (background)
                      Positioned(
                        left: -80,
                        top: totalHeight * 0.6,
                        child: Container(
                          width: 280,
                          height: 120,
                          decoration: BoxDecoration(
                            shape: BoxShape.rectangle,
                            borderRadius: BorderRadius.circular(100),
                            gradient: LinearGradient(
                              begin: Alignment.bottomCenter,
                              end: Alignment.topCenter,
                              colors: [Color(0xFFa89840), Color(0xFFc9b85c)],
                            ),
                          ),
                        ),
                      ),
                      Positioned(
                        right: -60,
                        top: totalHeight * 0.65,
                        child: Container(
                          width: 220,
                          height: 100,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(80),
                            gradient: LinearGradient(
                              begin: Alignment.bottomCenter,
                              end: Alignment.topCenter,
                              colors: [Color(0xFF8b7a2e), Color(0xFFb8982e)],
                            ),
                          ),
                        ),
                      ),
                      // 2) Winding path (golden)
                      CustomPaint(
                        size: Size(screenSize.width, totalHeight),
                        painter: WindingPathPainter(
                          screenSize: screenSize,
                          pathPoints: List.generate(
                            visibleRange['endGame']! - visibleRange['startGame']! + 1,
                            (i) {
                              final g = visibleRange['startGame']! + i;
                              final pos = getGamePosition(g, screenSize);
                              return Offset(
                                screenSize.width * (pos['left']! / 100),
                                pos['top']!,
                              );
                            },
                          ),
                        ),
                      ),
                      // 3) River + bridge
                      Positioned(
                        left: 0,
                        top: totalHeight * 0.72,
                        child: Container(
                          width: screenSize.width,
                          height: 32,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [Color(0xFF5DADE2), Color(0xFF3498DB)],
                            ),
                          ),
                        ),
                      ),
                      Positioned(
                        left: screenSize.width * 0.35,
                        top: totalHeight * 0.71,
                        child: Container(
                          width: screenSize.width * 0.3,
                          height: 18,
                          decoration: BoxDecoration(
                            color: Color(0xFF8B4513),
                            borderRadius: BorderRadius.circular(4),
                            boxShadow: [
                              BoxShadow(color: Colors.black26, blurRadius: 4, offset: Offset(0, 2)),
                            ],
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                            children: List.generate(5, (_) => Container(width: 2, height: 10, color: Color(0xFF5D4037))),
                          ),
                        ),
                      ),
                      // 4) Volcano (bottom right)
                      Positioned(
                        right: screenSize.width * 0.05,
                        top: totalHeight * 0.78,
                        child: CustomPaint(
                          size: Size(50, 70),
                          painter: _VolcanoPainter(),
                        ),
                      ),
                      // 4b) Map imagery: beefivemascot, honeycomb, pollen (appear as user scrolls)
                      ..._buildMapImagery(screenSize, totalHeight),
                      // 5) Beehive (top-right area, no leaves)
                      Positioned(
                        right: screenSize.width * 0.08,
                        top: totalHeight * 0.08,
                        child: Image.asset(
                          'assets/homeImagery/home.png',
                          width: 36,
                          height: 36,
                          fit: BoxFit.contain,
                          errorBuilder: (_, _, _) => const SizedBox.shrink(),
                        ),
                      ),
                      // 6) Images on the LEFT side of the hexagonal path
                      ...List.generate(40, (i) {
                        final gameIndex = visibleRange['startGame']! + (i * 2);
                        if (gameIndex > visibleRange['endGame']!) return null;
                        final position = getGamePosition(gameIndex, screenSize);
                        final pathX = screenSize.width * (position['left']! / 100);
                        final leftX = pathX - 42 - (i % 3) * 8;
                        if (leftX < -20) return null;
                        final leftDecor = ['🌾', '🌸', '🌺', '🌼', '🌻', '🌷'];
                        return Positioned(
                          left: leftX,
                          top: position['top']! - 12 + (i % 5) * 4,
                          child: Text(
                            leftDecor[i % leftDecor.length],
                            style: TextStyle(fontSize: 18 + (i % 3) * 2, color: Colors.black.withValues(alpha: 0.75)),
                          ),
                        );
                      }).whereType<Widget>(),
                      // 7) Images on the RIGHT side of the hexagonal path
                      ...List.generate(40, (i) {
                        final gameIndex = visibleRange['startGame']! + (i * 2);
                        if (gameIndex > visibleRange['endGame']!) return null;
                        final position = getGamePosition(gameIndex, screenSize);
                        final pathX = screenSize.width * (position['left']! / 100);
                        final rightX = pathX + 42 + (i % 3) * 8;
                        if (rightX > screenSize.width - 10) return null;
                        final rightDecor = ['🌾', '🌼', '🌷', '🌻', '🌸', '🌺', '🪷'];
                        return Positioned(
                          left: rightX,
                          top: position['top']! - 18 - (i % 4) * 3,
                          child: Text(
                            rightDecor[i % rightDecor.length],
                            style: TextStyle(fontSize: 18 + (i % 3) * 2, color: Colors.black.withValues(alpha: 0.75)),
                          ),
                        );
                      }).whereType<Widget>(),
                      // 8) Stage markers (compact)
                      ...adventureStages.map((stage) {
                        final position = getGamePosition(stage.games, screenSize);
                        return Positioned(
                          left: screenSize.width / 2 - 45,
                          top: position['top']! - 36,
                          child: Container(
                            padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: stage.color,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: Colors.black, width: 2),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                if (stage.emoji == '🏠')
                                  Image.asset(
                                    'assets/homeImagery/home.png',
                                    width: 18,
                                    height: 18,
                                    fit: BoxFit.contain,
                                    errorBuilder: (_, _, _) => Text(stage.emoji, style: TextStyle(fontSize: 18)),
                                  )
                                else
                                  Text(stage.emoji, style: TextStyle(fontSize: 18)),
                                SizedBox(width: 4),
                                Text('S${adventureStages.indexOf(stage) + 1}', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black)),
                              ],
                            ),
                          ),
                        );
                      }),
                      // 9) Level markers = hexagons with numbers
                      ...List.generate(
                        visibleRange['endGame']! - visibleRange['startGame']! + 1,
                        (i) {
                          final gameNumber = visibleRange['startGame']! + i;
                          if (gameNumber < 1 || gameNumber > totalGames) return const SizedBox.shrink();
                          final position = getGamePosition(gameNumber, screenSize);
                          final isCompleted = gamesCompleted.contains(gameNumber);
                          final isCurrent = gameNumber == currentGame;
                          final isLocked = gameNumber > highestUnlockedGame;
                          const hexSize = 40.0;
                          return Positioned(
                            left: screenSize.width * position['left']! / 100 - hexSize / 2,
                            top: position['top']! - hexSize / 2,
                            child: HexagonLevelMarker(
                              levelNumber: gameNumber,
                              isCurrent: isCurrent,
                              isLocked: isLocked,
                              isCompleted: isCompleted,
                              size: hexSize,
                              onTap: () {
                                if (!isLocked) {
                                  _tryStartAdventure(() {
                                    setState(() {
                                      currentGame = gameNumber;
                                      gameMode = GameMode.adventureGame;
                                    });
                                  });
                                }
                              },
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ),
            ),
                // Fixed mascot: larger, shifted more right and 100px down, bottom right of map, half visible (left side), does not scroll.
                Positioned(
                  right: -80,
                  bottom: -100,
                  child: SizedBox(
                    width: 200,
                    height: 320,
                    child: ClipRect(
                      clipBehavior: Clip.hardEdge,
                      child: Align(
                        alignment: Alignment.centerRight,
                        child: Image.asset(
                          'assets/mapImagery/beefivemascot.png',
                          width: 400,
                          height: 320,
                          fit: BoxFit.cover,
                          errorBuilder: (_, Object error, StackTrace? stackTrace) => const SizedBox.shrink(),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _tryStartAdventure(void Function() startAdventure) async {
    final xp = await getXp();
    if (!mounted) return;
    if (xp <= 0) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          backgroundColor: primaryYellow,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: const BorderSide(color: Colors.black, width: 4),
          ),
          title: const Text(
            'No XP',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.black,
            ),
            textAlign: TextAlign.center,
          ),
          content: const Text(
            'You have zero XPs, win Practice hard game, or win 3 games in a classic game to gain XPs.',
            style: TextStyle(fontSize: 16, color: Colors.black87),
            textAlign: TextAlign.center,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('OK'),
            ),
          ],
        ),
      );
      return;
    }
    startAdventure();
  }

  Widget _buildHeaderXpGem(bool isMobile) {
    final size = isMobile ? 28.0 : 32.0;
    return Padding(
      padding: EdgeInsets.only(right: isMobile ? 8 : 12),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Image.asset(
            'assets/homeImagery/xp_gem.png',
            width: size,
            height: size,
            fit: BoxFit.contain,
            errorBuilder: (_, Object error, StackTrace? stackTrace) => Icon(Icons.star, color: primaryYellow, size: size),
          ),
          SizedBox(width: isMobile ? 4 : 6),
          Text(
            '${_headerXp ?? 0}',
            style: TextStyle(
              fontSize: isMobile ? 16 : 18,
              fontWeight: FontWeight.bold,
              color: primaryYellow,
            ),
          ),
        ],
      ),
    );
  }

  Widget buildMenuOverlay(Size screenSize) {
    if (gameMode != GameMode.menu) {
      return const SizedBox.shrink();
    }
    
    return Stack(
      children: [
        // Left side buttons (Play with a Friend, Classic Mode, Settings)
        Positioned(
          left: 10,
          top: 0,
          bottom: 0,
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Play with a Friend
                _sideMenuButton(
                  label: 'Play with a Friend',
                  iconImagePath: 'assets/homeImagery/play-with-friend.png',
                  color: Colors.green,
                  onPressed: () {
                    setState(() => gameMode = GameMode.localMultiplayer);
                  },
                ),
                const SizedBox(height: 12),
                // Classic Mode (10 min streak only — no difficulty; practice has Easy/Medium/Hard)
                _sideMenuButton(
                  label: 'Classic Mode',
                  iconImagePath: 'assets/homeImagery/classic-mode.png',
                  color: Colors.blue,
                  onPressed: () {
                    setState(() {
                      isClassicStreakMode = true;
                      aiDifficulty = 'hard';
                      aiTimer = 0;
                      gameMode = GameMode.aiGame;
                    });
                  },
                ),
                const SizedBox(height: 12),
                // Buy XPs
                _sideMenuButton(
                  label: 'Buy XPs',
                  iconImagePath: 'assets/homeImagery/buy_icon.png',
                  color: Colors.orange,
                  onPressed: _showBuyXPsModal,
                ),
              ],
            ),
          ),
        ),
        
        // Continue Level button (orange) — underneath the map, above footer
        Positioned(
          bottom: 140,
          left: 0,
          right: 0,
          child: Center(
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () {
                  _tryStartAdventure(() => setState(() => gameMode = GameMode.adventureGame));
                },
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Color(0xFF43A047), Color(0xFF2E7D32)],
                    ),
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 4),
                      ),
                      BoxShadow(
                        color: Colors.white.withValues(alpha: 0.2),
                        blurRadius: 0,
                        offset: const Offset(0, 1),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('▶', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                      const SizedBox(width: 10),
                      Text(
                        'Level $currentGame',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
        // Yellow band between map and footer
        Positioned(
          bottom: 100,
          left: 0,
          right: 0,
          height: 40,
          child: Container(color: primaryYellow),
        ),
        // Bottom nav: height -20px, padding top -20px
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          child: Container(
            height: 100,
            decoration: BoxDecoration(
              color: Colors.black,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.25),
                  blurRadius: 8,
                  offset: const Offset(0, -4),
                ),
              ],
            ),
            padding: const EdgeInsets.only(top: 0, left: 8, right: 8, bottom: 40),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _bottomNavItem(iconImagePath: 'assets/homeImagery/home.png', label: 'Home', active: true, onTap: () {}),
                _bottomNavItem(iconImagePath: 'assets/homeImagery/privacy-policy.png', label: 'Privacy Policy', onTap: () => setState(() => gameMode = GameMode.privacyPolicy)),
                _bottomNavItem(icon: '📋', label: 'Practice', onTap: _showDifficultyModal),
                _bottomNavItem(iconImagePath: 'assets/homeImagery/connect.png', label: 'Connect', onTap: () => setState(() => gameMode = GameMode.connect)),
                _bottomNavItem(iconImagePath: 'assets/homeImagery/settings.png', label: 'Settings', onTap: _showSettingsModal),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget buildAnimatedBees(Size screenSize) {
    if (gameMode != GameMode.menu) {
      return const SizedBox.shrink();
    }
    // Show flying bees on all screen sizes (portrait and landscape)
    final isPortrait = screenSize.width <= 768;
    final range = isPortrait ? 0.25 : 0.35;
    final baseX = 0.5;
    final baseY = isPortrait ? 0.35 : 0.4;
    final beeSize = isPortrait ? 20.0 : 24.0;

    return Stack(
      children: [
        AnimatedBuilder(
          animation: bee1Controller,
          builder: (context, child) {
            final t = bee1Controller.value;
            final x = screenSize.width * (baseX + range * math.sin(t * 2 * math.pi));
            final y = screenSize.height * (baseY + 0.18 * math.cos(t * 2 * math.pi));
            return Positioned(
              left: x,
              top: y,
              child: Text('🐝', style: TextStyle(fontSize: beeSize)),
            );
          },
        ),
        AnimatedBuilder(
          animation: bee2Controller,
          builder: (context, child) {
            final t = bee2Controller.value;
            final x = screenSize.width * (baseX + (range + 0.05) * math.cos(t * 2 * math.pi));
            final y = screenSize.height * (baseY + 0.22 * math.sin(t * 2 * math.pi));
            return Positioned(
              left: x,
              top: y,
              child: Text('🐝', style: TextStyle(fontSize: beeSize)),
            );
          },
        ),
        AnimatedBuilder(
          animation: bee3Controller,
          builder: (context, child) {
            final t = bee3Controller.value;
            final x = screenSize.width * (baseX + range * math.sin(t * 2 * math.pi + math.pi / 3));
            final y = screenSize.height * (baseY + 0.2 * math.cos(t * 2 * math.pi + math.pi / 3));
            return Positioned(
              left: x,
              top: y,
              child: Text('🐝', style: TextStyle(fontSize: beeSize)),
            );
          },
        ),
      ],
    );
  }

  Widget _sideMenuButton({
    required String label,
    String? icon,
    String? iconImagePath,
    required Color color,
    required VoidCallback onPressed,
  }) {
    return ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: Colors.black, width: 2),
        ),
        minimumSize: const Size(100, 48),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (iconImagePath != null)
            Image.asset(
              iconImagePath,
              width: 24,
              height: 24,
              fit: BoxFit.contain,
              errorBuilder: (_, _, _) => const SizedBox(width: 24, height: 24),
            )
          else if (icon != null)
            Text(icon, style: const TextStyle(fontSize: 22)),
          if (iconImagePath != null || icon != null) const SizedBox(width: 6),
          Flexible(
            child: Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.bold,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _policySection(String title, List<String> paragraphs) {
    return Padding(
      padding: const EdgeInsets.only(top: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.black,
            ),
          ),
          const SizedBox(height: 10),
          ...paragraphs.map(
            (p) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Text(
                p,
                style: const TextStyle(
                  fontSize: 15,
                  height: 1.6,
                  color: Colors.black87,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {}
  }

  Widget _connectTile({required String imagePath, String? link}) {
    final content = Container(
      height: 100,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.black26),
      ),
      padding: const EdgeInsets.all(8),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Image.asset(
          imagePath,
          fit: BoxFit.contain,
          errorBuilder: (_, _, _) => const Center(child: Icon(Icons.image_not_supported, size: 48)),
        ),
      ),
    );
    if (link != null) {
      return GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => _launchUrl(link),
        child: content,
      );
    }
    return content;
  }

  Widget _bottomNavItem({
    String? icon,
    String? iconImagePath,
    required String label,
    bool active = false,
    required VoidCallback onTap,
  }) {
    final iconColor = active ? primaryYellow : Colors.white.withValues(alpha: 0.85);
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (iconImagePath != null)
              Image.asset(
                iconImagePath,
                width: 26,
                height: 26,
                fit: BoxFit.contain,
                errorBuilder: (_, _, _) => const SizedBox(width: 26, height: 26),
              )
            else if (icon != null)
              Text(icon, style: TextStyle(fontSize: 22, color: iconColor)),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: active ? primaryYellow : Colors.white.withValues(alpha: 0.85),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showDifficultyModal() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: primaryYellow,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Colors.black, width: 4),
        ),
        title: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset(
              'assets/homeImagery/robot_head.png',
              height: 32,
              width: 32,
              fit: BoxFit.contain,
            ),
            const SizedBox(width: 8),
            const Text(
              'Difficulty',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.black,
              ),
            ),
            const SizedBox(width: 8),
            Image.asset(
              'assets/homeImagery/robot_head.png',
              height: 32,
              width: 32,
              fit: BoxFit.contain,
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Choose the AI difficulty level:',
              style: TextStyle(fontSize: 16, color: Colors.black87),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            // Easy
            ElevatedButton(
              onPressed: () {
                setState(() {
                  selectedDifficulty = 'easy';
                  showDifficultyModal = false;
                });
                Navigator.pop(context);
                _showTimerModal();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.black,
                minimumSize: const Size(double.infinity, 50),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                  side: const BorderSide(color: Colors.black, width: 2),
                ),
              ),
              child: const Text(
                '🟢 Easy',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(height: 12),
            // Medium
            ElevatedButton(
              onPressed: () {
                setState(() {
                  selectedDifficulty = 'medium';
                  showDifficultyModal = false;
                });
                Navigator.pop(context);
                _showTimerModal();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.black,
                minimumSize: const Size(double.infinity, 50),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                  side: const BorderSide(color: Colors.black, width: 2),
                ),
              ),
              child: const Text(
                '🟠 Medium',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(height: 12),
            // Hard
            ElevatedButton(
              onPressed: () {
                setState(() {
                  selectedDifficulty = 'hard';
                  showDifficultyModal = false;
                });
                Navigator.pop(context);
                _showTimerModal();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.black,
                minimumSize: const Size(double.infinity, 50),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                  side: const BorderSide(color: Colors.black, width: 2),
                ),
              ),
              child: const Text(
                '🔴 Hard',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(height: 12),
            // Cancel
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.grey,
                minimumSize: const Size(double.infinity, 50),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                  side: const BorderSide(color: Colors.black, width: 2),
                ),
              ),
              child: const Text(
                'Cancel',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showTimerModal() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: primaryYellow,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Colors.black, width: 4),
        ),
        title: const Text(
          '⏱️ Select Timer ⏱️',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Colors.black,
          ),
          textAlign: TextAlign.center,
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Choose timer option:',
              style: TextStyle(fontSize: 16, color: Colors.black87),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            // With Timer
            ElevatedButton(
              onPressed: () {
                setState(() {
                  aiDifficulty = selectedDifficulty;
                  aiTimer = 15;
                  showTimerModal = false;
                  gameMode = GameMode.aiGame;
                });
                Navigator.pop(context);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue,
                minimumSize: const Size(double.infinity, 50),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                  side: const BorderSide(color: Colors.black, width: 2),
                ),
              ),
              child: const Text(
                '⏱️ With Timer (15s)',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(height: 12),
            // No Timer
            ElevatedButton(
              onPressed: () {
                setState(() {
                  aiDifficulty = selectedDifficulty;
                  aiTimer = 0;
                  showTimerModal = false;
                  gameMode = GameMode.aiGame;
                });
                Navigator.pop(context);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.purple,
                minimumSize: const Size(double.infinity, 50),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                  side: const BorderSide(color: Colors.black, width: 2),
                ),
              ),
              child: const Text(
                '∞ No Timer',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(height: 12),
            // Cancel
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                _showDifficultyModal();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.grey,
                minimumSize: const Size(double.infinity, 50),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                  side: const BorderSide(color: Colors.black, width: 2),
                ),
              ),
              child: const Text(
                'Cancel',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showBuyXPsModal() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: primaryYellow,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Colors.black, width: 4),
        ),
        title: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset(
              'assets/homeImagery/buy_icon.png',
              height: 32,
              width: 32,
              fit: BoxFit.contain,
              errorBuilder: (_, _, _) => const Icon(Icons.shopping_bag, size: 32),
            ),
            const SizedBox(width: 8),
            const Text(
              'Buy XPs',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.black,
              ),
            ),
          ],
        ),
        content: const Text(
          'Purchase experience points to progress faster.',
          style: TextStyle(fontSize: 16, color: Colors.black87),
          textAlign: TextAlign.center,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showSettingsModal() {
    showDialog(
      context: context,
      builder: (dialogContext) {
        bool soundOn = BackgroundSound.instance.soundEnabled;
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: primaryYellow,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: const BorderSide(color: Colors.black, width: 4),
              ),
              title: const Text(
                'Settings',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.black,
                ),
                textAlign: TextAlign.center,
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Sound:',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            soundOn ? 'On' : 'Off',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Colors.black87,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Switch(
                            value: soundOn,
                            onChanged: (value) async {
                              final newValue = await BackgroundSound.instance.setEnabled(value);
                              setDialogState(() => soundOn = newValue);
                              if (mounted) setState(() => soundEnabled = newValue);
                            },
                            activeTrackColor: Colors.green.shade700,
                            activeThumbColor: primaryYellow,
                            inactiveThumbColor: Colors.white,
                            inactiveTrackColor: Colors.grey.shade600,
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: () {
                      Navigator.pop(dialogContext);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.grey,
                      minimumSize: const Size(double.infinity, 50),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                        side: const BorderSide(color: Colors.black, width: 2),
                      ),
                    ),
                    child: const Text(
                      'Close',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    
    // Handle different game modes
    if (gameMode == GameMode.aiGame) {
      return ClassicAIGame(
        onBackToMenu: () {
          setState(() {
            gameMode = GameMode.menu;
            isClassicStreakMode = false;
          });
          getXp().then((xp) {
            if (mounted) setState(() => _headerXp = xp);
          });
        },
        initialDifficulty: aiDifficulty,
        initialTimer: aiTimer,
        backgroundColor: 'yellow',
        isClassicStreakMode: isClassicStreakMode,
      );
    }
    
    if (gameMode == GameMode.localMultiplayer) {
      return SimpleGame(
        onBackToMenu: () {
          setState(() {
            gameMode = GameMode.menu;
          });
        },
        backgroundColor: 'yellow',
      );
    }
    
    if (gameMode == GameMode.adventureGame) {
      return AdventureGame(
        onBackToMenu: () {
          setState(() => gameMode = GameMode.menu);
          SharedPreferences.getInstance().then((prefs) {
            final level = prefs.getInt('adventure_current_level');
            if (mounted && level != null) {
              setState(() {
                currentGame = level;
                gamesCompleted = level > 1 ? List.generate(level - 1, (i) => i + 1) : [];
              });
            }
          });
          getXp().then((xp) {
            if (mounted) setState(() => _headerXp = xp);
          });
        },
        initialGame: currentGame,
      );
    }
    
    if (gameMode == GameMode.profile) {
      return DashboardPage(
        onBack: () => setState(() => gameMode = GameMode.menu),
      );
    }
    
    if (gameMode == GameMode.privacyPolicy) {
      return Scaffold(
        appBar: AppBar(
          title: Center(
            child: Image.asset(
              'assets/BEE-FIVE.png',
              height: 36,
              fit: BoxFit.contain,
              errorBuilder: (_, Object error, StackTrace? stackTrace) => const Text('BEE-FIVE'),
            ),
          ),
          backgroundColor: primaryYellow,
          automaticallyImplyLeading: false,
        ),
        body: Container(
          color: primaryYellow,
          child: Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Bee-Five ("we", "our", or "us") operates the Bee-Five mobile application (the "Service"), developed by MindGrind. This page informs you of our policies regarding the collection, use, and disclosure of personal information when you use our Service.',
                        style: TextStyle(
                          fontSize: 16,
                          height: 1.6,
                          color: Colors.black87,
                        ),
                      ),
                      const Align(
                        alignment: Alignment.centerRight,
                        child: Padding(
                          padding: EdgeInsets.only(top: 8),
                          child: Text(
                            'Last Updated: January 2026',
                            style: TextStyle(
                              fontSize: 14,
                              fontStyle: FontStyle.italic,
                              color: Colors.black87,
                            ),
                          ),
                        ),
                      ),
                      _policySection('Information We Collect', [
                        'We may collect the following types of information:',
                        '• Non-personal data: Device information, operating system, app version, and general usage statistics',
                        '• Account information: If you sign up for an account or multiplayer features, we may collect an email address for login and account management purposes',
                        '• Game progress: Local game progress and statistics stored on your device',
                        'We do not collect sensitive personal information such as payment details, location data, or contact lists.',
                      ]),
                      _policySection('Third-Party Services', [
                        'Our app may use the following third-party services:',
                        '• Supabase: For backend services and data storage (if applicable). See Supabase\'s Privacy Policy for details.',
                        'These services have their own privacy policies governing the collection and use of your information. We encourage you to review their privacy policies.',
                      ]),
                      _policySection('Your Rights (GDPR & CCPA)', [
                        'If you are located in the European Economic Area (EEA) or California, you have the following rights:',
                        '• Right to Access: You can request a copy of the personal data we hold about you',
                        '• Right to Rectification: You can request correction of inaccurate personal data',
                        '• Right to Erasure: You can request deletion of your personal data',
                        '• Right to Data Portability: You can request your data in a portable format',
                        '• Right to Object: You can object to processing of your personal data',
                        '• Right to Withdraw Consent: You can withdraw consent for data processing at any time',
                        'To exercise these rights, please contact us using the information in the "Contact Us" section below.',
                      ]),
                      _policySection('Children\'s Privacy', [
                        'Our Service is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.',
                        'If we discover that we have collected personal information from a child under 13, we will delete that information promptly.',
                      ]),
                      _policySection('Data Security', [
                        'We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your data, we cannot guarantee absolute security.',
                      ]),
                      _policySection('Data Retention', [
                        'We retain your personal information only for as long as necessary to provide our Service and fulfill the purposes outlined in this Privacy Policy. When you request deletion of your data, we will delete it within 30 days, except where we are required to retain it by law.',
                      ]),
                      _policySection('Changes to This Policy', [
                        'We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.',
                      ]),
                      _policySection('Contact Us', [
                        'If you have any questions about this Privacy Policy, wish to exercise your rights, or need to contact us regarding your personal data, please reach out to us:',
                        'Email: admin@mindgrind.co.za',
                        'Developer: MindGrind',
                        'App: Bee-Five',
                        'We will respond to your inquiry within 30 days.',
                      ]),
                      const Padding(
                        padding: EdgeInsets.only(top: 24, bottom: 16),
                        child: Center(
                          child: Text(
                            '© 2026 Bee-Five. Product of MindGrind.',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.black54,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              // Same footer as homepage
              Container(
                height: 100,
                decoration: BoxDecoration(
                  color: Colors.black,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.25),
                      blurRadius: 8,
                      offset: const Offset(0, -4),
                    ),
                  ],
                  border: const Border(
                    top: BorderSide(color: primaryYellow, width: 2),
                  ),
                ),
                padding: const EdgeInsets.only(top: 0, left: 8, right: 8, bottom: 40),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _bottomNavItem(iconImagePath: 'assets/homeImagery/home.png', label: 'Home', onTap: () => setState(() => gameMode = GameMode.menu)),
                    _bottomNavItem(iconImagePath: 'assets/homeImagery/privacy-policy.png', label: 'Privacy Policy', active: true, onTap: () {}),
                    _bottomNavItem(icon: '📋', label: 'Practice', onTap: _showDifficultyModal),
                    _bottomNavItem(iconImagePath: 'assets/homeImagery/connect.png', label: 'Connect', onTap: () => setState(() => gameMode = GameMode.connect)),
                    _bottomNavItem(iconImagePath: 'assets/homeImagery/settings.png', label: 'Settings', onTap: _showSettingsModal),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (gameMode == GameMode.connect) {
      return Scaffold(
        appBar: AppBar(
          title: Image.asset(
            'assets/BEE-FIVE.png',
            height: 36,
            fit: BoxFit.contain,
            errorBuilder: (_, Object error, StackTrace? stackTrace) => Text(
              'BEE-FIVE',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                color: Colors.black,
              ),
            ),
          ),
          centerTitle: true,
          backgroundColor: primaryYellow,
          automaticallyImplyLeading: false,
        ),
        body: Container(
          color: primaryYellow,
          child: Column(
            children: [
              const Padding(
                padding: EdgeInsets.only(top: 24, bottom: 12),
                child: Text(
                  'Connect with us',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.black,
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(bottom: 20),
                child: Column(
                  children: [
                    const Text(
                      'Rate the App',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(5, (index) {
                        final star = index + 1;
                        final filled = _appRating >= star;
                        return GestureDetector(
                          onTap: () async {
                            setState(() => _appRating = star);
                            final prefs = await SharedPreferences.getInstance();
                            await prefs.setInt('bee_five_app_rating', star);
                          },
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 4),
                            child: Icon(
                              filled ? Icons.star : Icons.star_border,
                              size: 40,
                              color: filled ? primaryYellow : Colors.black54,
                            ),
                          ),
                        );
                      }),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(child: _connectTile(imagePath: 'assets/BEE-FIVE.png', link: 'https://www.beefiveweb.com')),
                          const SizedBox(width: 20),
                          Expanded(child: _connectTile(imagePath: 'assets/socials/instagram.png', link: 'https://www.instagram.com/beefive1.01?igsh=ZjhnbjV4ZW1sYTlx&utm_source=qr')),
                        ],
                      ),
                      const SizedBox(height: 20),
                      Row(
                        children: [
                          Expanded(child: _connectTile(imagePath: 'assets/socials/tiktok.png', link: 'https://www.tiktok.com/@beefive1.1?_r=1&_t=ZS-94N1ujIm1AH')),
                          const SizedBox(width: 20),
                          Expanded(child: _connectTile(imagePath: 'assets/socials/linkedIn.png', link: null)),
                        ],
                      ),
                      const SizedBox(height: 20),
                      Row(
                        children: [
                          Expanded(child: _connectTile(imagePath: 'assets/socials/youtube.png', link: null)),
                          const SizedBox(width: 20),
                          Expanded(child: _connectTile(imagePath: 'assets/socials/facebook.png', link: null)),
                        ],
                      ),
                      const SizedBox(height: 32),
                      const Text(
                        'Talk To Us!',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: Colors.black,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Give us a compliment, suggest improvements... We value your input.',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.black87,
                          height: 1.3,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 12),
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border.all(color: Colors.black, width: 2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        child: TextField(
                          controller: _talkToUsController,
                          maxLines: 4,
                          inputFormatters: [_WordLimitInputFormatter(100)],
                          decoration: const InputDecoration(
                            hintText: 'Your message (max 100 words)',
                            border: InputBorder.none,
                            isDense: true,
                            contentPadding: EdgeInsets.zero,
                          ),
                          style: const TextStyle(fontSize: 15, color: Colors.black87),
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () async {
                            final body = _talkToUsController.text.trim();
                            if (body.isEmpty) return;
                            final uri = Uri.parse(
                              'mailto:admin@mindgrind.co.za?body=${Uri.encodeComponent(body)}',
                            );
                            try {
                              await launchUrl(uri, mode: LaunchMode.externalApplication);
                            } catch (_) {}
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.black,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          child: const Text('Send to admin@mindgrind.co.za'),
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),
              // Same footer as homepage: yellow band + black nav bar
              Container(color: primaryYellow, height: 40),
              Container(
                height: 100,
                decoration: BoxDecoration(
                  color: Colors.black,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.25),
                      blurRadius: 8,
                      offset: const Offset(0, -4),
                    ),
                  ],
                ),
                padding: const EdgeInsets.only(top: 0, left: 8, right: 8, bottom: 40),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _bottomNavItem(iconImagePath: 'assets/homeImagery/home.png', label: 'Home', onTap: () => setState(() => gameMode = GameMode.menu)),
                    _bottomNavItem(iconImagePath: 'assets/homeImagery/privacy-policy.png', label: 'Privacy Policy', onTap: () => setState(() => gameMode = GameMode.privacyPolicy)),
                    _bottomNavItem(icon: '📋', label: 'Practice', onTap: _showDifficultyModal),
                    _bottomNavItem(iconImagePath: 'assets/homeImagery/connect.png', label: 'Connect', active: true, onTap: () {}),
                    _bottomNavItem(iconImagePath: 'assets/homeImagery/settings.png', label: 'Settings', onTap: _showSettingsModal),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
    }
    
    return Scaffold(
      backgroundColor: primaryYellow,
      body: Stack(
        children: [
          // Map background
          buildMapBackground(screenSize),
          
          // Animated bees (desktop only)
          buildAnimatedBees(screenSize),
          
          // Menu overlay
          buildMenuOverlay(screenSize),
          
        ],
      ),
    );
  }
}

