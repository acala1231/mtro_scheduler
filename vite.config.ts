import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ command }) => ({
  base: command === "serve" ? "/" : "/mtro_scheduler/",
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.ico", "favicon-16x16.png", "favicon-32x32.png", "apple-touch-icon.png", "app-icon.svg"],
      manifest: {
        id: "/mtro_scheduler/",
        name: "복사단 일정표",
        short_name: "복사단 일정표",
        description: "카카오톡 투표결과 이미지로 복사단 월간 일정표를 생성하는 웹앱",
        lang: "ko",
        start_url: "/mtro_scheduler/",
        scope: "/mtro_scheduler/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#f6f8fb",
        theme_color: "#1f3a68",
        icons: [
          {
            src: "/mtro_scheduler/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/mtro_scheduler/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/mtro_scheduler/maskable-icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/mtro_scheduler/maskable-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,json}"],
      },
    }),
  ],
  test: {
    environment: "jsdom",
  },
}));
