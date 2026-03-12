import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:provider/provider.dart';

import 'supabase_client.dart';
import 'contexts/auth_context.dart';
import 'auth/auth_gate.dart';
import 'auth/deep_link_handler.dart';
import 'background_sound.dart';

/// Hides scrollbars app-wide (no vertical striped bar on scrollable content).
class _NoScrollbarScrollBehavior extends ScrollBehavior {
  @override
  Widget buildScrollbar(
      BuildContext context, Widget child, ScrollableDetails details) {
    return child;
  }
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load .env (same format as BeefiveApp: SUPABASE_URL, SUPABASE_ANON_KEY)
  await dotenv.load(fileName: '.env');

  // Initialize Supabase
  await initSupabase();

  // Lock to portrait only
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);

  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
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
      child: MaterialApp(
        title: 'Bee-Five',
        debugShowCheckedModeBanner: false,
        scrollBehavior: _NoScrollbarScrollBehavior(),
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFFFC30B)),
          useMaterial3: true,
        ),
        home: Consumer<AuthContext>(
          builder: (context, auth, _) => DeepLinkHandler(
            auth: auth,
            child: AuthGate(auth: auth),
          ),
        ),
      ),
    );
  }
}
