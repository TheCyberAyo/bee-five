import '../supabase_client.dart';
import '../account_preferences.dart';
import '../xp_ledger.dart';

class VerifiedAdClaim {
  final String id;
  final String userId;
  const VerifiedAdClaim(this.id, this.userId);
}

Future<VerifiedAdClaim> beginVerifiedAd(String adUnit) async {
  final client = supabaseClient;
  final user = client?.auth.currentUser;
  if (client == null || user == null) throw StateError('Sign in to receive verified ad XP. Solo games still earn XP offline.');
  final id = await client.rpc('begin_xp_ad', params: {'p_ad_unit': adUnit});
  return VerifiedAdClaim(id as String, user.id);
}

/// The SDK callback only starts a refresh; it never grants XP itself. A delayed
/// SSV callback still credits the account after this screen/app has closed.
Future<bool> waitForVerifiedAd(VerifiedAdClaim claim) async {
  final client = supabaseClient;
  if (client == null) return false;
  for (var attempt = 0; attempt < 8; attempt++) {
    if (client.auth.currentUser?.id != claim.userId) return false;
    try {
      final row = await client.from('xp_ad_claims').select('verified_at').eq('id', claim.id).maybeSingle();
      if (row?['verified_at'] != null) {
        await syncXpLedger(await AccountPreferences.forUser(claim.userId));
        return true;
      }
    } catch (_) { /* The server can finish even while this device is offline. */ }
    await Future<void>.delayed(const Duration(seconds: 2));
  }
  return false;
}
