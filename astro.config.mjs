// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";

// https://astro.build/config
export default defineConfig({
  output: 'static',
  compressHTML: true,
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {},
    },
  },

  integrations: [mdx()],
});
