# XP accounting and rollout

The web and Flutter clients now queue individual XP events. Supabase assigns fixed
amounts and applies each event ID once under a player-row lock. An interrupted
request retains its event IDs, so retrying a committed request cannot award twice.
The displayed balance is the last acknowledged server balance plus pending events,
with each deduction clamped at zero in order. Events earned during a request are
preserved. The Adventure failure counter uses failure/reset events too, rather
than merging counters with `max`.

Mobile preferences are scoped by authenticated user ID. The owner is captured
before asynchronous work. Unscoped legacy preferences remain guest-only; existing
accounts restore their cloud balance. Guest XP stays with the guest and is not
copied into signed-in accounts. The web's non-XP guest progress import is limited
to one account per browser. Classic keeps its weighted score, but awards +2 XP at
each third actual consecutive win.

## Rollout status

### Production cutover — October 2, 2026

- The owner explicitly approved proceeding with the web/backend release and
  retiring support for older clients before a compatible iOS release is available.
- Both September 30 migrations are applied to production project
  `nbyirvmueubdlsbtnrwh`. The 30 existing progress rows and aggregate 809 XP were
  unchanged across the cutover. Direct authenticated writes to XP are denied.
- `submit-match`, `async-game`, and `admob-reward` are deployed. The reward endpoint
  verifies Google's signatures instead of requiring a Supabase JWT.
- Vercel deployment `dpl_92P8KJ2DSxaWzUfxzdXnRMiUujhh` was built successfully and
  released to `beefiveweb.com`. It includes the onboarding, analytics, and XP work
  from `4c02338`, plus Next.js / eslint-config-next 15.5.27 security patches.
- The root `.vercelignore` excludes mobile bundles and local credentials from CLI
  uploads; Vercel's project root remains `bee-five-web`.
- Live browser checks confirmed the win objective, three visual examples,
  first-move prompt, AI response, Skip, home screen, and sign-in form.
- Isolated XP and competitive-reward SQL tests, client XP/onboarding/analytics
  tests, signature tests, and the hosted production build passed. Existing lint
  warnings remain. `supabase/tests/production_xp_smoke.sql` also passed against
  production using authenticated permissions and rolled back all test writes.
- Unsigned reward callbacks return HTTP 400; unauthenticated match requests return
  HTTP 401. A special signed AdMob console probe returns success without awarding
  XP. Use test user ID `beefive-ssv-verification` and custom data
  `configuration-check` when verifying the callback URL in AdMob.
- Both Android (`2005976804`) and iOS (`8356435492`) rewarded units now have the
  production `admob-reward` URL saved. Google's console verified a signed callback
  for each unit; real device ad earning still needs an end-to-end check.
- The signed-in release check exposed a web progress upsert targeting the row
  primary key instead of unique `user_id`. Existing accounts received HTTP 409
  (`23505`) and their dashboard could remain empty. The web now specifies
  `onConflict: 'user_id'`, matching Flutter; the client regression test simulates
  the database constraint and checks that the existing level and XP survive.
- After redeployment, the supplied account signed in successfully, restored
  Level 25 after reload, and displayed 193 XP in the live dashboard, matching its
  authenticated API result. No password or session was saved in the repository.
- The signed-in Live Matches lobby loaded the account and rankings successfully.
  It reported no other online players, so no real two-player match was started.
- A complete two-player match, cross-device syncing, and receipt of production
  analytics in the dashboards still require verification.
  No mobile store release was submitted as part of this web/backend cutover.
- Older clients that directly write XP or submit unverified live results are no
  longer supported. There is no pre-existing universal forced-update screen in
  those installed clients; this cutover rejects their incompatible operations.

### Historical preflight — September 30, 2026

The following records describe the earlier blocked release, not current status.


- Supabase access to Bee Five (`nbyirvmueubdlsbtnrwh`) is working. The migration
  dry run lists exactly the two XP migrations below; neither was applied.
