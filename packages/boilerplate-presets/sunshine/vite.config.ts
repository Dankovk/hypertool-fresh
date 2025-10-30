import { defineConfig } from "vite";

export default defineConfig({
    server: {
        port: 3000,
        host: "0.0.0.0",
        strictPort: true,
        hmr: {
            clientPort: 3000,
        },
    },
    build: {
        target: "esnext",
        minify: false,
    },
    optimizeDeps: {
        include: [],
    },
});
