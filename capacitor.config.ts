import type { CapacitorConfig } from '@capacitor/cli';

const liveReloadUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: 'com.elmadawy.market.customer',
  appName: 'سوبر ماركو',
  webDir: 'dist',
  appendUserAgent: 'ElmadawyCustomer/1.2.156',
  // Green WebView before the page paints: no white flash after the splash.
  backgroundColor: '#005931',
  plugins: {
    // Android 16 is edge-to-edge: the page draws under the system bars and
    // pads itself with --safe-area-inset-* (injected with the right values,
    // also on older Android WebViews where env() is wrong).
    SystemBars: {
      insetsHandling: 'css',
    },
  },
  server: liveReloadUrl
    ? {
        url: liveReloadUrl,
        cleartext: liveReloadUrl.startsWith('http://'),
        androidScheme: 'https',
      }
    : {
        androidScheme: 'https',
      },
};

export default config;
