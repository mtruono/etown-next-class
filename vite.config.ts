import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

function repositoryBase(): string {
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) return "/";
  const name = repository.split("/")[1];
  return name ? `/${name}/` : "/";
}

export default defineConfig(({ command }) => ({
  base: command === "build" ? repositoryBase() : "/",
  build: {
    sourcemap: false,
  },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,webmanifest}"],
        cleanupOutdatedCaches: true,
        navigateFallback: "index.html",
        runtimeCaching: [],
      },
    }),
  ],
}));
