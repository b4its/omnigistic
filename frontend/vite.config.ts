import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit(), tailwindcss()],
  server: {
    port: 3177,
    strictPort: true,
    fs: { allow: [".."] }
  },
  optimizeDeps: {
    include: ["echarts", "echarts-for-svelte", "leaflet"]
  }
});