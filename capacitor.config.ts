import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "id.hikari.hikabridge",
  appName: "HIKABRIDGE",
  webDir: "www",
  // Local network: PC dan HP harus terhubung ke WiFi yang sama
  // Jalankan: npm run dev di PC, lalu buka APK di HP
  server: {
    url: "https://private-math-lesson.vercel.app",
    cleartext: false,
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
  // Untuk production (Railway/cloud): ganti dengan:
  // server: {
  //   url: "https://your-app.railway.app",
  //   cleartext: false,
  // },
};

export default config;
