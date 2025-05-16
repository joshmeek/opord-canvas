import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    proxy: {
      '/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/opords': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/tactical-tasks': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/analysis': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ai': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
