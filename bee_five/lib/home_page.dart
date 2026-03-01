import 'package:flutter/material.dart';
import 'dart:math' as math;
import 'adventure_game.dart';
import 'simple_game.dart';
import 'classic_ai_game.dart';

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

enum GameMode {
  menu,
  aiGame,
  adventureGame,
  localMultiplayer,
  privacyPolicy,
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
  bool showProfileModal = false;
  bool showSettingsModal = false;
  bool soundEnabled = true;
  String selectedDifficulty = '';
  String aiDifficulty = 'medium';
  int aiTimer = 15;
  int currentGame = 1;
  int highestUnlockedGame = totalGames; // All games unlocked for testing
  List<int> gamesCompleted = [];
  double mapScrollY = 0;
  final ScrollController mapScrollController = ScrollController();

  late AnimationController bee1Controller;
  late AnimationController bee2Controller;
  late AnimationController bee3Controller;

  @override
  void initState() {
    super.initState();
    
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
  }

  @override
  void dispose() {
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
    final totalHeight = totalGames * spacing * 0.2;
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

  Map<String, int> getVisibleGameRange(Size screenSize) {
    final isMobile = screenSize.width <= 768;
    if (!isMobile) {
      return {'startGame': 1, 'endGame': 100};
    }
    
    final viewportHeight = screenSize.height;
    final spacing = isMobile ? 60.0 : 80.0;
    final totalHeight = totalGames * spacing * 0.2;
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

  Widget buildMapBackground(Size screenSize) {
    if (gameMode != GameMode.menu) {
      return const SizedBox.shrink();
    }
    
    final isMobile = screenSize.width <= 768;
    final spacing = isMobile ? 60.0 : 80.0;
    final totalHeight = totalGames * spacing * 0.2;
    final visibleRange = getVisibleGameRange(screenSize);
    
    return Stack(
      children: [
        // Header
        Positioned(
          top: 20,
          left: 0,
          right: 0,
          child: Container(
            height: 60,
            color: Colors.black,
            padding: const EdgeInsets.symmetric(horizontal: 15),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Spacer(),
                Image.asset(
                  'assets/BEE-FIVE.png',
                  height: 40,
                  fit: BoxFit.contain,
                ),
                const Spacer(),
                // Profile button
                GestureDetector(
                  onTap: () {
                    _showProfileModal();
                  },
                  child: Container(
                    width: 45,
                    height: 45,
                    decoration: BoxDecoration(
                      color: primaryYellow.withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                      border: Border.all(color: primaryYellow, width: 2),
                    ),
                    child: const Center(
                      child: Text(
                        '👤',
                        style: TextStyle(fontSize: 28),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        
        // Map Container
        Positioned(
          top: screenSize.height * 0.175, // Center vertically: (100% - 65%) / 2 = 17.5%
          left: 0,
          right: 0,
          height: screenSize.height * 0.65, // 65% of screen height
          child: Container(
            decoration: BoxDecoration(
              color: const Color(0xFFF0FFF0),
              border: Border.all(
                color: primaryYellow,
                width: 4, // Medium thick border
              ),
            ),
            child: NotificationListener<ScrollNotification>(
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
                  child: Stack(
                  children: [
                    // Decorative elements
                    ...List.generate(30, (i) {
                      final gameIndex = 1 + (i * 10);
                      if (gameIndex > totalGames) return null;
                      final position = getGamePosition(gameIndex, screenSize);
                      final decorations = ['🌿', '🌱', '🍃', '🌾', '🌺', '🌸', '🌻', '⭐', '✨', '🌼'];
                      final decoration = decorations[i % decorations.length];
                      
                      return Positioned(
                        left: screenSize.width * ((i % 4) * 25 + 5) / 100,
                        top: position['top']! + ((i % 3) * 50 - 50),
                        child: Text(
                          decoration,
                          style: TextStyle(
                            fontSize: 18,
                            color: Colors.black.withValues(alpha: 0.4),
                          ),
                        ),
                      );
                    }).whereType<Widget>(),
                    
                    // Flying bees
                    ...List.generate(15, (i) {
                      final gameIndex = 1 + (i * 5);
                      if (gameIndex > totalGames) return null;
                      final position = getGamePosition(gameIndex, screenSize);
                      
                      return Positioned(
                        left: screenSize.width * ((i % 5) * 18 + 8) / 100,
                        top: position['top']! + ((i % 4) * 40 - 60),
                        child: Text(
                          '🐝',
                          style: TextStyle(
                            fontSize: 18,
                            color: Colors.black.withValues(alpha: 0.6),
                          ),
                        ),
                      );
                    }).whereType<Widget>(),
                    
                    // Stage markers
                    ...adventureStages.map((stage) {
                      final position = getGamePosition(stage.games, screenSize);
                      return Positioned(
                        left: screenSize.width / 2 - 50,
                        top: position['top']! - 40,
                        child: Container(
                          width: 100,
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: stage.color,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.black, width: 2),
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(stage.emoji, style: const TextStyle(fontSize: 24)),
                              Text(
                                'S${adventureStages.indexOf(stage) + 1}',
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.black,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                    
                    // Game pins
                    ...List.generate(
                      visibleRange['endGame']! - visibleRange['startGame']! + 1,
                      (i) {
                        final gameNumber = visibleRange['startGame']! + i;
                        if (gameNumber < 1 || gameNumber > totalGames) {
                          return const SizedBox.shrink();
                        }
                        final position = getGamePosition(gameNumber, screenSize);
                        final isCompleted = gamesCompleted.contains(gameNumber);
                        final isCurrent = gameNumber == currentGame;
                        final isLocked = gameNumber > highestUnlockedGame;
                        
                        return Positioned(
                          left: screenSize.width * position['left']! / 100 - 16,
                          top: position['top']!,
                          child: GestureDetector(
                            onTap: () {
                              if (!isLocked) {
                                setState(() {
                                  currentGame = gameNumber;
                                  gameMode = GameMode.adventureGame;
                                });
                              }
                            },
                            child: Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: isLocked
                                    ? Colors.grey
                                    : isCompleted
                                        ? Colors.green
                                        : primaryYellow,
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: Colors.white,
                                  width: isCurrent ? 3 : 2,
                                ),
                              ),
                              child: Stack(
                                alignment: Alignment.center,
                                children: [
                                  Text(
                                    '$gameNumber',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  if (isLocked)
                                    const Positioned(
                                      top: -2,
                                      right: -2,
                                      child: Text('🔒', style: TextStyle(fontSize: 10)),
                                    ),
                                  if (isCompleted && !isLocked)
                                    const Positioned(
                                      top: -4,
                                      right: -4,
                                      child: Text('⭐', style: TextStyle(fontSize: 12)),
                                    ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
            ),
          ),
        ),
      ],
    );
  }

  Widget buildMenuOverlay(Size screenSize) {
    if (gameMode != GameMode.menu) {
      return const SizedBox.shrink();
    }
    
    return Stack(
      children: [
        // Title
        Positioned(
          top: 90,
          left: 0,
          right: 0,
          child: Column(
            children: [
              const Text(
                'BEE-FIVE',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.normal,
                  color: Colors.black,
                  letterSpacing: 1,
                ),
              ),
              const Text(
                'Connect 5 • Outthink • Win',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.white,
                  fontWeight: FontWeight.normal,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
        ),
        
        // Thought Bubble
        Positioned(
          top: screenSize.height * 0.18,
          left: screenSize.width * 0.1,
          right: screenSize.width * 0.1,
          child: Container(
            padding: const EdgeInsets.all(15),
            decoration: BoxDecoration(
              color: const Color(0xFFD3D3D3),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.black, width: 3),
            ),
            child: RichText(
              textAlign: TextAlign.center,
              text: const TextSpan(
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.black,
                  fontWeight: FontWeight.w600,
                  height: 1.4,
                ),
                children: [
                  TextSpan(text: 'Connect 5 dots '),
                  TextSpan(
                    text: 'vertically',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                  ),
                  TextSpan(text: ', '),
                  TextSpan(
                    text: 'horizontally',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                  ),
                  TextSpan(text: ', or '),
                  TextSpan(
                    text: 'diagonally',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                  ),
                ],
              ),
            ),
          ),
        ),
        
        // Left side buttons
        Positioned(
          left: 10,
          top: 0,
          bottom: 0,
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Play with friend
                ElevatedButton(
                  onPressed: () {
                    setState(() {
                      gameMode = GameMode.localMultiplayer;
                    });
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                      side: const BorderSide(color: Colors.black, width: 3),
                    ),
                    minimumSize: const Size(160, 45),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('👥', style: TextStyle(fontSize: 36)),
                      SizedBox(width: 8),
                      Text(
                        'Play with a\nfriend',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                
                // Classic
                ElevatedButton(
                  onPressed: () {
                    _showDifficultyModal();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                      side: const BorderSide(color: Colors.black, width: 3),
                    ),
                    minimumSize: const Size(160, 45),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('🤖', style: TextStyle(fontSize: 36)),
                      SizedBox(width: 8),
                      Text(
                        'Classic',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                
                // Settings
                ElevatedButton(
                  onPressed: () {
                    _showSettingsModal();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.orange,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                      side: const BorderSide(color: Colors.black, width: 3),
                    ),
                    minimumSize: const Size(160, 45),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('⚙️', style: TextStyle(fontSize: 36)),
                      SizedBox(width: 8),
                      Text(
                        'Settings',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        
        // Play button at bottom
        Positioned(
          bottom: 80,
          left: 0,
          right: 0,
          child: Center(
            child: ElevatedButton(
              onPressed: () {
                setState(() {
                  // Always allow playing - go to current game level
                  gameMode = GameMode.adventureGame;
                });
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(25),
                  side: const BorderSide(color: Colors.black, width: 4),
                ),
                minimumSize: const Size(200, 64),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('▶️', style: TextStyle(fontSize: 28)),
                  const SizedBox(width: 10),
                  Text(
                    'Adventure Level $currentGame',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        
        // Footer
        Positioned(
          bottom: 20,
          left: 0,
          right: 0,
          child: Container(
            color: Colors.black,
            padding: const EdgeInsets.all(20),
            child: TextButton(
              onPressed: () {
                setState(() {
                  gameMode = GameMode.privacyPolicy;
                });
              },
              child: const Text(
                'Privacy Policy',
                style: TextStyle(
                  color: primaryYellow,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.5,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget buildAnimatedBees(Size screenSize) {
    if (gameMode != GameMode.menu || screenSize.width <= 768) {
      return const SizedBox.shrink();
    }
    
    return Stack(
      children: [
        // Bee 1
        AnimatedBuilder(
          animation: bee1Controller,
          builder: (context, child) {
            final t = bee1Controller.value;
            final x = screenSize.width * (0.5 + 0.3 * math.sin(t * 2 * math.pi));
            final y = screenSize.height * (0.3 + 0.2 * math.cos(t * 2 * math.pi));
            
            return Positioned(
              left: x,
              top: y,
              child: const Text('🐝', style: TextStyle(fontSize: 24)),
            );
          },
        ),
        
        // Bee 2
        AnimatedBuilder(
          animation: bee2Controller,
          builder: (context, child) {
            final t = bee2Controller.value;
            final x = screenSize.width * (0.5 + 0.4 * math.cos(t * 2 * math.pi));
            final y = screenSize.height * (0.5 + 0.3 * math.sin(t * 2 * math.pi));
            
            return Positioned(
              left: x,
              top: y,
              child: const Text('🐝', style: TextStyle(fontSize: 24)),
            );
          },
        ),
        
        // Bee 3
        AnimatedBuilder(
          animation: bee3Controller,
          builder: (context, child) {
            final t = bee3Controller.value;
            final x = screenSize.width * (0.5 + 0.35 * math.sin(t * 2 * math.pi + math.pi / 3));
            final y = screenSize.height * (0.4 + 0.25 * math.cos(t * 2 * math.pi + math.pi / 3));
            
            return Positioned(
              left: x,
              top: y,
              child: const Text('🐝', style: TextStyle(fontSize: 24)),
            );
          },
        ),
      ],
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
        title: const Text(
          '🤖 Select Difficulty 🤖',
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
                backgroundColor: Colors.green,
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
                backgroundColor: Colors.orange,
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
                backgroundColor: Colors.red,
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

  void _showSettingsModal() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: primaryYellow,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Colors.black, width: 4),
        ),
        title: const Text(
          '⚙️ Settings ⚙️',
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
                ElevatedButton(
                  onPressed: () {
                    setState(() {
                      soundEnabled = !soundEnabled;
                    });
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: soundEnabled ? Colors.green : Colors.red,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                      side: const BorderSide(color: Colors.black, width: 2),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  ),
                  child: Text(
                    soundEnabled ? '🔊 On' : '🔇 Off',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
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
      ),
    );
  }

  void _showProfileModal() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: primaryYellow,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Colors.black, width: 4),
        ),
        title: const Text(
          '👤 Profile',
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
              'User Profile',
              style: TextStyle(fontSize: 16, color: Colors.black87),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                // Sign out logic would go here
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                minimumSize: const Size(double.infinity, 50),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                  side: const BorderSide(color: Colors.black, width: 2),
                ),
              ),
              child: const Text(
                'Sign Out',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(height: 12),
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
      ),
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
          });
        },
        initialDifficulty: aiDifficulty,
        initialTimer: aiTimer,
        backgroundColor: 'yellow',
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
          setState(() {
            gameMode = GameMode.menu;
          });
        },
        initialGame: currentGame,
      );
    }
    
    if (gameMode == GameMode.privacyPolicy) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Privacy Policy'),
          backgroundColor: primaryYellow,
        ),
        body: Center(
          child: ElevatedButton(
            onPressed: () {
              setState(() {
                gameMode = GameMode.menu;
              });
            },
            child: const Text('Back to Menu'),
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

