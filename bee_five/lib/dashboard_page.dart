import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'adventure_progress_service.dart' show syncAdventureProgress;
import 'contexts/auth_context.dart';
import 'xp_service.dart';

const Color _dashboardPrimaryYellow = Color(0xFFFFC30B);

/// Preference keys for dashboard stats (shared with other screens).
const String prefAdventureHighestLevel = 'adventure_highest_unlocked_level';
const String prefAdventureCurrentLevel = 'adventure_current_level';
const String prefClassicBestStreak = 'classic_best_streak';
const String prefLoginStreak = 'login_streak';
const String prefUserXp = 'user_xp';
const String prefUsername = 'user_display_name';

/// Full-page dashboard: username, avatar, and stats table.
/// Replaces the profile popup; opened from the person icon on the home page.
class DashboardPage extends StatefulWidget {
  final AuthContext auth;
  final VoidCallback onBack;

  const DashboardPage({
    super.key,
    required this.auth,
    required this.onBack,
  });

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  String _username = 'Guest';
  int _adventureLevel = 1;
  int _classicBestScore = 0;
  int _loginStreak = 0;
  int _xp = 0;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    await ensureXpInitialized();
    final prefs = await SharedPreferences.getInstance();
    final auth = widget.auth;

    String resolvedName;
    if (auth.isGuest) {
      resolvedName = 'Guest';
    } else if (auth.user != null) {
      final meta = auth.user!.userMetadata?['username']?.toString().trim();
      if (meta != null && meta.isNotEmpty) {
        resolvedName = meta;
      } else {
        final fromPrefs = prefs.getString(prefUsername)?.trim();
        if (fromPrefs != null && fromPrefs.isNotEmpty) {
          resolvedName = fromPrefs;
        } else {
          final email = auth.user!.email;
          resolvedName = (email != null && email.contains('@'))
              ? email.split('@').first
              : 'Guest';
        }
      }
    } else {
      resolvedName = prefs.getString(prefUsername)?.trim() ?? '';
      if (resolvedName.isEmpty) resolvedName = 'Guest';
    }

    int resolvedAdventureLevel =
        prefs.getInt(prefAdventureHighestLevel) ?? prefs.getInt(prefAdventureCurrentLevel) ?? 1;
    int resolvedClassicBestScore = prefs.getInt(prefClassicBestStreak) ?? 0;
    int resolvedLoginStreak = prefs.getInt(prefLoginStreak) ?? 0;
    int resolvedXp = prefs.getInt(prefUserXp) ?? 0;

    // Refresh from merged local/remote progress so dashboard reflects resets
    // and progress changes consistently across devices.
    try {
      final merged = await syncAdventureProgress();
      resolvedAdventureLevel = merged.highestUnlockedGame;
      if (merged.classicBestStreak != null) {
        resolvedClassicBestScore = merged.classicBestStreak!;
      }
      if (merged.loginStreak != null) {
        resolvedLoginStreak = merged.loginStreak!;
      }
      if (merged.userXp != null) {
        resolvedXp = merged.userXp!;
      }
    } catch (_) {
      // Keep local values on sync errors.
    }

