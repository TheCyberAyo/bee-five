import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

/// Whether [Firebase.initializeApp] completed successfully this run.
bool get isFirebaseReady => Firebase.apps.isNotEmpty;

/// Initializes Firebase when native config is present (google-services.json /
/// GoogleService-Info.plist). Returns false on missing iOS plist so the app
/// still runs without push.
Future<bool> initFirebase({
  Future<void> Function(RemoteMessage message)? backgroundHandler,
}) async {
  if (isFirebaseReady) return true;
  try {
    await Firebase.initializeApp();
    if (backgroundHandler != null) {
      FirebaseMessaging.onBackgroundMessage(backgroundHandler);
    }
    return true;
  } catch (_) {
    return false;
  }
}
