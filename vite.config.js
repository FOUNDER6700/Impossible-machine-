import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base path ensures assets load properly on GitHub Pages
  // regardless of repository name (e.g., https://user.github.io/impossible-machine/)
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    target: 'es2020'
  },
  server: {
    host: true,
    port: 5173
  }
});
