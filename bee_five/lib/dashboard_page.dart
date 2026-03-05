import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'xp_service.dart';

const Color _dashboardPrimaryYellow = Color(0xFFFFC30B);

/// Preference keys for dashboard stats (shared with other screens).
const String prefAdventureLevel = 'adventure_current_level';
const String prefClassicBestStreak = 'classic_best_streak';
const String prefLoginStreak = 'login_streak';
const String prefUserXp = 'user_xp';
const String prefUsername = 'user_display_name';

/// Full-page dashboard: username, avatar, and stats table.
/// Replaces the profile popup; opened from the person icon on the home page.
class DashboardPage extends StatefulWidget {
  final VoidCallback onBack;

  const DashboardPage({
    super.key,
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
    if (!mounted) return;
    setState(() {
      _username = prefs.getString(prefUsername) ?? 'Guest';
      _adventureLevel = prefs.getInt(prefAdventureLevel) ?? 1;
      _classicBestScore = prefs.getInt(prefClassicBestStreak) ?? 0;
      _loginStreak = prefs.getInt(prefLoginStreak) ?? 0;
      _xp = prefs.getInt(prefUserXp) ?? 0;
      _loaded = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width <= 768;

    return Scaffold(
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
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: widget.onBack,
        ),
      ),
      body: Container(
        color: _dashboardPrimaryYellow,
        child: _loaded
            ? SingleChildScrollView(
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
                              _username.isNotEmpty
                                  ? _username.substring(0, 1).toUpperCase()
                                  : '👤',
                              style: TextStyle(
                                fontSize: _username.isNotEmpty ? 28 : 36,
                                fontWeight: FontWeight.bold,
                                color: _username.isNotEmpty
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