- The web production build passes. The existing host is Vercel project
  `bee-five-fjhy` in `ayongezwas-projects`, serving `beefiveweb.com`.
  The public site returns HTTP 402 `DEPLOYMENT_DISABLED`, and the dashboard says
  the account is suspended. Restore the subscription in
  [Vercel Billing](https://vercel.com/ayongezwas-projects/~/settings/billing)
  before attempting the coordinated cutover. No billing changes were made.
- Google Play access is available. Its latest uploaded and production bundle is
  now `32 (2.1.2)` for upload, while production remains `31 (2.1.1)`.
  The update's release build passes
  with target SDK 36. The bundle is at
  `build/app/outputs/bundle/release/app-release.aab`; it has been uploaded and
  submitted for review, but not published. Build using the installed Java runtime if the default Java launcher
  is unavailable:
  `JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home flutter build appbundle --release`.
  `jarsigner -verify` reports `jar verified`; Play accepted the upload and reported
  the release ready, with no reduction in supported devices.
  Bundle SHA-256: `27deb7943f02c09b0b0344bff9ba8a2127a5a2e029b0396eb36227ebb50fd988`.
- AdMob access is available; the Android rewarded unit offers callback setup.
  Its settings have not been changed while the backend cutover is blocked.
- This Mac has only Xcode Command Line Tools, not Xcode, so it cannot archive an
  iOS release. An Xcode-equipped build machine and App Store release are still needed.
- Do not deploy the incompatible backend alone: existing mobile clients would
  lose XP sync and verified Live Match compatibility before their updates are available.

### Google Play review submission

- Production release `32 (2.1.2)` (release ID `12`) and the default English phone
  screenshot reorder were submitted together. Play Console shows both under
  **Changes in review**; automated quick checks were still running when verified.
- `homepage-screenshot-play.jpg` was moved from seventh to first; the other six
  screenshots retain their relative order.
- **Managed publishing is off**, at the user's explicit request following submission.
  Google Play will automatically publish the update and screenshot change after approval.
  The backend and AdMob rollout prerequisites remain outstanding and must be completed
  before approval to avoid broken XP sync, Live Matches and ad rewards in the new build.
- [Publishing overview](https://play.google.com/console/u/0/developers/6526753351823957138/app/4973682529167431904/publishing)

1. Test migration `supabase/migrations/20260930000000_atomic_xp_ledger.sql` in staging.
   It preserves existing balances, adds an event ledger and RPC, and removes
   direct client writes to XP, the failure counter, and row deletion.
   Then apply `supabase/migrations/20260930100000_verified_competitive_rewards.sql`.
   This removes live/ad events from the client RPC and adds authoritative live
   games, confirmed match settlement, protected competitive stats and ad receipts.
2. Deploy the updated `submit-match` and `async-game` Edge Functions and new
   `admob-reward` function. The latter must have JWT verification disabled as in
   `supabase/config.toml`; it authenticates Google's ECDSA signature instead.
   Configure server-side verification on BOTH production rewarded ad units:
   Android `ca-app-pub-6740638137327567/2005976804` and iOS
   `ca-app-pub-6740638137327567/8356435492`. The linked project's callback is
   `https://nbyirvmueubdlsbtnrwh.supabase.co/functions/v1/admob-reward`.
   Verify this against the intended project before changing AdMob settings.
   This console configuration has NOT been performed.
3. Coordinate the database migration with the web, Android and iOS releases.
   Apply the migration before enabling the updated clients in production.
   Old clients still submit full balances; their progress writes will be rejected
   after this migration. Require an update or retire those builds. Do not deploy
   the migration alone while expecting old clients to continue syncing.
   Old Live Match clients also lack server-recorded moves and stable result IDs;
   they cannot participate in the new verified match flow. Drain active matches
   and coordinate a required client update before enabling this backend.
4. Check two accounts on one device, the same account on two devices, zero XP,
   airplane-mode earnings followed by reconnect, sign-out during a request,
   Adventure clearing after four failures, and Classic wins three and six.
5. Preserve the event ledger on rollback; deleting it would allow old pending IDs
   to be awarded twice. Do not restore unrestricted XP writes as a routine rollback.

New clients retain pending events when the RPC is unavailable. They retry on
subsequent syncs, web reconnect/visibility changes and mobile resume. A guest has
only local storage. Clearing app/browser storage can remove unsynced progress.
Legacy offline balances cannot be safely reconstructed as earned events; the
existing cloud balance is authoritative at the first successful sync.

## Reward policy

- Adventure, Classic and hard practice retain offline, client-reported XP. These
  rewards are not anti-cheat proof and do not determine competitive rankings.
- Live games require both authenticated participants to join a stable match ID.
  Every move is recorded server-side with turn, seat, cell and connect-five
  validation. The final move atomically updates match history, Elo, wins/losses
  and both XP balances. A repeated result or request cannot award again.
- Realtime broadcasts are hints to refresh durable state, not trusted moves or
  results. Polling recovers missed messages. Disconnect forfeits require 45
  seconds without a server heartbeat; clients allow 60 seconds before claiming.
  Empty games are void. Players can resign only themselves. Draws do not change XP.
- Async game results are read from their existing server-managed match rows and
  use stable IDs for settlement. They update rankings without introducing a new
  async XP reward. Results submitted solely as player/winner IDs are rejected.
- Rankings continue to use Elo. Direct player changes to Elo, wins, losses and
  win streak are ignored, and clients cannot insert or delete match history.
- Ad XP requires sign-in and an issued ad nonce before showing an ad. The SDK
  receives user ID and nonce; its completion callback never awards points.
  Google's signed callback validates the user, nonce, allowed ad unit and time,
  then grants +2 once per provider transaction. Delayed callbacks still credit
  the account when the app is closed. The app displays verification pending
  until confirmation. Guest solo play remains available without sign-in.
- Production excludes sample ad units and test signing keys. Debug iOS sample
  ads cannot generate production XP; test the verification fixtures separately.

Google reference: https://developers.google.com/admob/flutter/ssv

Existing historical rankings and balances are preserved; this migration cannot
retroactively verify old results. Two cooperating authenticated players can still
collude or use bots. Those are separate moderation/anti-cheat concerns; offline
solo rewards intentionally remain client-reported under the agreed policy.

## Release verification

The isolated checks validate SQL rules and cryptographic signatures. They do not
replace staging checks with two actual clients and an actual AdMob callback.
Verify browser↔Android and Android↔iOS wins, all win directions, draws, resignations,
blank abandonment, interrupted/retried moves, lost broadcasts, reconnect, duplicate
callbacks, account switch during an ad and delayed rewards. No production services
or AdMob settings have been changed by this work.

## Checks

- Web: `cd bee-five-web && npm run test:xp` and `npx tsc --noEmit`.
- Flutter: `cd bee_five && flutter test test/xp_ledger_test.dart`.
- Database: install `@electric-sql/pglite` in a temporary directory, then run
  `node bee_five/supabase/tests/xp_ledger.test.cjs /absolute/path/to/node_modules/@electric-sql/pglite`.
  This runs actual PostgreSQL locally; it never connects to production.

- Verified competition: `node bee_five/supabase/tests/verified_rewards.test.cjs /absolute/path/to/node_modules/@electric-sql/pglite`.
- Ad signatures: `node bee_five/supabase/tests/admob_signature.test.cjs`.
