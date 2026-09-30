export type EventParameters = Record<string, string | number | boolean>;
export type AnalyticsTransport = (name: string, parameters: EventParameters) => void;

/** Share initialization and preserve events emitted while the SDK is loading. */
export function createAnalyticsClient(
  load: () => Promise<AnalyticsTransport | null>,
  onError: (error: unknown) => void = () => {},
) {
  let ready: Promise<AnalyticsTransport | null> | undefined;
  const report = (error: unknown) => {
    try { onError(error); }
    catch { /* Diagnostics must also be safe for gameplay. */ }
  };
  const initialize = () => ready ??= Promise.resolve().then(load).catch(error => {
    report(error);
    return null;
  });
  return {
    initialize,
    async track(name: string, parameters: EventParameters = {}) {
      try { (await initialize())?.(name, parameters); }
      catch (error) { report(error); }
    },
  };
}
