// @ts-check

import svelte from "@astrojs/svelte";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// Pages prerender to static HTML so a click is a CDN hit, not a serverless
// cold start. Routes that need the request opt out with `prerender = false`.
// Freeze one timestamp when this config loads (build time == deploy time).
const buildDate = new Date().toISOString();

// https://astro.build/config
export default defineConfig({
  site: "https://andrei.bio",
  output: "static",
  compressHTML: true,
  image: {
    service: {
      entrypoint: "astro/assets/services/sharp",
    },
  },
  vite: {
    plugins: [tailwindcss()],
    // Ensure WebM and WebP files are treated as assets
    assetsInclude: ["**/*.webm", "**/*.webp"],
    define: {
      __BUILD_DATE__: JSON.stringify(buildDate),
    },
  },
  integrations: [svelte()],
  adapter: vercel(),
});
