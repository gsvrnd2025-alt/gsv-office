import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.gsvee.office',
  appName: 'GSV E-Office',
  webDir: 'dist',
  server: {
    // Always connect to the LAN TrueNAS server
    url: 'http://192.168.0.177:8080',
    cleartext: true,        // allow plain HTTP on Android (LAN-only app)
    androidScheme: 'http',  // use http scheme so cookies/sockets work
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#0d1117',
  },
};

export default config;
