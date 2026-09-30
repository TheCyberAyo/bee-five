import { createAnalyticsClient } from './analyticsClient';
import { gameAnalyticsEvent } from './gameAnalyticsEvents';

export const gameAnalytics = createAnalyticsClient(async () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  // SDK 5.0.0's ESM file exports `gameanalytics`, while its declarations
  // incorrectly describe the CommonJS named export. Use the actual ESM shape.
  const sdkModule = await import('gameanalytics');
  const sdk = (sdkModule as unknown as {
    gameanalytics: { GameAnalytics: typeof import('gameanalytics').GameAnalytics };
  }).gameanalytics.GameAnalytics;
  const development = process.env.NODE_ENV !== 'production'
    || ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
  sdk.configureBuild('web-0.1.0');
  sdk.configureAvailableCustomDimensions01(['release', 'development']);
  sdk.setCustomDimension01(development ? 'development' : 'release');
  sdk.setEnabledInfoLog(development);
  // Client SDK ingestion keys for Bee Five Web; not account/admin credentials.
  if (!sdk.isRemoteConfigsReady()) {
    // initialize() returns before the network handshake. SDK 5 drops design
    // events sent during that gap, including the first tutorial_begin.
    const ready = await new Promise<boolean>((resolve) => {
      const finish = (available: boolean) => {
        clearTimeout(timeout);
        sdk.removeRemoteConfigsListener(listener);
        resolve(available);
      };
      const listener = { onRemoteConfigsUpdated: () => finish(true) };
      const timeout = setTimeout(() => finish(false), 20000);
      sdk.addRemoteConfigsListener(listener);
      sdk.initialize('7a5211fc85913816b9b40a315333683a', '242004bfa4f1beb8048b1bab6feecbbd901f1e89');
    });
    if (!ready) throw new Error('SDK initialization timed out');
  }
  return (name, parameters) => {
    const event = gameAnalyticsEvent(name, parameters);
    if (event) sdk.addDesignEvent(event.eventId, undefined, event.fields);
  };
}, error => {
  if (process.env.NODE_ENV !== 'production') console.warn('[GameAnalytics] unavailable:', error);
});
