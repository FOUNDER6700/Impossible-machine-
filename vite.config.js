import { defineConfig } from 'vite';

export default defineConfig({
  // Exact case-sensitive repository path for https://founder6700.github.io/Impossible-machine/
  base: '/Impossible-machine/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2020'
  },
  server: {
    host: true,
    port: 5173
  }
});
