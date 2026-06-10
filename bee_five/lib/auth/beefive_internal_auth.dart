/// Synthetic Supabase Auth email domain for username-only signup/login.
const String kBeefiveInternalEmailDomain = 'beefive.app';

const int kMinUsernameLength = 3;
const int kMaxUsernameLength = 10;

final RegExp kUsernameRegex = RegExp(r'^[a-zA-Z0-9_-]+$');

String normalizeUsername(String raw) => raw.trim().toLowerCase();

String? validateUsername(String? raw) {
  if (raw == null || raw.trim().isEmpty) {
    return 'Please enter a username';
  }
  final value = raw.trim();
  if (value.length < kMinUsernameLength) {
    return 'Username must be at least $kMinUsernameLength characters';
  }
  if (value.length > kMaxUsernameLength) {
    return 'Username must be at most $kMaxUsernameLength characters';
  }
  if (!kUsernameRegex.hasMatch(value)) {
    return 'Username can only contain letters, numbers, underscores, and hyphens';
  }
  return null;
}

/// Maps public username to the internal email stored in [auth.users.email].
String internalEmailFromUsername(String username) =>
    '${normalizeUsername(username)}@$kBeefiveInternalEmailDomain';
