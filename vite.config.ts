import { defineConfig } from 'vite';
import { themeStyles } from './scripts/palette.ts';
import {fileURLToPath} from 'node:url';
export default defineConfig({
  base: '/',
  // Source-only validation uses the same opaque-part identity as recipes.
  // Independently installed consumers have no aliases or source access.
  resolve: {alias: [
    {find: /^pith-ui\/recipes$/, replacement: fileURLToPath(new URL('./src/recipes/index.ts', import.meta.url))},
    {find: /^pith-ui$/, replacement: fileURLToPath(new URL('./src/index.ts', import.meta.url))},
    {find: /^pith-ui\/styles\.css$/, replacement: fileURLToPath(new URL('./src/styles.css', import.meta.url))},
  ]},
  plugins: [{ name: 'pui-theme-palette', enforce: 'pre', transform(source, id) {
    if (id.split('?')[0]?.endsWith('/src/styles.css')) return source.replace('/* PUI_THEME_PALETTE */', themeStyles());
  } }],
  build: { outDir: 'showroom-dist', emptyOutDir: true, rollupOptions: {input: {
    showroom: fileURLToPath(new URL('./index.html', import.meta.url)),
  }} },
});
