import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    // `ANALYZE=1 npm run build` writes dist/stats.html: what makes each file big.
    process.env.ANALYZE && visualizer({ filename: "dist/stats.html", gzipSize: true, template: "treemap" }),
    process.env.ANALYZE && visualizer({ filename: "dist/stats.json", template: "raw-data" }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
