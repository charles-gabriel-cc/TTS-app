import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.assistenteccen.android',
  appName: 'Assistente CCEN',
  webDir: 'out',
  server: {
    androidScheme: 'http',
    allowNavigation: ['*'],
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'AAB'
    }
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      backgroundColor: "#007bff",
      androidSplashResourceName: "splash",
      showSpinner: false
    }
  }
};

export default config; 