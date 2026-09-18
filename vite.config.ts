import { existsSync } from "node:fs";
import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { chooseCloudflareEnv } from "./workers/script/choose-cloudflare-env.mjs";
import { BUILD_WRANGLER_CONFIG_PATH } from "./workers/script/write-build-wrangler-config.mjs";

// The Cloudflare Vite plugin reads CLOUDFLARE_ENV when it flattens wrangler.jsonc.
// Workers CI still drops that var, so the build wrapper also writes a one-env file.
process.env.CLOUDFLARE_ENV = chooseCloudflareEnv();

const wranglerConfigPath = existsSync(BUILD_WRANGLER_CONFIG_PATH)
  ? BUILD_WRANGLER_CONFIG_PATH
  : undefined;

console.log(
  `Vite Cloudflare env=${process.env.CLOUDFLARE_ENV} wranglerConfig=${wranglerConfigPath ?? "wrangler.jsonc"}`,
);

export default defineConfig({
  plugins: [
    cloudflare({
      ...(wranglerConfigPath ? { configPath: wranglerConfigPath } : {}),
      viteEnvironment: { name: "ssr" },
    }),
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
  ],
  define: {
    global: "globalThis",
  },
  // Force SSR pre-bundling at startup. Vite's scanner misses some imports
  // (especially `~` aliased files), and Cloudflare's worker runner cannot
  // recover from a mid-request optimizeDeps reload.
  environments: {
    ssr: {
      optimizeDeps: {
        include: [
          "react",
          "react/jsx-runtime",
          "react/jsx-dev-runtime",
          "react-dom",
          "react-dom/server",
          "react-router",
          "react-router-dom",
          "isbot",
          "class-variance-authority",
          "@radix-ui/react-alert-dialog",
          "@radix-ui/react-dialog",
          "@radix-ui/react-dropdown-menu",
          "@radix-ui/react-label",
          "@radix-ui/react-progress",
          "@radix-ui/react-select",
          "@radix-ui/react-separator",
          "@radix-ui/react-slot",
          "@radix-ui/react-switch",
          "@radix-ui/react-tabs",
          "@radix-ui/react-tooltip",
          "lucide-react",
          "next-themes",
          "sonner",
          "react-hook-form",
          "@hookform/resolvers/zod",
          "clsx",
          "tailwind-merge",
          "recharts",
          "zod",
        ],
      },
    },
  },
});
