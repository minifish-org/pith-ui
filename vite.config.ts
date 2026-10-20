import { defineConfig } from 'vite';
import {fileURLToPath} from 'node:url';
export default defineConfig({
  base: '/',
  // Source-only validation uses the same opaque-part identity as recipes.
  // Production consumers use the exact registry package without aliases.
  resolve: {alias: [
    {find: /^pith-ui\/recipes$/, replacement: fileURLToPath(new URL('./src/recipes/index.ts', import.meta.url))},
    {find: /^pith-ui$/, replacement: fileURLToPath(new URL('./src/index.ts', import.meta.url))},
    {find: /^pith-ui\/styles\.css$/, replacement: fileURLToPath(new URL('./src/styles.css', import.meta.url))},
  ]},
  build: { outDir: 'showroom-dist', emptyOutDir: true, rollupOptions: {input: {
    showroom: fileURLToPath(new URL('./index.html', import.meta.url)),
  }} },
});
