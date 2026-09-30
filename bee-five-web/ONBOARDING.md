# Web first-play flow

On the first visit in a browser, the intro explains connect five with three
visual examples. It starts an untimed easy-AI match using the existing game
logic, or can be skipped. Practice uses the web convention: the player is black
and the AI is yellow. The first-move prompt disappears after a valid move.
A completed match offers Continue; Skip remains available throughout.

Completion and skipping set `bee_five:first_play_handled:v1` in localStorage.
An interrupted, unfinished tutorial is shown again. A blocked storage API never
prevents playing or skipping, but persistence is then limited to that visit.
The regular menu and lobby do not mount until the introduction is finished.

Adventure briefings use the active level and round predicates. Each rule is
explained once per Adventure session; changed turn limits get a fresh reminder.
The game board, AI and round timer do not mount until the briefing is dismissed.
Existing story and bee-fact screens are preserved.

## Telemetry

`tutorial_begin`, `tutorial_step` (`practice_started`, `first_move`),
`tutorial_complete`, `tutorial_skipped`, and `adventure_rules_viewed` are emitted
as browser `beefive:analytics` CustomEvents, with `{name, parameters}` in detail.
The Firebase JS SDK now sends these events to the registered **Bee Five Web**
app in project `bee-five-2025`, GA4 property `534412661`, measurement ID
`G-36WV7EXCXS`. Android and iOS use separate streams in that same property.
The public Firebase web configuration is in `src/utils/firebaseAnalytics.ts`;
no service-account credentials or deployment environment variables are needed.

Initialization runs only in the browser. Early events wait for the shared SDK
initialization promise; unsupported browsers and blocked analytics cannot stop
play. Events are not also sent through a separate gtag path. Firebase supplies
automatic first-visit and session reporting. No player names, emails, or account
IDs are included in custom events. Page URLs omit query strings and fragments.
Localhost and development builds send `debug_mode` and `build_type=development`;
release traffic has `build_type=release`.

Inspect test events in [Firebase DebugView](https://console.firebase.google.com/project/bee-five-2025/analytics/debugview).
For web retention, use `first_visit` cohorts, not the mobile `first_open` event.
Keep web, Android, and iOS cohorts separate. This connection covers web onboarding
and Adventure rule views; ordinary web match starts/results are not yet instrumented.
Deploy the updated web build before expecting events from the public website.

SDK setup follows the [Firebase web Analytics guide](https://firebase.google.com/docs/analytics/web/get-started).

On 2026-09-30 the production build was exercised locally and Firebase DebugView
confirmed receipt of `first_visit`, `session_start`, `page_view`, `tutorial_begin`,
both `tutorial_step` actions, `tutorial_skipped`, and `adventure_rules_viewed`,
with `build_type=development`.

## Verification

- `npm run test:onboarding` runs onboarding and analytics delivery checks offline using the installed TypeScript compiler.
- `node scripts/run-ts-checks.mjs scripts/onboarding.test.mjs scripts/adventure-parity.test.mjs`
  also runs the existing Adventure logic checks without downloading a runner.
- `npm run build` checks production compilation, types and lint.
- Browser checks: intro examples, practice start, first move and AI reply, Skip,
  persistence on reload, practice completion, and Adventure rules before play.
- Check at desktop and phone widths. To replay locally, remove only the
  `bee_five:first_play_handled:v1` localStorage key and reload.

Run the development server and production build sequentially: Next.js 15 uses
`.next` for both and concurrent writes can leave incompatible preview assets.

## GameAnalytics (2026-09-30)

`gameanalytics` 5.0.0 is dynamically loaded in the browser only. Bee Five Web is
GameAnalytics game 354334 under the Bee Five organization/studio. The provider
initializes from the existing root analytics component and independently mirrors
the existing tutorial and Adventure rule events from `trackOnboarding`. Sessions
are automatic. This does not add full web match-result instrumentation.

The SDK's ESM export is `gameanalytics.GameAnalytics`, despite declarations
advertising a different named export. Initialization waits for its remote-config
callback (which runs inside the session-start response), so the first tutorial
event is queued until startup finishes. A 20-second timeout prevents indefinitely
waiting on blocked analytics. Development errors are logged; failures never block
the game or Firebase. Custom fields are allowlisted, and no account ID or URL is
sent through these custom events. SDK-generated anonymous installation IDs are
used for retention. Custom dimension 01 distinguishes `development` and `release`.

Browser verification confirmed sessions and the three events `tutorial_begin`,
`tutorial_step:practice_started`, and `tutorial_step:first_move` in the actual
[GameAnalytics Live events dashboard](https://tool.gameanalytics.com/game/354334/realtime/live-events),
tagged `development`. Unit checks, TypeScript validation, and the production
Next.js build pass. Existing unrelated lint warnings remain. These are local
test events, not production player traffic. Deployment remains pending while the
existing Vercel project is suspended.

Reference: [official JavaScript SDK](https://docs.gameanalytics.com/event-tracking-and-integrations/sdks-and-collection-api/open-source-sdks/javascript/).
