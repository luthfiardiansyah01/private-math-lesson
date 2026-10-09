import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "id.hikari.hikabridge",
  appName: "HIKABRIDGE",
  webDir: "www",
  // Setelah deploy ke Railway, ganti URL di bawah dengan URL Railway kamu
  // Contoh: "https://hikabridge-production.up.railway.app"
  server: {
    url: "https://your-app.railway.app",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  // Untuk development lokal: uncomment baris di bawah dan comment server.url di atas
  // server: {
  //   url: "http://192.168.x.x:3000",  // ganti dengan IP lokal kamu
  //   cleartext: true,
  // },
};

export default config;
