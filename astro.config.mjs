// @ts-check

import svelte from "@astrojs/svelte";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

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
  },
  integrations: [svelte()],
  adapter: vercel(),
});
