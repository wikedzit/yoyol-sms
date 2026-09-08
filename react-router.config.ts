import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  // Cloudflare Vite plugin emits client assets to dist/; keep RR looking there.
  buildDirectory: "dist",
  future: {
    // React Router 7.9 still reads this name (v8_viteEnvironmentApi is 7.10+).
    unstable_viteEnvironmentApi: true,
  },
} satisfies Config;
