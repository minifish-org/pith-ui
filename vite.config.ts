import { defineConfig } from 'vite';
import { themeStyles } from './scripts/palette.ts';
import {fileURLToPath} from 'node:url';
export default defineConfig({
  base: '/',
  plugins: [{ name: 'pui-theme-palette', enforce: 'pre', transform(source, id) {
    if (id.split('?')[0]?.endsWith('/src/styles.css')) return source.replace('/* PUI_THEME_PALETTE */', themeStyles());
  } }],
  build: { outDir: 'showroom-dist', emptyOutDir: true, rollupOptions: {input: {
    showroom: fileURLToPath(new URL('./index.html', import.meta.url)),
  }} },
});
