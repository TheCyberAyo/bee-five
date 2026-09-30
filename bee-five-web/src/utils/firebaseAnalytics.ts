import { createAnalyticsClient } from './analyticsClient';

// Public web-app identifiers from Firebase Project settings, not admin credentials.
const firebaseConfig = {
  apiKey: 'AIzaSyAglzHMx5WAwv7N2wFJpyy_GHn_taoWnL4',
  authDomain: 'bee-five-2025.firebaseapp.com',
  projectId: 'bee-five-2025',
  storageBucket: 'bee-five-2025.firebasestorage.app',
  messagingSenderId: '1046239121449',
  appId: '1:1046239121449:web:98539e70679716189dcc38',
  measurementId: 'G-36WV7EXCXS',
};

export const firebaseAnalytics = createAnalyticsClient(async () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  const [{ initializeApp, getApps }, sdk] = await Promise.all([
    import('firebase/app'), import('firebase/analytics'),
  ]);
  if (!(await sdk.isSupported())) return null;
  const app = getApps().find(app => app.name === 'bee-five-web')
    ?? initializeApp(firebaseConfig, 'bee-five-web');
  const debug = process.env.NODE_ENV !== 'production'
    || ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
  const analytics = sdk.initializeAnalytics(app, {
    config: {
      ...(debug ? { debug_mode: true } : {}),
      // Auth callbacks can contain tokens or email addresses in their URL.
      page_location: window.location.origin + window.location.pathname,
      page_referrer: document.referrer ? new URL(document.referrer).origin : '',
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    },
  });
  sdk.setUserProperties(analytics, { build_type: debug ? 'development' : 'release' });
  return (name, parameters) => sdk.logEvent(analytics, name, {
    ...parameters,
    build_type: debug ? 'development' : 'release',
    ...(debug ? { debug_mode: true } : {}),
  });
});
