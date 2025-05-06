
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.66945659a25241e28045bbb22bd54cc8',
  appName: 'ماركت المعداوي',
  webDir: 'dist',
  server: {
    // Default to using localhost for development
    // When deployed, it will use the actual domain
    url: process.env.NODE_ENV === 'production' ? 'http://elmadawymarket.store' : 'http://localhost:5173',
    cleartext: true
  },
  plugins: {
    // Configure any plugins here if needed
  }
};

export default config;
