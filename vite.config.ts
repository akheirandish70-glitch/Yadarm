import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Minimal Notes",
        short_name: "Notes",
        description: "A minimal notes app with tags",
        theme_color: "#111827",
        background_color: "#f5f5f5",
        display: "standalone",
        start_url: "/",
        dir: "rtl",
        lang: "fa",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" }
        ]
      }
    })
  ]
});
import { VitePWA } from "vite-plugin-pwa";

VitePWA({
  registerType: "autoUpdate",
  includeAssets: ["favicon.svg", "pwa-192.png", "pwa-512.png"],
  workbox: {
    globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
    runtimeCaching: [
      {
        urlPattern: ({url}) => url.pathname.startsWith("/fonts/"),
        handler: "CacheFirst",
        options: {
          cacheName: "fonts",
          expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }
        }
      }
    ]
  }
})
