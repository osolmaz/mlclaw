import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "src/mlclaw-control-ui",
  base: "/mlclaw/assets/",
  plugins: [react()],
  build: {
    outDir: "../../assets/mlclaw-control-ui",
    emptyOutDir: true,
  },
});
