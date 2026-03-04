import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'splash_screen.dart';

/// Hides scrollbars app-wide (no vertical striped bar on scrollable content).
class _NoScrollbarScrollBehavior extends ScrollBehavior {
  @override
  Widget buildScrollbar(BuildContext context, Widget child, ScrollableDetails details) {
    return child;
  }
}

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  // Lock to portrait only; ignore device rotation settings.
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Bee-Five',
      debugShowCheckedModeBanner: false,
      scrollBehavior: _NoScrollbarScrollBehavior(),
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFFFC30B)),
        useMaterial3: true,
      ),
      home: const SplashScreen(),
    );
  }
}
