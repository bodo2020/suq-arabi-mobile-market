import type { CapacitorConfig } from '@capacitor/cli';

const liveReloadUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: 'com.elmadawy.market.customer',
  appName: 'ســــــوبـرمــــاركو',
  webDir: 'dist',
  appendUserAgent: 'ElmadawyCustomer/1.2.167',
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
