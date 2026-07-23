import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show debugPrint, kDebugMode, kIsWeb;

/// AdMob publisher app IDs (`~` suffix). Configured in native projects:
/// - Android: `AndroidManifest.xml` → `~2172277891`
/// - iOS: `ios/Runner/Info.plist` → `GADApplicationIdentifier` → `~6189341696`
const String kAdMobAndroidAppId = 'ca-app-pub-6740638137327567~2172277891';
const String kAdMobIosAppId = 'ca-app-pub-6740638137327567~6189341696';

// --- Android (production) ----------------------------------------------------

const String _kAndroidBanner = 'ca-app-pub-6740638137327567/1435131168';
const String _kAndroidInterstitial = 'ca-app-pub-6740638137327567/9168616109';
const String _kAndroidRewarded = 'ca-app-pub-6740638137327567/2005976804';

// --- iOS (production) --------------------------------------------------------
// Ad units for bundle ID `com.beefive.app` in AdMob.
// Note: Google typically does not fill *live* ads for iOS until the app is
// listed on the App Store. Use debug (sample) units to verify integration;
// release builds keep these production IDs for store builds.

const String _kIosBanner = 'ca-app-pub-6740638137327567/8875256349';
const String _kIosInterstitial = 'ca-app-pub-6740638137327567/1841773275';
const String _kIosRewarded = 'ca-app-pub-6740638137327567/8356435492';

// Google sample units — debug only so local runs can verify the SDK wiring.
const String _kIosTestBanner = 'ca-app-pub-3940256099942544/2934735716';
const String _kIosTestInterstitial = 'ca-app-pub-3940256099942544/4411468910';
const String _kIosTestRewarded = 'ca-app-pub-3940256099942544/1712485313';

String _resolveAdUnitId({
  required String android,
  required String iosProduction,
  required String iosTest,
}) {
  if (kIsWeb) return android;
  if (!Platform.isIOS) return android;
  // Live iOS inventory often returns no-fill until the app is on the App Store.
  // Keep sample units in debug so you can still verify ads during development.
  if (kDebugMode) return iosTest;
  return iosProduction;
}

/// Logs which ad unit IDs are active (debug builds only).
void logActiveAdUnitIds() {
  if (!kDebugMode || kIsWeb || !Platform.isIOS) return;
  debugPrint(
    '[AdMob] iOS debug sample units: banner=$kBannerAdUnitId, '
    'interstitial=$kInterstitialAdUnitId, rewarded=$kRewardedAdUnitId',
  );
  debugPrint(
    '[AdMob] iOS release production units: banner=$_kIosBanner, '
    'interstitial=$_kIosInterstitial, rewarded=$_kIosRewarded',
  );
}

/// Banner shown on home, practice, adventure, lobby, and match screens.
String get kBannerAdUnitId => _resolveAdUnitId(
      android: _kAndroidBanner,
      iosProduction: _kIosBanner,
      iosTest: _kIosTestBanner,
    );

/// Full-screen interstitial after multiplayer / practice milestones.
String get kInterstitialAdUnitId => _resolveAdUnitId(
      android: _kAndroidInterstitial,
      iosProduction: _kIosInterstitial,
      iosTest: _kIosTestInterstitial,
    );

/// Rewarded ad (home page).
String get kRewardedAdUnitId => _resolveAdUnitId(
      android: _kAndroidRewarded,
      iosProduction: _kIosRewarded,
      iosTest: _kIosTestRewarded,
    );
