import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gsv.office',
  appName: 'GSVOffice',
  webDir: 'dist',
  server: {
    url: 'http://192.168.0.177:8080',
    cleartext: true
  }
};

export default config;
