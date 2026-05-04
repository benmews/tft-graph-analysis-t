import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, PluginOption } from "vite";

import sparkPlugin from "@github/spark/spark-vite-plugin";
import createIconImportProxy from "@github/spark/vitePhosphorIconProxyPlugin";
import { resolve } from 'path'

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname
const isCI = process.env.CI === 'true'

// https://vite.dev/config/ test
export default defineConfig({
  base: isCI ? '/tft-graph-analysis-t/' : '/',
  plugins: [
    react(),
    tailwindcss(),
    // DO NOT REMOVE
    ...(!isCI ? [createIconImportProxy() as PluginOption] : []),
    ...(!isCI ? [sparkPlugin() as PluginOption] : []),
  ],
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src')
    }
  },
});
