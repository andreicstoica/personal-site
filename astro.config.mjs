// @ts-check

import svelte from "@astrojs/svelte";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// Pages prerender to static HTML so a click is a CDN hit, not a serverless
// cold start. Routes that need the request opt out with `prerender = false`.
// Freeze one timestamp when this config loads (build time == deploy time).
const buildDate = new Date().toISOString();

/**
 * Lapse, the motion inspector, comes from a private registry, so it is an
 * optional dependency: CI and Vercel install without a token and skip it.
 * Mount it only under `astro dev`, and only when it is installed.
 * @returns {import("astro").AstroIntegration}
 */
function lapse() {
  return {
    name: "lapse",
    hooks: {
      "astro:config:setup": ({ command, injectScript }) => {
        if (command !== "dev") return;
        try {
          import.meta.resolve("@aiforui/lapse/panel");
        } catch {
          return;
        }
        injectScript(
          "page",
          'import { mountLapse } from "@aiforui/lapse/panel"; mountLapse();',
        );
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: "https://www.andrei.bio",
  output: "static",
  compressHTML: true,
  image: {
    service: {
      entrypoint: "astro/assets/services/sharp",
    },
  },
  vite: {
    plugins: [tailwindcss()],
    define: {
      __BUILD_DATE__: JSON.stringify(buildDate),
    },
  },
  integrations: [svelte(), lapse()],
  adapter: vercel(),
});
