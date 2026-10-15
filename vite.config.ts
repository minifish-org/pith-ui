import { defineConfig } from 'vite';
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/pith-ui/' : '/',
  build: { outDir: 'showroom-dist', emptyOutDir: true },
});
