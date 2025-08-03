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
    // Sharp is automatically used when installed
  },
  vite: {
    plugins: [tailwindcss()],
    // Ensure GIFs are treated as assets
    assetsInclude: ['**/*.gif']
  },
  integrations: [mdx(), react()],
});
