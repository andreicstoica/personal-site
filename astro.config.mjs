// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  output: "server",
  compressHTML: true,
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp'
    },
  },
  vite: {
    plugins: [tailwindcss()],
    // Ensure WebM and WebP files are treated as assets
    assetsInclude: ['**/*.webm', '**/*.webp']
  },
  integrations: [mdx(), react()],
  adapter: node({
    mode: 'standalone'
  }),
});
