import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { paraglideVitePlugin } from "@inlang/paraglide-js";

export default defineConfig({
  plugins: [
    sveltekit(),
    tailwindcss(),
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/lib/paraglide",
      emitTsDeclarations: true,
      // URL lebih dulu (prefix /id), lalu cookie, lalu base locale (en tanpa prefix).
      strategy: ["url", "cookie", "baseLocale"]
    })
  ],
  server: {
    port: 3177,
    strictPort: true,
    fs: { allow: [".."] }
  },
  optimizeDeps: {
    include: ["echarts", "echarts-for-svelte", "leaflet"]
  }
});
