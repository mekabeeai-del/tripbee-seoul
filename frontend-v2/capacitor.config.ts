import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tripbee.seoul',
  appName: 'TripBee Seoul',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
