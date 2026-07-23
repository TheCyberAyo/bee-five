import 'ad_unit_ids.dart';

/// AdMob units shared with [HomePage] practice / menu banners.
String get kMultiplayerBannerAdUnitId => kBannerAdUnitId;

/// Interstitial for finished school-lobby (online) matches.
/// Counter increments once per completed match when leaving [MatchScreen] normally.
/// Ad runs when count ≡ 0 (mod N): **first after match #4**, then #8, #12, …
String get kMultiplayerInterstitialAdUnitId => kInterstitialAdUnitId;

const int kMultiplayerInterstitialEveryNMatches = 4;

/// Interstitial during async (multi-day) matches after every N stones on the board.
const int kAsyncInterstitialEveryNMoves = 5;

const String kPrefsMultiplayerMatchesCompleted =
    'bee_five_multiplayer_matches_completed';
