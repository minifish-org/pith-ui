import { build } from 'vite';
import { mkdir, realpath, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const evidence = resolve(process.env.PITH_UI_EVIDENCE_DIR ?? '/tmp/pith-ui-evidence-20261016');
await mkdir(evidence, { recursive: true });
async function analyze(root: string) {
  root = await realpath(root);
  const chunks: Array<{ file: string; bytes: number; modules: Array<{ id: string; renderedLength: number; renderedExports: string[]; removedExports: string[] }> }> = [];
  const assets: Array<{ file: string; bytes: number }> = [];
  await build({ root, configFile: false, logLevel: 'silent', build: { write: false, rollupOptions: { plugins: [{
    name: 'pith-ui-size-evidence',
    generateBundle(_options, bundle) {
      for (const entry of Object.values(bundle)) {
        if (entry.type === 'asset') assets.push({ file: entry.fileName, bytes: Buffer.byteLength(entry.source) });
        else chunks.push({ file: entry.fileName, bytes: Buffer.byteLength(entry.code), modules: Object.entries(entry.modules).map(([id, module]) => ({ id, renderedLength: module.renderedLength, renderedExports: module.renderedExports, removedExports: module.removedExports })).sort((a, b) => b.renderedLength - a.renderedLength) });
      }
    },
  }] } } });
  return { root, chunks, assets, totalJSAndCSS: chunks.reduce((total, chunk) => total + chunk.bytes, 0) + assets.filter(asset => asset.file.endsWith('.css')).reduce((total, asset) => total + asset.bytes, 0) };
}
const result = {
  baseline: await analyze(process.env.BASELINE_SOURCE_ROOT ?? '/tmp/pith-ui-baseline/frontend'),
  current: await analyze(process.env.CURRENT_SOURCE_ROOT ?? '/Users/yusp/work/pith-desk/frontend'),
  note: 'Per-module renderedLength is Rollup code before final minification. Chunk/asset bytes are final production output, generated in memory without writing application dist. Config is disabled so baseline and current use identical default Vite transforms.',
};
const path = join(evidence, 'bundle-attribution.json');
await writeFile(path, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ report: path, baselineBytes: result.baseline.totalJSAndCSS, currentBytes: result.current.totalJSAndCSS }, null, 2));
