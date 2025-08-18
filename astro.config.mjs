// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  output: "static",
  compressHTML: true,
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp'
    },
  },
  vite: {
    plugins: [tailwindcss()],
    // Ensure GIFs and WebM files are treated as assets
    assetsInclude: ['**/*.gif', '**/*.webm', '**/*.webp']
  },
  integrations: [mdx(), react()],
});
