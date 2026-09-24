// @ts-check

import svelte from "@astrojs/svelte";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// `output: "server"` renders every page per request, so a new Date() in a
// component would report the visitor's request time. Freeze one timestamp when
// this config loads (build time == deploy time) and inject it instead.
const buildDate = new Date().toISOString();

// https://astro.build/config
export default defineConfig({
  output: "server",
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
