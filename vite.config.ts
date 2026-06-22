import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      "/api": "http://127.0.0.1:8787",
      "/preview": "http://127.0.0.1:8787",
    },
  },
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    nitro(),
    tanstackStart({
      server: { entry: "server" },
    }),
    viteReact(),
  ],
});
