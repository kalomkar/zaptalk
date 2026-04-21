import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zaptalk.app',
  appName: 'ZapTalk',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
