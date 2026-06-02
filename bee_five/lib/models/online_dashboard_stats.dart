import '../utils/player_rank.dart';

/// Online gaming stats shown on the dashboard.
class OnlineDashboardStats {
  final String institution;
  final String rank;
  final String globalRanking;
  final String institutionalRanking;
  final int onlineWinStreak;

  const OnlineDashboardStats({
    required this.institution,
    required this.rank,
    required this.globalRanking,
    required this.institutionalRanking,
    required this.onlineWinStreak,
  });

  factory OnlineDashboardStats.guest() => const OnlineDashboardStats(
        institution: '—',
        rank: '—',
        globalRanking: '—',
        institutionalRanking: '—',
        onlineWinStreak: 0,
      );

  factory OnlineDashboardStats.unavailable() => const OnlineDashboardStats(
        institution: '—',
        rank: '—',
        globalRanking: '—',
        institutionalRanking: '—',
        onlineWinStreak: 0,
      );

  factory OnlineDashboardStats.fromProfile({
    required String? institutionName,
    required int elo,
    required int? globalRank,
    required int? institutionalRank,
    required int winStreak,
    required bool hasSchool,
  }) {
    if (!hasSchool) {
      return OnlineDashboardStats(
        institution: 'Not linked',
        rank: eloRankTitle(elo),
        globalRanking: '—',
        institutionalRanking: '—',
        onlineWinStreak: winStreak,
      );
    }

    return OnlineDashboardStats(
      institution: institutionName?.trim().isNotEmpty == true
          ? institutionName!.trim()
          : '—',
      rank: eloRankTitle(elo),
      globalRanking: globalRank != null ? '#$globalRank' : '—',
      institutionalRanking:
          institutionalRank != null ? '#$institutionalRank' : '—',
      onlineWinStreak: winStreak,
    );
  }
}
