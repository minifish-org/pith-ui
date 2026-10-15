import { chromium, expect } from '@playwright/test';
import type { Browser, CDPSession } from '@playwright/test';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const evidence = resolve(process.env.PITH_UI_EVIDENCE_DIR ?? '/tmp/pith-ui-evidence-20261016');
const urls = { baseline: process.env.BASELINE_URL ?? 'http://127.0.0.1:4181', current: process.env.CURRENT_URL ?? 'http://127.0.0.1:4182' };
const directories = { baseline: process.env.BASELINE_DIST ?? '/tmp/pith-ui-baseline/frontend/dist', current: process.env.CURRENT_DIST ?? '/Users/yusp/work/pith-desk/frontend/dist' };
const fixture = process.env.DESK_FIXTURE ?? '/tmp/pith-ui-baseline/frontend/e2e/fixture.mjs';
const { installFixture } = await import(pathToFileURL(fixture).href);
await mkdir(evidence, { recursive: true });
type Variant = keyof typeof urls;
async function sources(directory: string, prefix = ''): Promise<Array<{ path: string; bytes: number; nonblankLines: number; rawLines: number }>> {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) result.push(...await sources(join(directory, entry.name), `${prefix}${entry.name}/`));
    else if (/\.(?:ts|css)$/.test(entry.name) && !entry.name.endsWith('.generated.ts')) {
      const data = await readFile(join(directory, entry.name)); const lines = data.toString('utf8').split('\n');
      result.push({ path: `${prefix}${entry.name}`, bytes: data.length, nonblankLines: lines.filter(line => line.trim()).length, rawLines: lines.length - (lines.at(-1) === '' ? 1 : 0) });
    }
  }
  return result;
}
async function assets(directory: string, prefix = ''): Promise<Array<{ path: string; bytes: number; gzipBytes: number; brotliBytes: number; sha256: string }>> {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) files.push(...await assets(join(directory, entry.name), `${prefix}${entry.name}/`));
    else if (/\.(?:js|css)$/.test(entry.name)) {
      const bytes = await readFile(join(directory, entry.name));
      files.push({ path: `${prefix}${entry.name}`, bytes: bytes.length, gzipBytes: gzipSync(bytes).length, brotliBytes: brotliCompressSync(bytes).length, sha256: createHash('sha256').update(bytes).digest('hex') });
    }
  }
  return files;
}
async function metrics(session: CDPSession): Promise<Record<string, number>> {
  const { metrics } = await session.send('Performance.getMetrics');
  return Object.fromEntries(metrics.map(({ name, value }) => [name, value]));
}
function delta(before: Record<string, number>, after: Record<string, number>) {
  return { threadCPUms: ((after.ThreadTime ?? 0) - (before.ThreadTime ?? 0)) * 1000,
    taskDurationMs: ((after.TaskDuration ?? 0) - (before.TaskDuration ?? 0)) * 1000,
    scriptDurationMs: ((after.ScriptDuration ?? 0) - (before.ScriptDuration ?? 0)) * 1000,
    layoutDurationMs: ((after.LayoutDuration ?? 0) - (before.LayoutDuration ?? 0)) * 1000 };
}
async function run(browser: Browser, variant: Variant) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'en-US', timezoneId: 'UTC' });
  const errors: string[] = [];
  try {
    await context.addInitScript(installFixture);
    await context.addInitScript(() => {
      const scope = window as unknown as { reviewState: { messages: unknown[] } };
      scope.reviewState.messages = Array.from({ length: 120 }, (_, index) => ({
        id: `historical-${index}`, role: index % 2 ? 'assistant' : 'user', status: 'done', branchNodeId: `historical-${index}`,
        text: index % 2 ? `## Reply ${index}\n\nA stable historical response 中文 🐟.\n\n\`\`\`ts\nconst example = ${index};\n\`\`\`\n\nKeep reading position and selection.` : `Question ${index}: preserve existing behavior and reuse verified building blocks.`,
        timestamp: 1791899580000 + index * 60000,
      }));
    });
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    const session = await context.newCDPSession(page);
    await session.send('Performance.enable', { timeDomain: 'threadTicks' });
    const initialMetrics = await metrics(session); const started = performance.now();
    await page.goto(urls[variant]); await expect(page.locator('#composer-input')).toBeEditable();
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const readyMs = performance.now() - started; const readyMetrics = await metrics(session);
    if (!('ThreadTime' in readyMetrics)) throw new Error('Chromium did not expose ThreadTime; refusing to label wall-clock metrics as CPU');
    await session.send('HeapProfiler.collectGarbage');
    const readyHeap = (await metrics(session)).JSHeapUsedSize;
    await page.evaluate(() => {
      const scope = window as unknown as { reviewState: { messages: unknown[] }; emitReview(): void };
      scope.reviewState.messages.push({ id: 'perf-stream', role: 'assistant', text: '', status: 'streaming' }); scope.emitReview();
    });
    const streamBefore = await metrics(session); const streamStarted = performance.now();
    await page.evaluate(async () => {
      const scope = window as unknown as { reviewState: { messages: Array<{ id: string; text: string }> }; emitReview(): void };
      for (let index = 0; index < 120; index++) {
        scope.reviewState.messages.at(-1)!.text += `Chunk ${index}: 中文 text. `; scope.emitReview();
        await new Promise(resolve => setTimeout(resolve, 33));
      }
    });
    const streamMs = performance.now() - streamStarted; const streamAfter = await metrics(session);
    await session.send('HeapProfiler.collectGarbage'); const streamHeap = (await metrics(session)).JSHeapUsedSize;
    const inputBefore = await metrics(session); const inputStarted = performance.now();
    const text = 'A draft with Chinese 中文 and a path /workspace/src/index.ts. '.repeat(3).slice(0, 134);
    await page.locator('#composer-input').pressSequentially(text, { delay: 10 });
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const inputMs = performance.now() - inputStarted; const inputAfter = await metrics(session);
    await session.send('HeapProfiler.collectGarbage'); const inputHeap = (await metrics(session)).JSHeapUsedSize;
    if (errors.length) throw new Error(`${variant} page errors: ${errors.join('; ')}`);
    return { variant, ready: { wallMs: readyMs, heapBytes: readyHeap, ...delta(initialMetrics, readyMetrics) },
      stream: { chunks: 120, intervalMs: 33, wallMs: streamMs, heapBytes: streamHeap, ...delta(streamBefore, streamAfter) },
      input: { characters: text.length, keyDelayMs: 10, wallMs: inputMs, heapBytes: inputHeap, ...delta(inputBefore, inputAfter) },
      raw: { initialMetrics, readyMetrics, streamBefore, streamAfter, inputBefore, inputAfter } };
  } finally { await context.close(); }
}
const assetData = { baseline: await assets(directories.baseline), current: await assets(directories.current) };
const sourceData = {
  baseline: await sources(process.env.BASELINE_SOURCE ?? '/tmp/pith-ui-baseline/frontend/src'),
  application: await sources(process.env.CURRENT_SOURCE ?? '/Users/yusp/work/pith-desk/frontend/src'),
  library: await sources(process.env.LIBRARY_SOURCE ?? resolve(import.meta.dirname, '../src')),
};
const sourceTotals = Object.fromEntries(Object.entries(sourceData).map(([name, files]) => [name, {
  files: files.length, bytes: files.reduce((sum, file) => sum + file.bytes, 0), nonblankLines: files.reduce((sum, file) => sum + file.nonblankLines, 0), rawLines: files.reduce((sum, file) => sum + file.rawLines, 0),
}]));
const total = (variant: Variant): number => assetData[variant].reduce((sum, file) => sum + file.bytes, 0);
const assetIncrease = total('current') / total('baseline') - 1;
const browser = await chromium.launch(); const samples: Array<{ pair: number } & Awaited<ReturnType<typeof run>>> = [];
try {
  // Separate warmups make module/cache startup effects visible but exclude them from paired medians.
  await run(browser, 'baseline'); await run(browser, 'current');
  for (let pair = 0; pair < 5; pair++) {
    for (const variant of (pair % 2 ? ['current', 'baseline'] : ['baseline', 'current']) as Variant[]) {
      samples.push({ pair, ...await run(browser, variant) });
    }
  }
} finally { await browser.close(); }
function median(values: number[]): number { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.floor(sorted.length / 2)]!; }
const comparisons = (['stream', 'input'] as const).flatMap(stage => (['threadCPUms', 'heapBytes'] as const).map(metric => {
  const baseline = median(samples.filter(sample => sample.variant === 'baseline').map(sample => sample[stage][metric]));
  const current = median(samples.filter(sample => sample.variant === 'current').map(sample => sample[stage][metric]));
  return { stage, metric, baselineMedian: baseline, currentMedian: current, increase: current / baseline - 1, budget: .2, passed: current <= baseline * 1.2 };
}));
const report = { environment: { platform: process.platform, arch: process.arch, node: process.version, browser: 'Chromium', urls, fixture, mode: 'Production files only; fixture API, 120 messages, paired order alternates.' },
  assets: assetData, source: { policy: 'Product TS/CSS only; generated contracts, tests, scripts and showroom excluded. Current product is application plus library; line counts also reflect formatting.', totals: sourceTotals, files: sourceData },
  // The maintainer explicitly raised this initial extraction budget from 15% to 25% on 2026-10-16.
  assetBudget: { baselineBytes: total('baseline'), currentBytes: total('current'), increase: assetIncrease, budget: .25, passed: assetIncrease <= .25 }, comparisons, samples,
  limits: 'CDP ThreadTime measures renderer main-thread CPU, not whole-machine energy. Retained JS heap follows forced GC. This script does not measure native WebKit or shared physical memory.' };
const reportPath = join(evidence, 'resource-comparison.json'); await writeFile(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ report: reportPath, assetBudget: report.assetBudget, comparisons }, null, 2));
if (!report.assetBudget.passed || comparisons.some(comparison => !comparison.passed)) process.exitCode = 1;
