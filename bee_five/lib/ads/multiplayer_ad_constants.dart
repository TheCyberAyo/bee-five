/// AdMob units shared with [HomePage] practice / menu banners.
const String kMultiplayerBannerAdUnitId =
    'ca-app-pub-6740638137327567/1435131168';

/// Interstitial for finished school-lobby (online) matches.
/// Counter increments once per completed match when leaving [MatchScreen] normally.
/// Ad runs when count ≡ 0 (mod N): **first after match #4**, then #8, #12, …
const String kMultiplayerInterstitialAdUnitId =
    'ca-app-pub-6740638137327567/9168616109';

const int kMultiplayerInterstitialEveryNMatches = 4;

/// Interstitial during async (multi-day) matches after every N stones on the board.
const int kAsyncInterstitialEveryNMoves = 5;

const String kPrefsMultiplayerMatchesCompleted =
    'bee_five_multiplayer_matches_completed';
