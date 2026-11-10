/**
 * Crash and error reporting with Sentry. Off until a DSN is set in
 * VITE_SENTRY_DSN (create a free project at sentry.io, copy its DSN). The SDK
 * is loaded only when enabled, so the app stays light without it.
 * No personal data is sent: no IPs, no request bodies, phone numbers masked.
 */
export function startErrorReporting(app: 'customer' | 'store') {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn || !import.meta.env.PROD) return;
  void import('@sentry/react').then(Sentry => {
    Sentry.init({
      dsn,
      environment: app,
      release: (import.meta.env.VITE_APP_VERSION as string | undefined) || undefined,
      sendDefaultPii: false,
      tracesSampleRate: 0,
      // Ignore noise that is not our bug.
      ignoreErrors: ['ResizeObserver loop', 'Network request failed', 'Failed to fetch', 'Load failed', 'AbortError'],
      beforeSend(event) {
        const mask = (value?: string) => value?.replace(/\b01\d{9}\b/g, '01*********');
        if (event.message) event.message = mask(event.message);
        event.exception?.values?.forEach(value => { value.value = mask(value.value); });
        if (event.request) { delete event.request.cookies; delete event.request.data; }
        if (event.user) event.user = { id: event.user.id };
        return event;
      },
    });
  }).catch(() => { /* reporting is optional */ });
}
