import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:provider/provider.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

import 'firebase_bootstrap.dart';
import 'supabase_client.dart';
import 'contexts/auth_context.dart';
import 'auth/auth_gate.dart';
import 'ads/ad_consent.dart';
import 'ads/ad_unit_ids.dart';
import 'background_sound.dart';

/// Hides scrollbars app-wide (no vertical striped bar on scrollable content).
class _NoScrollbarScrollBehavior extends ScrollBehavior {
  @override
  Widget buildScrollbar(
      BuildContext context, Widget child, ScrollableDetails details) {
    return child;
  }
}

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await initFirebase();
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load .env (bundled as asset; app still runs if missing in CI/tests).
  try {
    await dotenv.load(fileName: '.env');
  } catch (_) {}

  // Initialize Supabase
  await initSupabase();

  await initFirebase(backgroundHandler: _firebaseMessagingBackgroundHandler);

  // Lock to portrait only
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);

  // AdMob init waits for UMP consent (needs a presented UI) in [MyApp].
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> with WidgetsBindingObserver {
  late final Future<void> _adsReady;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _adsReady = _bootstrapAds();
  }

  /// UMP consent (and iOS IDFA message when configured in AdMob), then Mobile Ads.
  Future<void> _bootstrapAds() async {
    try {
      final canRequestAds = await gatherAdsConsent();
      if (!canRequestAds) {
        if (kDebugMode) {
          debugPrint('[AdMob] skipping initialize — cannot request ads yet');
        }
        return;
      }
      final initStatus = await MobileAds.instance.initialize();
      if (kDebugMode) {
        debugPrint('[AdMob] initialized: ${initStatus.adapterStatuses}');
        logActiveAdUnitIds();
      }
    } catch (e, st) {
      if (kDebugMode) {
        debugPrint('[AdMob] bootstrap failed: $e\n$st');
      }
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.paused:
      case AppLifecycleState.inactive:
      case AppLifecycleState.hidden:
        BackgroundSound.instance.pause();
        break;
      case AppLifecycleState.resumed:
        BackgroundSound.instance.resumeIfEnabled();
        break;
      case AppLifecycleState.detached:
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthContext(),
      child: FutureBuilder<void>(
        future: _adsReady,
        builder: (context, snapshot) {
          // Short splash while consent / SDK init finishes so screens don't
          // load ads before MobileAds.initialize().
          if (snapshot.connectionState != ConnectionState.done) {
            return const MaterialApp(
              debugShowCheckedModeBanner: false,
              home: Scaffold(
                backgroundColor: Color(0xFFFFC30B),
                body: Center(
                  child: CircularProgressIndicator(color: Colors.black87),
                ),
              ),
            );
          }

          return MaterialApp(
            title: 'Bee Five',
            debugShowCheckedModeBanner: false,
            scrollBehavior: _NoScrollbarScrollBehavior(),
            theme: ThemeData(
              colorScheme:
                  ColorScheme.fromSeed(seedColor: const Color(0xFFFFC30B)),
              useMaterial3: true,
            ),
            home: Consumer<AuthContext>(
              builder: (context, auth, _) => AuthGate(auth: auth),
            ),
          );
        },
      ),
    );
  }
}
