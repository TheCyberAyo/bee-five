import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Supabase client singleton. Initialized in main() after dotenv.load().
/// Uses same env vars as BeefiveApp: SUPABASE_URL, SUPABASE_ANON_KEY.
bool _initialized = false;
bool _isConfigured = false;

Future<void> initSupabase() async {
  if (_initialized) return;
  _initialized = true;

  final url = dotenv.env['SUPABASE_URL']?.trim();
  final anonKey = dotenv.env['SUPABASE_ANON_KEY']?.trim();

  _isConfigured = url != null &&
      anonKey != null &&
      url.isNotEmpty &&
      anonKey.isNotEmpty &&
      url != 'YOUR_SUPABASE_URL' &&
      anonKey != 'YOUR_SUPABASE_ANON_KEY' &&
      url.startsWith('https://') &&
      anonKey.startsWith('eyJ');

  if (!_isConfigured) return;

  await Supabase.initialize(
    url: url!,
    anonKey: anonKey!,
    authOptions: const FlutterAuthClientOptions(
      authFlowType: AuthFlowType.pkce,
    ),
  );
}

bool get isSupabaseConfigured => _isConfigured;

SupabaseClient? get supabaseClient => _isConfigured ? Supabase.instance.client : null;
