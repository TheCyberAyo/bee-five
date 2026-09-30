# Bee Five mobile analytics

The Flutter app uses Firebase Analytics in the existing Firebase project and
GameAnalytics (added September 30, 2026; release pending). The Next.js web app
connects its onboarding events to both services through separate web projects;
see `../bee-five-web/ONBOARDING.md`. The legacy React Native app is not
instrumented by this implementation.

## Milo's three named sources

Milo's September 21 email names GameAnalytics, Firebase and Play Console as
examples. All three now have Bee Five projects; no fourth tool was named there.
On October 1, 2026, Play Console's Bee Five Statistics page was verified to
contain installed-audience data: its latest displayed row was September 26,
with 64 unique users across all countries. This is the installed-audience metric,
not lifetime downloads, a playtest cohort size, or D1 retention. Play reporting
already exists for the published Android app and needs no additional game SDK.
Firebase and GameAnalytics provide the custom gameplay events described below.

[Play Console Statistics](https://play.google.com/console/u/0/developers/6526753351823957138/app/4973682529167431904/statistics)

## Collection and event definitions

Firebase automatically collects `first_open`, `session_start`, and
`user_engagement`. The foreground bootstrap enables collection and sets
`build_type` to `development` or `release` as a default event parameter and user
property, then logs `app_open` on cold launch.
Returning sessions are measured by the SDK, not by counting cold launches.
Collection failures are best effort and cannot interrupt gameplay.

| Event | Meaning |
| --- | --- |
| `game_mode_selected` | Entered a gameplay screen; includes `game_mode`. Local series emit this per board. |
| `match_started` | A local board attempt begins. Adventure waits for its countdown; daily challenge waits for rules Continue; live multiplayer starts when its match screen opens. |
| `match_completed` | Board resolved, with `outcome` and elapsed `duration_seconds`. |
| `match_quit` | An unfinished attempt was disposed, restarted, changed level, or voided without moves. |
| `rematch_requested` | Player chose Play Again/retry or sent a live rematch request. A request does not imply another match started. |
| `forfeit_requested` | Player tapped Forfeit in a live match. A confirmed forfeit also resolves the match as a loss. |
| `rules_viewed`, `rules_continue` | Daily challenge rules shown and dismissed to begin play. |
| `async_match_viewed`, `async_result_viewed` | Visits to asynchronous games and their results; these are view counts, not unique matches. |

Board events share a random `attempt_id`. Modes: `practice`, `classic_streak`,
`adventure`, `daily_challenge`, `local_multiplayer`, `online_live`. Practice and
streak include difficulty; adventure includes difficulty, level and round;
local multiplayer includes series length. An attempt emits at most one terminal
event, even if completion callbacks repeat or the finished screen is disposed.
Elapsed duration includes time spent in the background; it is not active play time.
No names, emails, school names, or Supabase user IDs are sent in custom events.

The first-play introduction emits `tutorial_begin` with tutorial ID
`first_practice_v1`. Choosing practice and making the first move emit
`tutorial_step`; finishing the guided match (win, loss, or draw) emits
`tutorial_complete` once. Skipping before finishing emits `tutorial_skipped`
with the current step. Skipping or finishing is remembered on this installation.
The guided match uses easy AI, no turn timer, and no gameplay ads. Its board
events include `tutorial_id` so it can be separated from ordinary practice.
Adventure rule briefings emit `adventure_rules_viewed` with level and round;
only newly encountered mechanics within that Adventure session are explained,
before the countdown and turn timer. Daily rules remain separate.

Async games can span days and finish while the app is closed. Authoritative
async match starts, results, and forfeits must be derived from server records;
screen visits intentionally do not feed the live/local completion funnel.
Force-killing an app may produce no quit event. Analyze unmatched starts as
unfinished attempts, rather than claiming they are confirmed quits.
Online events measure player attempts (both devices emit), not unique server matches.

## Firebase setup and device verification

| Platform | Firebase app ID | GA4 stream ID |
| --- | --- | --- |
| Android | `1:1046239121449:android:0d48d527b17146d59dcc38` | `14466342216` |
| iOS | `1:1046239121449:ios:9ee8e917c36efde09dcc38` | `15108591171` |

Both native application identifiers are `com.beefive.app`. The Android Google
Services Gradle plugin generates the Firebase resources from `google-services.json`;
the Xcode Runner target includes `GoogleService-Info.plist` as a bundle resource.
The shared `firebase_analytics` Flutter plugin sends each platform's tutorial,
Adventure rule, and match events to its own stream.

Native setup was checked on 2026-09-30: the Android arm64 debug APK built
successfully, CocoaPods installed FirebaseAnalytics 12.19.0 and refreshed the
iOS lockfile, and all 12 analytics/onboarding tests passed. The targeted Dart
analyzer found no issues. An iOS build still requires Xcode (not installed on
the setup Mac).

The APK was installed on a Samsung SM-A155F. Firebase DebugView confirmed
`first_open`, `session_start`, `screen_view`, `app_open`, and `tutorial_begin`,
with `build_type=development`. Android debug mode was enabled for that check
and disabled afterwards. iOS event ingestion has not been device-verified.

1. Firebase project `bee-five-2025` was verified on 2026-09-30 with Analytics
   enabled and linked to GA4 property `534412661`. Android, iOS, and Bee Five Web
   have separate streams. Native app IDs and `com.beefive.app` were checked
   against the Firebase registrations. Android's manifest and iOS's Info.plist
   explicitly enable collection; the runtime also enables it. The generated
   iOS GoogleService-Info.plist still contains `IS_ANALYTICS_ENABLED=false`;
   collection is explicitly controlled through the documented
   `FIREBASE_ANALYTICS_COLLECTION_ENABLED` app Info.plist setting and
   `setAnalyticsCollectionEnabled(true)` runtime call.
2. Build and install the updated Flutter app. This code does not modify already
   installed production versions or recover historical retention.
3. Android: enable DebugView with
   `adb shell setprop debug.firebase.analytics.app com.beefive.app`.
   iOS: add `-FIRDebugEnabled` to the Xcode launch arguments.
4. In Firebase Analytics DebugView, verify cold launch, practice win/loss/draw,
   exit mid-match, restart, Play Again, daily rules, adventure countdown and
   completion, local series, live rematch and forfeit. A completed attempt must
   not also emit quit on exit. Confirm attempts have different IDs on restart.
5. Background and resume the app to check automatic session behavior. Reopening
   an async game should emit a view, never a false match start or quit.
6. Remove Android debug mode using
   `adb shell setprop debug.firebase.analytics.app .none.`; remove the iOS launch
   argument. Keep debug traffic out of the playtest cohort.

Create event-scoped custom dimensions for `game_mode`, `difficulty`, `outcome`,
`reason`, and `build_type`; a custom metric for `duration_seconds` can support
duration reports. Do not register high-cardinality `attempt_id` as a dashboard
dimension; retain it for raw event analysis if BigQuery export is enabled.

## Numbers to share with Milo

- New app instances: users with `first_open` during the playtest period. This
  measures first opens, not store downloads or unique humans; reinstalls and
  multiple devices can affect counts. Existing users installing this analytics
  update may first appear in this cohort too. Use a clearly identified playtest.
- Day 1 retention: users in a first-open cohort active on the following calendar
  day divided by the cohort size, using the GA4 property's timezone. Wait for
  the whole following day and reporting ingestion before reporting a cohort.
- First-match funnel: users who first opened, started a match, and completed it.
- Rematch interest: completed attempts followed by `rematch_requested`; measure
  actual subsequent starts separately. Requests may be repeated or declined.
- Drop-off: unmatched attempts and confirmed quit reasons, split by game mode.

Always include cohort dates, sample size, platform and app version. Do not
combine async view events with board completion rates. Day 1 retention is
unknown until real playtest data arrives; unit tests do not validate ingestion.

References: [Flutter setup](https://firebase.google.com/docs/analytics/flutter/get-started),
[custom events](https://firebase.google.com/docs/analytics/flutter/events),
[DebugView](https://firebase.google.com/docs/analytics/debugview).

## GameAnalytics connection (2026-09-30)

The verified GameAnalytics account has a Bee Five organization and studio, with
separate Android, iOS and Web games. Android uses game 354331; Web uses 354334.
The official Flutter SDK 1.3.1 is installed for Android/iOS. Its ingestion keys
are configured in `lib/services/gameanalytics_provider.dart`; these are embedded
client SDK credentials, not administrative API tokens. The official Android
Maven repository is restricted to the `com.gameanalytics.sdk` group.

The existing telemetry service independently delivers to Firebase and
GameAnalytics. Initialization does not depend on Firebase being available, and
a failure in either event sink does not prevent delivery to the other. Desktop
and Flutter Web skip the mobile SDK; the Next.js site has a separate integration.

GameAnalytics automatically tracks sessions and returning app instances. Existing
gameplay events become Design events, using bounded names such as
`match_completed:practice:win` and `tutorial_step:first_move`. Terminal match
events include duration in the numeric `value` field, in seconds. No synthetic
progression, purchase, ad-revenue or XP resource events are emitted. Async views
remain views. Custom fields use an allowlist; attempt IDs and account identifiers
are not forwarded. Match counts still represent local device attempts.

Custom dimension 01 is `release` or `development`. Filter to `release` and a
specific platform/build/cohort for figures shared with Milo. Freshly integrated
existing players can appear as new SDK users; this is not lifetime installs.
Retention cannot be calculated until real cohorts have had time to return.

Verification: eight Flutter telemetry tests pass, including provider isolation,
bounded event naming and exclusion of identifiers. Static analysis passes.
Android's debug APK builds successfully with the native SDK included. iOS
CocoaPods resolves GA-SDK-IOS 5.0.1, but compilation/device verification still
requires Xcode. No Android device was connected for ingestion verification.
The web integration was exercised locally and GameAnalytics Live events showed
sessions, `tutorial_begin`, `tutorial_step:practice_started`, and
`tutorial_step:first_move`, all tagged `development`.

Release boundary: Android 2.1.2 (32) already submitted to Google Play does **not**
contain this integration. A new version/build is required to ship it. No new Play
submission or iOS release was made as part of this setup. Existing backend XP
deployment prerequisites remain documented in `XP_ACCOUNTING.md`.

SDK reference: [official Flutter integration](https://docs.gameanalytics.com/event-tracking-and-integrations/sdks-and-collection-api/game-engine-sdks/flutter/).
