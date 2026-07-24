import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

/// Gathers UMP consent (GDPR / privacy messaging and iOS IDFA when configured
/// in AdMob) before the Mobile Ads SDK is initialized.
///
/// Returns whether ads may be requested afterward. Forms need a presented UI,
/// so call this after [runApp] / first frame — not from bare [main].
Future<bool> gatherAdsConsent() async {
  final completer = Completer<void>();

  ConsentInformation.instance.requestConsentInfoUpdate(
    ConsentRequestParameters(),
    () async {
      await ConsentForm.loadAndShowConsentFormIfRequired((FormError? error) {
        if (error != null && kDebugMode) {
          debugPrint(
            '[AdMob] consent form error: code=${error.errorCode}, '
            'message=${error.message}',
          );
        }
      });
      if (!completer.isCompleted) completer.complete();
    },
    (FormError error) {
      if (kDebugMode) {
        debugPrint(
          '[AdMob] consent info update failed: code=${error.errorCode}, '
          'message=${error.message}',
        );
      }
      if (!completer.isCompleted) completer.complete();
    },
  );

  try {
    await completer.future.timeout(const Duration(seconds: 20));
  } on TimeoutException {
    if (kDebugMode) {
      debugPrint('[AdMob] consent gathering timed out');
    }
  }

  final canRequest = await ConsentInformation.instance.canRequestAds();
  if (kDebugMode) {
    debugPrint('[AdMob] canRequestAds=$canRequest');
  }
  return canRequest;
}

/// Whether Settings should show a privacy-options entry point.
Future<bool> isAdsPrivacyOptionsRequired() async {
  final status =
      await ConsentInformation.instance.getPrivacyOptionsRequirementStatus();
  return status == PrivacyOptionsRequirementStatus.required;
}

/// Presents the publisher privacy-options form (when required by the message).
Future<FormError?> showAdsPrivacyOptions() async {
  final completer = Completer<FormError?>();
  ConsentForm.showPrivacyOptionsForm((FormError? error) {
    if (!completer.isCompleted) completer.complete(error);
  });
  return completer.future;
}
