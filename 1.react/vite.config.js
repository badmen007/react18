import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import reactRefresh from "@vitejs/plugin-react-refresh";

export default defineConfig({
  resolve: {
    alias: {
      react: path.posix.resolve("src/react"),
      "react-dom": path.posix.resolve("src/react-dom"),
      "react-dom-bindings": path.posix.resolve("react-dom-bindings"),
      "react-reconciler": path.posix.resolve("react-reconciler"),
      scheduler: path.posix.resolve("src/scheduler"),
      shared: path.posix.resolve("src/shared"),
    },
  },
  plugins: [react(), reactRefresh()],
  optimizeDeps: {
    force: true,
  },
});
