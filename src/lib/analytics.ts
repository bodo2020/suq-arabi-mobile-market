/**
 * Product analytics (PostHog) and real-device speed (web-vitals).
 * Off until VITE_POSTHOG_KEY is set (free project at posthog.com). The SDK
 * loads only when enabled. Privacy: no session recordings, no typed text,
 * profiles only for signed-in customers and only by their id.
 */
type PostHog = typeof import('posthog-js').default;

let client: PostHog | null = null;
const queue: Array<[string, Record<string, unknown> | undefined]> = [];

export function startAnalytics() {
  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  if (!key || !import.meta.env.PROD) return;
  void import('posthog-js').then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || 'https://eu.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: 'history_change',
      autocapture: { dom_event_allowlist: ['click'], element_allowlist: ['a', 'button'] },
      disable_session_recording: true,
      mask_all_text: false,
      mask_all_element_attributes: true,
      persistence: 'localStorage',
    });
    client = posthog;
    queue.splice(0).forEach(([event, props]) => posthog.capture(event, props));
    void reportWebVitals();
  }).catch(() => { /* analytics is optional */ });
}

export function track(event: string, props?: Record<string, unknown>) {
  if (client) client.capture(event, props);
  else if (import.meta.env.VITE_POSTHOG_KEY && queue.length < 50) queue.push([event, props]);
}

export function identifyCustomer(userId: string | null) {
  if (!client) return;
  if (userId) client.identify(userId);
  else client.reset();
}

/** Load time, tap responsiveness and layout shifts as customers really get them. */
async function reportWebVitals() {
  const { onLCP, onINP, onCLS, onFCP, onTTFB } = await import('web-vitals');
  const send = (metric: { name: string; value: number; rating: string }) =>
    track('web_vital', { metric: metric.name, value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value), rating: metric.rating });
  onLCP(send); onINP(send); onCLS(send); onFCP(send); onTTFB(send);
}
