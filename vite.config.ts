import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
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
