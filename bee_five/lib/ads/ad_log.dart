import 'package:flutter/foundation.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

/// Logs AdMob load failures in debug builds (stripped in release).
void logAdLoadFailure(String placement, LoadAdError error) {
  logAdFailure(placement, error);
}

/// Logs AdMob load/show failures in debug builds (stripped in release).
void logAdFailure(String placement, Object error) {
  if (!kDebugMode) return;
  if (error is LoadAdError) {
    debugPrint(
      '[AdMob] $placement failed: code=${error.code}, '
      'domain=${error.domain}, message=${error.message}',
    );
    return;
  }
  if (error is AdError) {
    debugPrint(
      '[AdMob] $placement failed: code=${error.code}, '
      'domain=${error.domain}, message=${error.message}',
    );
    return;
  }
  debugPrint('[AdMob] $placement failed: $error');
}
