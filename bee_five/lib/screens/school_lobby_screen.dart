// ============================================================
// FILE: lib/screens/school_lobby_screen.dart
// PURPOSE: Universal online lobby — all institutions share one channel;
//          online players, global rankings, and institutional rankings.
// ============================================================

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import '../ads/multiplayer_ad_constants.dart';
import '../models/player_presence.dart';
import '../services/async_game_service.dart';
import '../services/multiplayer_service.dart';
import '../navigation/async_match_navigation.dart';
import '../utils/country_data.dart';
import '../utils/player_rank.dart';
import '../xp_service.dart';
import '../simple_game.dart' show primaryYellow;
import '../theme/bee_five_multiplayer_theme.dart';
class SchoolLobbyScreen extends StatefulWidget {
  final String schoolId;
  final String? schoolName;
  final String userId;
  final String username;
  final int elo;

  const SchoolLobbyScreen({
    super.key,
    required this.schoolId,
    this.schoolName,
    required this.userId,
    required this.username,
    required this.elo,
  });

  @override
  State<SchoolLobbyScreen> createState() => _SchoolLobbyScreenState();
}

class _SchoolLobbyScreenState extends State<SchoolLobbyScreen>
    with SingleTickerProviderStateMixin {
  static const double _kLeaderboardRowExtent = 36;
  static const double _kNameFontSize = 14;
  static const double _kCellFontSize = 12.5;
  static const int _kChallengeColumnFlex = 2;
  static const EdgeInsets _kLeaderboardListPadding =
      EdgeInsets.fromLTRB(4, 0, 4, 0);

  final _service = MultiplayerService();
  final _uuid = const Uuid();

  List<PlayerPresence> _onlinePlayers = [];
  List<Map<String, dynamic>> _globalLeaderboard = [];
  List<Map<String, dynamic>> _institutionalLeaderboard = [];
  bool _isLoading = true;
  int _selectedTab = 0;

  final TextEditingController _usernameSearchController = TextEditingController();
  final TextEditingController _globalSearchController = TextEditingController();
  final TextEditingController _institutionalSearchController =
      TextEditingController();
  final ScrollController _globalScrollController = ScrollController();
  final ScrollController _institutionalScrollController = ScrollController();
  bool _globalScrollToSelfPending = false;
  bool _institutionalScrollToSelfPending = false;

  List<Map<String, dynamic>> _globalSearchResults = [];
  List<Map<String, dynamic>> _institutionalSearchResults = [];
  List<AsyncMatchRow> _asyncMatches = [];
  bool _globalSearchLoading = false;
  bool _institutionalSearchLoading = false;
  Timer? _globalSearchDebounce;
  Timer? _institutionalSearchDebounce;
  int? _myGlobalRank;
  int? _myInstitutionalRank;

  late StreamSubscription _playersSub;
  StreamSubscription<List<Map<String, dynamic>>>? _globalLeaderboardSub;
  StreamSubscription<List<Map<String, dynamic>>>? _institutionalLeaderboardSub;

  BannerAd? _lobbyBannerAd;
  bool _isLobbyBannerLoaded = false;

  int _myLobbyXp = defaultXp;
  String _institutionName = '';
  String _myCountryCode = '';

  /// school_id → display name (for global rankings).
  Map<String, String> _schoolIdToName = {};

  void _selectLobbyTab(int index) {
    setState(() {
      _selectedTab = index;
      if (index == 1) _globalScrollToSelfPending = true;
      if (index == 2) _institutionalScrollToSelfPending = true;
    });
  }

  void _scheduleScrollToRank(ScrollController controller, int rank) {
    var attempts = 0;
    void attempt() {
      attempts++;
      if (!mounted || attempts > 48) return;
      if (!controller.hasClients) {
        WidgetsBinding.instance.addPostFrameCallback((_) => attempt());
        return;
      }
      final pos = controller.position;
      if (!pos.hasContentDimensions) {
        WidgetsBinding.instance.addPostFrameCallback((_) => attempt());
        return;
      }
      final rowTop = _kLeaderboardListPadding.top + rank * _kLeaderboardRowExtent;
      final centered = rowTop - (pos.viewportDimension - _kLeaderboardRowExtent) / 2;
      final target = centered.clamp(0.0, pos.maxScrollExtent);
      controller.jumpTo(target);
    }

    WidgetsBinding.instance.addPostFrameCallback((_) => attempt());
  }

  bool _rowIsMe(Map<String, dynamic> p) => p['id']?.toString() == widget.userId;

  String _institutionLabelForProfile(Map<String, dynamic> row) {
    final fromJoin = MultiplayerService.institutionNameFromProfileRow(row);
    if (fromJoin != null) return fromJoin;
    final sid = row['school_id']?.toString();
    if (sid != null && _schoolIdToName.containsKey(sid)) {
      return _schoolIdToName[sid]!;
    }
    return '—';
  }

  @override
  void initState() {
    super.initState();
    final passed = widget.schoolName?.trim();
    if (passed != null && passed.isNotEmpty) {
      _institutionName = passed;
    }
    _loadLobbyBannerAd();
    unawaited(_resolveInstitutionAndSchools());
    unawaited(_loadMyRankingStats());
    unawaited(_loadAsyncMatches());
    _initLobby();
  }

  Future<void> _loadAsyncMatches() async {
    final rows = await AsyncGameService.instance.fetchActiveMatchesForMe();
    if (!mounted) return;
    setState(() => _asyncMatches = rows);
  }

  Future<void> _openAsyncMatch(AsyncMatchRow match) async {
    final oppId = match.opponentIdFor(widget.userId);
    String oppName = 'Player';
    try {
      final row = await Supabase.instance.client
          .from('mg_profiles')
          .select('username')
          .eq('id', oppId)
          .maybeSingle();
      final n = row?['username']?.toString().trim();
      if (n != null && n.isNotEmpty) oppName = n;
    } catch (_) {}

    if (!mounted) return;
    await openAsyncMatch(
      context,
      matchId: match.id,
      myId: widget.userId,
      myUsername: widget.username,
      opponentId: oppId,
      opponentUsername: oppName,
      match: match,
    );
    await _loadAsyncMatches();
  }

  Future<void> _sendAsyncChallenge(String opponentId, String opponentName) async {
    // Async challenges only from Global Rankings or Institutional Ranking lists.
    if (_selectedTab != 1 && _selectedTab != 2) return;

    try {
      await AsyncGameService.instance.sendAsyncChallenge(opponentId);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Multi-day challenge sent to $opponentName. '
            'They can respond when ready — each player has 24 hours per turn.',
          ),
        ),
      );
    } on AsyncGameException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message)),
      );
    }
  }

  Widget _buildAsyncMatchesBanner() {
    if (_asyncMatches.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Multi-day matches',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
          ),
          const SizedBox(height: 6),
          ..._asyncMatches.map((m) {
            final myTurn = m.seatFor(widget.userId) == m.currentSeat;
            return Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: OutlinedButton(
                onPressed: () => _openAsyncMatch(m),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.black,
                  side: const BorderSide(color: Colors.black, width: 2),
                ),
                child: Text(
                  myTurn ? 'Your turn — resume async match' : 'Waiting — async match',
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  Future<void> _loadMyRankingStats() async {
    try {
      final globalRank =
          await _service.getLeaderboardRank(elo: widget.elo);
      final institutionalRank = await _service.getLeaderboardRank(
        elo: widget.elo,
        schoolId: widget.schoolId,
      );
      if (!mounted) return;
      setState(() {
        _myGlobalRank = globalRank;
        _myInstitutionalRank = institutionalRank;
      });
    } catch (_) {}
  }

  void _onGlobalSearchChanged(String value) {
    setState(() {});
    _globalSearchDebounce?.cancel();
    final q = value.trim();
    if (q.isEmpty) {
      setState(() {
        _globalSearchResults = [];
        _globalSearchLoading = false;
      });
      return;
    }
    _globalSearchDebounce = Timer(const Duration(milliseconds: 350), () async {
      if (!mounted) return;
      setState(() => _globalSearchLoading = true);
      try {
        final rows = await _service.searchGlobalLeaderboard(q);
        if (!mounted || _globalSearchController.text.trim() != q) return;
        setState(() {
          _globalSearchResults = rows;
          _globalSearchLoading = false;
        });
      } catch (_) {
        if (!mounted || _globalSearchController.text.trim() != q) return;
        setState(() {
          _globalSearchResults = [];
          _globalSearchLoading = false;
        });
      }
    });
  }

  void _onInstitutionalSearchChanged(String value) {
    setState(() {});
    _institutionalSearchDebounce?.cancel();
    final q = value.trim();
    if (q.isEmpty) {
      setState(() {
        _institutionalSearchResults = [];
        _institutionalSearchLoading = false;
      });
      return;
    }
    _institutionalSearchDebounce =
        Timer(const Duration(milliseconds: 350), () async {
      if (!mounted) return;
      setState(() => _institutionalSearchLoading = true);
      try {
        final rows = await _service.searchInstitutionalLeaderboard(
          widget.schoolId,
          q,
        );
        if (!mounted || _institutionalSearchController.text.trim() != q) {
          return;
        }
        setState(() {
          _institutionalSearchResults = rows;
          _institutionalSearchLoading = false;
        });
      } catch (_) {
        if (!mounted || _institutionalSearchController.text.trim() != q) {
          return;
        }
        setState(() {
          _institutionalSearchResults = [];
          _institutionalSearchLoading = false;
        });
      }
    });
  }

  Future<void> _resolveInstitutionAndSchools() async {
    if (_institutionName.isEmpty) {
      try {
        final rows = await Supabase.instance.client
            .from('mg_schools')
            .select('name')
            .eq('id', widget.schoolId)
            .limit(1);
        if (mounted && rows.isNotEmpty) {
          final raw = (rows.first as Map)['name']?.toString();
          if (raw != null && raw.trim().isNotEmpty) {
            setState(() => _institutionName = raw.trim());
          }
        }
      } catch (_) {}
    }

    try {
      final profileRows = await Supabase.instance.client
          .from('mg_profiles')
          .select('country_code')
          .eq('id', widget.userId)
          .limit(1);
      if (mounted && profileRows.isNotEmpty) {
        final cc = (profileRows.first as Map)['country_code']?.toString().trim();
        if (cc != null && cc.isNotEmpty) {
          setState(() => _myCountryCode = cc.toUpperCase());
        }
      }
    } catch (_) {}

    try {
      final schools = await Supabase.instance.client
          .from('mg_schools')
          .select('id, name');
      if (!mounted) return;
      final map = <String, String>{};
      for (final row in schools) {
        final m = Map<String, dynamic>.from(row as Map);
        final id = m['id']?.toString();
        final name = m['name']?.toString().trim();
        if (id != null && name != null && name.isNotEmpty) {
          map[id] = name;
        }
      }
      setState(() => _schoolIdToName = map);
    } catch (_) {}
  }

  void _loadLobbyBannerAd() {
    _lobbyBannerAd = BannerAd(
      adUnitId: kMultiplayerBannerAdUnitId,
      size: AdSize.banner,
      request: const AdRequest(),
      listener: BannerAdListener(
        onAdLoaded: (ad) {
          if (mounted) setState(() => _isLobbyBannerLoaded = true);
        },
        onAdFailedToLoad: (ad, error) {
          ad.dispose();
          if (mounted) setState(() => _isLobbyBannerLoaded = false);
        },
      ),
    )..load();
  }

  Widget _buildLobbyBannerAd() {
    if (!_isLobbyBannerLoaded || _lobbyBannerAd == null) {
      return const SizedBox.shrink();
    }
    return SizedBox(
      width: _lobbyBannerAd!.size.width.toDouble(),
      height: _lobbyBannerAd!.size.height.toDouble(),
      child: AdWidget(ad: _lobbyBannerAd!),
    );
  }

  List<PlayerPresence> get _filteredOnlinePlayers {
    final q = _usernameSearchController.text.trim().toLowerCase();
    if (q.isEmpty) return _onlinePlayers;
    return _onlinePlayers
        .where((p) => p.username.toLowerCase().contains(q))
        .toList();
  }

  Future<void> _initLobby() async {
    _playersSub = _service.onlinePlayers.listen((players) {
      if (mounted) {
        setState(() {
          _onlinePlayers = players;
          _isLoading = false;
        });
      }
    });

    _globalLeaderboardSub = _service.globalLeaderboardStream().listen((rows) {
      if (!mounted) return;
      setState(() => _globalLeaderboard = rows);
    });

    _institutionalLeaderboardSub =
        _service.leaderboardStream(widget.schoolId).listen((rows) {
      if (!mounted) return;
      setState(() => _institutionalLeaderboard = rows);
    });

    await ensureXpInitialized();
    _myLobbyXp = await getXp();

    await _resolveInstitutionAndSchools();

    await _service.joinLobby(
      schoolId: widget.schoolId,
      userId: widget.userId,
      username: widget.username,
      elo: widget.elo,
      beeFiveXp: _myLobbyXp,
      institutionName: _institutionName.isNotEmpty ? _institutionName : null,
      countryCode: _myCountryCode.isNotEmpty ? _myCountryCode : null,
    );

    if (mounted) setState(() => _isLoading = false);
  }

  bool _canChallengePlayer(PlayerPresence player) =>
      player.status != PlayerStatus.inMatch;

  Future<void> _sendChallenge(PlayerPresence player) async {
    if (player.status == PlayerStatus.inMatch) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'That player is in a match and can’t be challenged right now.',
            ),
          ),
        );
      }
      return;
    }

    final matchId = _service.matchIdForOutgoingChallenge(
      player.userId,
      _uuid.v4(),
    );
    await _service.sendChallenge(
      fromId: widget.userId,
      fromUsername: widget.username,
      fromElo: widget.elo,
      fromBeeFiveXp: _myLobbyXp,
      toId: player.userId,
      matchId: matchId,
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Challenge sent to ${player.username}...')),
      );
    }
  }

  @override
  void dispose() {
    _usernameSearchController.dispose();
    _globalSearchController.dispose();
    _institutionalSearchController.dispose();
    _globalSearchDebounce?.cancel();
    _institutionalSearchDebounce?.cancel();
    _globalScrollController.dispose();
    _institutionalScrollController.dispose();
    _playersSub.cancel();
    _globalLeaderboardSub?.cancel();
    _institutionalLeaderboardSub?.cancel();
    _lobbyBannerAd?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BeeFiveMultiplayerTheme.scaffoldBackground,
      appBar: AppBar(
        backgroundColor: BeeFiveMultiplayerTheme.lobbyHeaderBackground,
        foregroundColor: Colors.black,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              usernameWithFlag(
                formatPlayerRankTitle(widget.username, widget.elo),
                _myCountryCode,
              ),
              style: const TextStyle(
                color: Colors.black,
                fontWeight: FontWeight.w800,
                fontSize: 17,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            if (_institutionName.isNotEmpty)
              Text(
                _institutionName,
                style: TextStyle(
                  color: Colors.black.withValues(alpha: 0.72),
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
          ],
        ),
        shape: const Border(
          bottom: BorderSide(color: Colors.black, width: 2),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            color: Colors.black,
            child: Row(
              children: [
                _TabButton(
                  label: 'Online Players',
                  index: 0,
                  selected: _selectedTab,
                  onTap: _selectLobbyTab,
                ),
                _TabButton(
                  label: 'Global Rankings',
                  index: 1,
                  selected: _selectedTab,
                  onTap: _selectLobbyTab,
                ),
                _TabButton(
                  label: 'Institutional Ranking',
                  index: 2,
                  selected: _selectedTab,
                  onTap: _selectLobbyTab,
                ),
              ],
            ),
          ),
        ),
      ),
      body: Column(
        children: [
          if (!_isLoading) _buildAsyncMatchesBanner(),
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: Colors.black),
                  )
                : switch (_selectedTab) {
                    0 => _buildOnlineTab(),
                    1 => _buildGlobalRankingsTab(),
                    _ => _buildInstitutionalTab(),
                  },
          ),
          _buildLobbyBannerAd(),
        ],
      ),
    );
  }

  Widget _buildLobbySearchField({
    required TextEditingController controller,
    required String hintText,
    required ValueChanged<String> onChanged,
    bool loading = false,
  }) {
    Widget? suffix;
    if (loading) {
      suffix = const Padding(
        padding: EdgeInsets.all(12),
        child: SizedBox(
          width: 18,
          height: 18,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            color: Colors.black54,
          ),
        ),
      );
    } else if (controller.text.isNotEmpty) {
      suffix = IconButton(
        tooltip: 'Clear',
        icon: const Icon(Icons.clear, color: Colors.black54, size: 20),
        onPressed: () {
          controller.clear();
          onChanged('');
        },
      );
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        textInputAction: TextInputAction.search,
        style: const TextStyle(
          color: Colors.black,
          fontWeight: FontWeight.w600,
          fontSize: 14,
        ),
        decoration: InputDecoration(
          isDense: true,
          hintText: hintText,
          hintStyle: TextStyle(
            color: Colors.black.withValues(alpha: 0.45),
            fontWeight: FontWeight.w500,
            fontSize: 14,
          ),
          prefixIcon: const Icon(
            Icons.search,
            color: Colors.black87,
            size: 20,
          ),
          prefixIconConstraints: const BoxConstraints(minWidth: 40),
          suffixIcon: suffix,
          filled: true,
          fillColor: Colors.white,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: Colors.black, width: 2),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: Colors.black, width: 2),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: Colors.black, width: 2),
          ),
        ),
      ),
    );
  }

  Widget _buildSearchStatusStrip({
    required String query,
    bool loading = false,
    int? resultCount,
  }) {
    final q = query.trim();
    if (q.isEmpty) return const SizedBox.shrink();

    final String message;
    if (loading) {
      message = 'Searching…';
    } else if (resultCount == null) {
      message = 'Search: "$q"';
    } else if (resultCount == 1) {
      message = '1 result for "$q"';
    } else {
      message = '$resultCount results for "$q"';
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 4, 12, 4),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          message,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: Colors.black.withValues(alpha: 0.55),
          ),
        ),
      ),
    );
  }

  Widget _buildLobbySearchSection({
    required TextEditingController controller,
    required String hintText,
    required ValueChanged<String> onChanged,
    bool loading = false,
    bool showStatus = false,
    int? resultCount,
  }) {
    final query = controller.text;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildLobbySearchField(
          controller: controller,
          hintText: hintText,
          onChanged: onChanged,
          loading: loading,
        ),
        if (showStatus && query.trim().isNotEmpty)
          _buildSearchStatusStrip(
            query: query,
            loading: loading,
            resultCount: loading ? null : resultCount,
          ),
      ],
    );
  }

  int _profileElo(Map<String, dynamic> p) =>
      p['elo'] is int
          ? p['elo'] as int
          : (p['elo'] is num ? (p['elo'] as num).toInt() : 1200);

  Widget _buildRankBanner({
    required String labelPrefix,
    required int? myRank,
    required int elo,
  }) {
    if (myRank == null) return const SizedBox.shrink();
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: Colors.black, width: 2),
      ),
      child: Text(
        'Your $labelPrefix rank · #$myRank · $elo ELO',
        style: const TextStyle(
          fontWeight: FontWeight.bold,
          fontSize: 12,
          color: Colors.black,
        ),
      ),
    );
  }

  Widget _buildLeaderboardList({
    required ScrollController controller,
    required List<Map<String, dynamic>> players,
    required List<int> flex,
    required List<Widget> Function(
      Map<String, dynamic> profile,
      int listIndex,
    ) buildCells,
    required String emptyMessage,
    Widget? Function(Map<String, dynamic> profile)? trailingForRow,
  }) {
    if (players.isEmpty) {
      return Center(
        child: Text(
          emptyMessage,
          style: TextStyle(
            color: Colors.black.withValues(alpha: 0.6),
            fontWeight: FontWeight.w600,
          ),
        ),
      );
    }
    return ListView.builder(
      controller: controller,
      padding: _kLeaderboardListPadding,
      itemExtent: _kLeaderboardRowExtent,
      itemCount: players.length,
      itemBuilder: (context, index) {
        final p = Map<String, dynamic>.from(players[index] as Map);
        return _leaderboardListRow(
          rankIndex: index,
          row: p,
          flex: flex,
          cells: buildCells(p, index),
          trailing: trailingForRow?.call(p),
          showChallengeColumn: trailingForRow != null,
        );
      },
    );
  }

  Widget _buildTableHeader(List<String> labels, {List<int>? flex}) {
    final f = flex ?? List.filled(labels.length, 1);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: Colors.black, width: 2),
      ),
      child: Row(
        children: [
          for (var i = 0; i < labels.length; i++)
            Expanded(
              flex: f[i],
              child: Text(
                labels[i],
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 11,
                  color: Colors.black87,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildOnlineTab() {
    final query = _usernameSearchController.text.trim();
    final searching = query.isNotEmpty;
    final filtered = searching ? _filteredOnlinePlayers : _onlinePlayers;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildLobbySearchSection(
          controller: _usernameSearchController,
          hintText: 'Search player…',
          onChanged: (_) => setState(() {}),
          showStatus: searching,
          resultCount: searching ? filtered.length : null,
        ),
        _buildTableHeader(
          const ['Username', 'Institution', 'Rank', 'ELO', ''],
          flex: const [3, 2, 2, 1, 2],
        ),
        Expanded(child: _buildOnlinePlayerListBody()),
      ],
    );
  }

  Widget _buildOnlinePlayerListBody() {
    if (_onlinePlayers.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.people_outline,
                  size: 64, color: Colors.black.withValues(alpha: 0.45)),
              const SizedBox(height: 16),
              Text(
                'No other players are online right now',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.black.withValues(alpha: 0.65),
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      );
    }

    final filtered = _filteredOnlinePlayers;
    final searching = _usernameSearchController.text.trim().isNotEmpty;
    if (filtered.isEmpty) {
      return Center(
        child: Text(
          searching ? 'No players found' : 'No match',
          style: TextStyle(
            color: Colors.black.withValues(alpha: 0.65),
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(4, 0, 4, 12),
      itemCount: filtered.length,
      itemBuilder: (context, index) {
        final player = filtered[index];
        final institution = player.institution.isNotEmpty
            ? player.institution
            : (_institutionName.isNotEmpty ? '—' : '—');
        final canChallenge = _canChallengePlayer(player);

        return SizedBox(
          height: _kLeaderboardRowExtent + 4,
          child: Container(
            margin: const EdgeInsets.only(top: 2),
            padding: const EdgeInsets.symmetric(horizontal: 6),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(
                bottom: BorderSide(color: Colors.black.withValues(alpha: 0.08)),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: Text(
                    usernameWithFlag(player.username, player.countryCode),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: _kNameFontSize,
                      color: Colors.black,
                    ),
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Text(
                    institution,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: _kCellFontSize,
                      color: Colors.black87,
                    ),
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Text(
                    player.rankTitle,
                    style: const TextStyle(
                      fontSize: _kCellFontSize,
                      fontWeight: FontWeight.w600,
                      color: Colors.black87,
                    ),
                  ),
                ),
                Expanded(
                  flex: 1,
                  child: Text(
                    '${player.elo}',
                    style: const TextStyle(
                      fontSize: _kCellFontSize,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Align(
                    alignment: Alignment.centerRight,
                    child: canChallenge
                        ? TextButton(
                            onPressed: () => _sendChallenge(player),
                            style: TextButton.styleFrom(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 2),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            child: const Text(
                              'Live',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 11,
                              ),
                            ),
                          )
                        : Text(
                            player.status == PlayerStatus.inMatch
                                ? 'Busy'
                                : '',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: Colors.black54,
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _leaderboardListRow({
    required int rankIndex,
    required Map<String, dynamic> row,
    required List<Widget> cells,
    required List<int> flex,
    Widget? trailing,
    bool showChallengeColumn = false,
  }) {
    final isMe = _rowIsMe(row);
    return SizedBox(
      height: _kLeaderboardRowExtent,
      child: Container(
        alignment: Alignment.centerLeft,
        padding: const EdgeInsets.symmetric(horizontal: 6),
        decoration: BoxDecoration(
          color: isMe ? BeeFiveMultiplayerTheme.lobbySelfRowBackground : null,
          border: isMe
              ? Border.all(color: Colors.black, width: 2)
              : Border(
                  bottom: BorderSide(
                    color: Colors.black.withValues(alpha: 0.06),
                  ),
                ),
          borderRadius: isMe ? BorderRadius.circular(2) : null,
        ),
        child: Row(
          children: [
            SizedBox(
              width: 28,
              child: CircleAvatar(
                radius: 11,
                backgroundColor: Colors.black,
                foregroundColor: primaryYellow,
                child: Text(
                  '${rankIndex + 1}',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 10,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 4),
            for (var i = 0; i < cells.length; i++)
              Expanded(flex: flex[i], child: cells[i]),
            if (showChallengeColumn)
              Expanded(
                flex: _kChallengeColumnFlex,
                child: Align(
                  alignment: Alignment.centerRight,
                  child: trailing ?? const SizedBox.shrink(),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _nameCell(
    String username, {
    bool isMe = false,
    String? countryCode,
  }) {
    return Text(
      usernameWithFlag(username, countryCode),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: TextStyle(
        fontWeight: isMe ? FontWeight.bold : FontWeight.w700,
        fontSize: _kNameFontSize,
        height: 1.1,
        color: Colors.black,
      ),
    );
  }

  Widget _textCell(String text, {bool bold = false}) {
    return Text(
      text,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: TextStyle(
        fontWeight: bold ? FontWeight.bold : FontWeight.w600,
        fontSize: _kCellFontSize,
        color: Colors.black87,
      ),
    );
  }

  Widget? _asyncChallengeTrailing(Map<String, dynamic> profile) {
    if (_rowIsMe(profile)) return null;
    final opponentId = profile['id']?.toString();
    if (opponentId == null || opponentId.isEmpty) return null;
    final name = profile['username']?.toString() ?? 'Player';
    return TextButton(
      onPressed: () => _sendAsyncChallenge(opponentId, name),
      style: TextButton.styleFrom(
        foregroundColor: Colors.green,
        padding: const EdgeInsets.symmetric(horizontal: 4),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      child: const Text(
        'Long-game',
        style: TextStyle(
          fontWeight: FontWeight.bold,
          fontSize: 11,
          color: Colors.green,
        ),
      ),
    );
  }

  Widget _buildGlobalRankingsTab() {
    final searching = _globalSearchController.text.trim().isNotEmpty;
    final players =
        searching ? _globalSearchResults : _globalLeaderboard;

    if (!searching && _globalScrollToSelfPending) {
      final myRank = players.indexWhere(_rowIsMe);
      _globalScrollToSelfPending = false;
      if (myRank >= 0) {
        _scheduleScrollToRank(_globalScrollController, myRank);
      }
    }

    return Column(
      children: [
        _buildLobbySearchSection(
          controller: _globalSearchController,
          hintText: 'Search player…',
          onChanged: _onGlobalSearchChanged,
          loading: searching && _globalSearchLoading,
          showStatus: searching,
          resultCount:
              searching && !_globalSearchLoading ? players.length : null,
        ),
        if (!searching)
          _buildRankBanner(
            labelPrefix: 'global',
            myRank: _myGlobalRank,
            elo: widget.elo,
          ),
        _buildTableHeader(
          const [
            'Global Rank',
            'Username',
            'Institution',
            'Rank',
            'ELO',
            'Challenge',
          ],
          flex: const [1, 3, 2, 2, 1, _kChallengeColumnFlex],
        ),
        Expanded(
          child: _buildLeaderboardList(
            controller: _globalScrollController,
            players: players,
            flex: const [3, 2, 2, 1],
            emptyMessage: searching ? 'No players found' : 'No ranked players yet',
            trailingForRow: _asyncChallengeTrailing,
            buildCells: (p, _) {
              final username = p['username']?.toString() ?? 'Player';
              final elo = _profileElo(p);
              final isMe = _rowIsMe(p);
              return [
                _nameCell(
                  username,
                  isMe: isMe,
                  countryCode: p['country_code']?.toString(),
                ),
                _textCell(_institutionLabelForProfile(p)),
                _textCell(eloRankTitle(elo)),
                _textCell('$elo', bold: true),
              ];
            },
          ),
        ),
      ],
    );
  }

  Widget _buildInstitutionalTab() {
    final searching = _institutionalSearchController.text.trim().isNotEmpty;
    final players =
        searching ? _institutionalSearchResults : _institutionalLeaderboard;

    if (!searching && _institutionalScrollToSelfPending) {
      final myRank = players.indexWhere(_rowIsMe);
      _institutionalScrollToSelfPending = false;
      if (myRank >= 0) {
        _scheduleScrollToRank(_institutionalScrollController, myRank);
      }
    }

    return Column(
      children: [
        _buildLobbySearchSection(
          controller: _institutionalSearchController,
          hintText: 'Search player…',
          onChanged: _onInstitutionalSearchChanged,
          loading: searching && _institutionalSearchLoading,
          showStatus: searching,
          resultCount: searching && !_institutionalSearchLoading
              ? players.length
              : null,
        ),
        if (!searching)
          _buildRankBanner(
            labelPrefix: 'institutional',
            myRank: _myInstitutionalRank,
            elo: widget.elo,
          ),
        _buildTableHeader(
          const [
            'Local Rank',
            'Username',
            'Rank',
            'ELO',
            'XPs',
            'Challenge',
          ],
          flex: const [1, 3, 2, 1, 1, _kChallengeColumnFlex],
        ),
        Expanded(
          child: _buildLeaderboardList(
            controller: _institutionalScrollController,
            players: players,
            flex: const [3, 2, 1, 1],
            emptyMessage: searching
                ? 'No players found'
                : 'No ranked players at your institution yet',
            trailingForRow: _asyncChallengeTrailing,
            buildCells: (p, _) {
              final username = p['username']?.toString() ?? 'Player';
              final elo = _profileElo(p);
              final isMe = _rowIsMe(p);
              final xpLabel = isMe ? '$_myLobbyXp' : '—';
              return [
                _nameCell(
                  username,
                  isMe: isMe,
                  countryCode: p['country_code']?.toString(),
                ),
                _textCell(eloRankTitle(elo)),
                _textCell('$elo', bold: true),
                _textCell(xpLabel),
              ];
            },
          ),
        ),
      ],
    );
  }
}

class _TabButton extends StatelessWidget {
  final String label;
  final int index;
  final int selected;
  final void Function(int) onTap;

  const _TabButton({
    required this.label,
    required this.index,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isSelected = index == selected;
    return Expanded(
      child: GestureDetector(
        onTap: () => onTap(index),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 2),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: isSelected
                    ? BeeFiveMultiplayerTheme.lobbyTabSelected
                    : Colors.transparent,
                width: 3,
              ),
            ),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            maxLines: 2,
            style: TextStyle(
              fontSize: 11,
              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
              color: isSelected
                  ? BeeFiveMultiplayerTheme.lobbyTabSelected
                  : Colors.white70,
              height: 1.1,
            ),
          ),
        ),
      ),
    );
  }
}
