import { defineConfig } from 'vite';

export default defineConfig({
    base: './', // CRITICAL: This ensures asset paths are relative for GitHub Pages
    server: {
        port: 5173,
        open: true,
    },
});
