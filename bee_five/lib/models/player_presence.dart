// ============================================================
// FILE: lib/models/player_presence.dart
// PURPOSE: Data model for a player visible in the school lobby
// ============================================================

import '../utils/player_rank.dart';
import '../xp_service.dart' show defaultXp;

enum PlayerStatus { idle, searching, inMatch }

class PlayerPresence {
  final String userId;
  final String username;
  final int elo;
  /// School / institution name from lobby presence (empty if unknown).
  final String institution;
  /// ISO 3166-1 alpha-2 country code for flag emoji (empty if unknown).
  final String countryCode;
  /// Bee Five XP from presence (local game XP); defaults if absent (legacy clients).
  final int beeFiveXp;
  final PlayerStatus status;

  PlayerPresence({
    required this.userId,
    required this.username,
    required this.elo,
    this.institution = '',
    this.countryCode = '',
    required this.beeFiveXp,
    required this.status,
  });

  String get rankTitle => eloRankTitle(elo);

  bool get hasLobbyChallengeXp => beeFiveXp > 0;

  // Parse from Supabase Realtime presence payload
  factory PlayerPresence.fromMap(Map<String, dynamic> map) {
    return PlayerPresence(
      userId: map['user_id']?.toString() ?? '',
      username: () {
        final u = map['username']?.toString().trim();
        return (u != null && u.isNotEmpty) ? u : 'Player';
      }(),
      elo: _parseInt(map['elo']) ?? 1200,
      institution: () {
        final i = map['institution']?.toString().trim();
        return (i != null && i.isNotEmpty) ? i : '';
      }(),
      countryCode: () {
        final c = map['country_code']?.toString().trim();
        return (c != null && c.isNotEmpty) ? c.toUpperCase() : '';
      }(),
      beeFiveXp: _parseXp(map['xp']),
      status: _parseStatus(map['status']),
    );
  }

  static int? _parseInt(dynamic v) {
    if (v == null) return null;
    if (v is int) return v;
    if (v is num) return v.toInt();
    return int.tryParse(v.toString());
  }

  /// Reported lobby XP; missing field → [defaultXp] so legacy clients stay challengeable.
  static int _parseXp(dynamic v) {
    if (v == null) return defaultXp;
    if (v is int) return v;
    if (v is num) return v.toInt();
    return int.tryParse(v.toString()) ?? defaultXp;
  }

  Map<String, dynamic> toMap() => {
        'user_id': userId,
        'username': username,
        'elo': elo,
        'institution': institution,
        'country_code': countryCode,
        'xp': beeFiveXp,
        'status': _statusWireName(status),
      };

  /// Wire format matches [MultiplayerService] presence payloads (`in_match`, not enum `.name`).
  static String _statusWireName(PlayerStatus s) {
    switch (s) {
      case PlayerStatus.searching:
        return 'searching';
      case PlayerStatus.inMatch:
        return 'in_match';
      case PlayerStatus.idle:
        return 'idle';
    }
  }

  /// Prefer higher rank when merging duplicate presence rows for one user.
  static int statusRank(PlayerStatus s) {
    switch (s) {
      case PlayerStatus.idle:
        return 0;
      case PlayerStatus.searching:
        return 1;
      case PlayerStatus.inMatch:
        return 2;
    }
  }

  static PlayerStatus _parseStatus(dynamic raw) {
    if (raw == null) return PlayerStatus.idle;
    var s = raw.toString().trim().toLowerCase().replaceAll('-', '_');
    if (s == 'inmatch') s = 'in_match';
    switch (s) {
      case 'searching':
        return PlayerStatus.searching;
      case 'in_match':
        return PlayerStatus.inMatch;
      default:
        return PlayerStatus.idle;
    }
  }

}