    if (!mounted) return;
    setState(() {
      _username = resolvedName;
      _adventureLevel = resolvedAdventureLevel;
      _classicBestScore = resolvedClassicBestScore;
      _loginStreak = resolvedLoginStreak;
      _xp = resolvedXp;
      _loaded = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width <= 768;

    return Scaffold(
      backgroundColor: _dashboardPrimaryYellow, // Set scaffold background color
      appBar: AppBar(
        title: const Text(
          'Dashboard',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: Colors.black,
          ),
        ),
        backgroundColor: _dashboardPrimaryYellow,
        foregroundColor: Colors.black,
        elevation: 0, // Remove shadow for cleaner look
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: widget.onBack,
        ),
      ),
      body: Container(
        color: _dashboardPrimaryYellow, // Ensure body fills with yellow
        child: _loaded
            ? SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                child: Padding(
                  padding: EdgeInsets.symmetric(
                    horizontal: isMobile ? 20 : 40,
                    vertical: 24,
                  ),
                  child: Column(
                    children: [
                      // Username and avatar
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          // Avatar
                          Container(
                            width: 72,
                            height: 72,
                            decoration: BoxDecoration(
                              color: const Color(0xFF2c2c2c),
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.black, width: 3),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.3),
                                  blurRadius: 6,
                                  offset: const Offset(0, 3),
                                ),
                              ],
                            ),
                            child: Center(
                              child: Text(
                                _username.isNotEmpty && _username != 'Guest'
                                    ? _username.substring(0, 1).toUpperCase()
                                    : '👤',
                                style: TextStyle(
                                  fontSize: _username.isNotEmpty && _username != 'Guest' ? 28 : 36,
                                  fontWeight: FontWeight.bold,
                                  color: _username.isNotEmpty && _username != 'Guest'
                                      ? _dashboardPrimaryYellow
                                      : null,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 20),
                          Flexible(
                            child: Text(
                              _username,
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: Colors.black,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 40),
                      // Stats table
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.black, width: 2),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.15),
                              blurRadius: 8,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(14),
                          child: Table(
                            border: TableBorder.symmetric(
                              inside: const BorderSide(
                                color: Colors.black26,
                                width: 1,
                              ),
                            ),
                            columnWidths: const {
                              0: FlexColumnWidth(2),
                              1: FlexColumnWidth(1),
                            },
                            children: [
                              _buildTableHeader(isMobile),
                              _buildRow(
                                'Adventure level',
                                '$_adventureLevel',
                                isMobile,
                              ),
                              _buildRow(
                                'Classic best score',
                                '$_classicBestScore',
                                isMobile,
                              ),
                              _buildRow(
                                'Login streak',
                                '$_loginStreak days',
                                isMobile,
                              ),
                              _buildRow(
                                'XP',
                                '$_xp',
                                isMobile,
                                'assets/homeImagery/xp_gem.png',
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 32),
                    ],
                  ),
                ),
              )
            : const Center(
                child: CircularProgressIndicator(
                  color: Colors.black87,
                ),
              ),
      ),
    );
  }

  TableRow _buildTableHeader(bool isMobile) {
    return TableRow(
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.08),
      ),
      children: [
        Padding(
          padding: EdgeInsets.symmetric(
            horizontal: isMobile ? 12 : 20,
            vertical: isMobile ? 12 : 16,
          ),
          child: Text(
            'Stat',
            style: TextStyle(
              fontSize: isMobile ? 16 : 18,
              fontWeight: FontWeight.bold,
              color: Colors.black,
            ),
          ),
        ),
        Padding(
          padding: EdgeInsets.symmetric(
            horizontal: isMobile ? 12 : 20,
            vertical: isMobile ? 12 : 16,
          ),
          child: Text(
            'Value',
            style: TextStyle(
              fontSize: isMobile ? 16 : 18,
              fontWeight: FontWeight.bold,
              color: Colors.black,
            ),
          ),
        ),
      ],
    );
  }

  TableRow _buildRow(
    String label,
    String value, [
    bool isMobile = false,
    String? valueIcon,
  ]) {
    return TableRow(
      children: [
        Padding(
          padding: EdgeInsets.symmetric(
            horizontal: isMobile ? 12 : 20,
            vertical: isMobile ? 14 : 18,
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: isMobile ? 15 : 16,
              color: Colors.black87,
            ),
          ),
        ),
        Padding(
          padding: EdgeInsets.symmetric(
            horizontal: isMobile ? 12 : 20,
            vertical: isMobile ? 14 : 18,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (valueIcon != null) ...[
                Image.asset(
                  valueIcon,
                  width: 24,
                  height: 24,
                  fit: BoxFit.contain,
                  errorBuilder: (_, error, stackTrace) => const SizedBox.shrink(),
                ),
                const SizedBox(width: 6),
              ],
              Text(
                value,
                style: TextStyle(
                  fontSize: isMobile ? 15 : 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.black,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}