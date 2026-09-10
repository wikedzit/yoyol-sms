import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  // Cloudflare Vite plugin emits client assets to dist/; keep RR looking there.
  buildDirectory: "dist",
  future: {
    v8_viteEnvironmentApi: true,
  },
} satisfies Config;
