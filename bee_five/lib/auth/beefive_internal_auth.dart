/// Synthetic Supabase Auth email domain for username-only signup/login.
const String kBeefiveInternalEmailDomain = 'beefive.app';

String normalizeUsername(String raw) => raw.trim().toLowerCase();

/// Maps public username to the internal email stored in [auth.users.email].
String internalEmailFromUsername(String username) =>
    '${normalizeUsername(username)}@$kBeefiveInternalEmailDomain';
