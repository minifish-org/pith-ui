import {createHash} from 'node:crypto';
import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';

type Styles = Record<string, string>;
interface TreeNode {
  tag: string;
  attrs?: Record<string, string>;
  text?: string;
  state?: unknown;
  box?: number[];
  scroll?: number[];
  style?: number;
  children?: TreeNode[];
}
interface FlatNode extends Omit<TreeNode, 'box' | 'scroll' | 'style' | 'children'> {depth: number}
export interface Contract {
  baseline: {desk: string; ui: string; npm: string};
  scenario: string;
  appearance: string;
  viewport: number[];
  body: number[];
  modal: boolean;
  duplicates: string[];
  focus: unknown;
  styleDefaults: Styles;
  styles: Styles[];
  structure: TreeNode[];
}
interface StoredCase extends Omit<Contract, 'baseline' | 'styles' | 'styleDefaults' | 'structure'> {
  tree: string;
  styleRefs: number[];
  // node index, local style index, bounding box, optional scroll measurements.
  measurements: Array<[number, number, number[], number[]?]>;
}
interface Oracle {
  format: 1;
  baseline: Contract['baseline'];
  styleDefaults: Styles;
  styles: Styles[];
  trees: Record<string, FlatNode[]>;
  cases: Record<string, StoredCase>;
}
const directory = fileURLToPath(new URL('./contracts/rc27-ui-022/', import.meta.url));
const oracleFile = `${directory}baseline.json`;
const staging = fileURLToPath(new URL('../artifacts/rc27-contract-captures/', import.meta.url));
let oracle: Promise<Oracle> | undefined;
const fullStyle = (defaults: Styles, delta: Styles): Styles => ({...defaults, ...delta});
const signature = (value: unknown) => JSON.stringify(value);

function flatten(nodes: TreeNode[]): {nodes: FlatNode[]; measurements: StoredCase['measurements']} {
  const rows: FlatNode[] = [], measurements: StoredCase['measurements'] = [];
  function visit(node: TreeNode, depth: number): void {
    const {box, scroll, style, children, ...content} = node;
    const index = rows.length;
    rows.push({depth, ...content});
    if (box) measurements.push(scroll ? [index, style!, box, scroll] : [index, style!, box]);
    for (const child of children || []) visit(child, depth + 1);
  }
  for (const node of nodes) visit(node, 0);
  return {nodes: rows, measurements};
}

function expand(nodes: FlatNode[], measurements: StoredCase['measurements']): TreeNode[] {
  const roots: TreeNode[] = [], parents: TreeNode[] = [];
  const measured = new Map(measurements.map(([node, style, box, scroll]) => [node, {style, box, ...(scroll ? {scroll} : {})}]));
  for (const [index, row] of nodes.entries()) {
    const {depth, ...content} = row;
    const node: TreeNode = {...content, ...measured.get(index)};
    if (depth === 0) roots.push(node);
    else (parents[depth - 1]!.children ??= []).push(node);
    parents[depth] = node;
  }
  return roots;
}

/** Default verification reads immutable maintained data; it never records. */
export async function readContract(name: string): Promise<Contract> {
  oracle ??= readFile(oracleFile, 'utf8').then(source => JSON.parse(source));
  const data = await oracle;
  const stored = data.cases[name];
  if (!stored) throw new Error(`No frozen rc.27 contract named ${name}`);
  const {tree, styleRefs, measurements, ...metadata} = stored;
  const full = styleRefs.map(index => fullStyle(data.styleDefaults, data.styles[index]!));
  const defaults = full[0]!;
  return {...metadata, baseline: data.baseline, styleDefaults: defaults,
    styles: full.map(style => Object.fromEntries(Object.entries(style).filter(([property, value]) => defaults[property] !== value))),
    structure: expand(data.trees[tree]!, measurements)};
}

/** Explicit update runs stage isolated captures without touching the oracle. */
export async function stageContract(name: string, contract: Contract): Promise<void> {
  if (process.env.RC27_UPDATE_CONTRACT !== '1') throw new Error('Recording requires RC27_UPDATE_CONTRACT=1.');
  await mkdir(staging, {recursive: true});
  await writeFile(`${staging}${name}.json`, JSON.stringify(contract));
}

function oracleJSON(data: Oracle): string {
  // One readable record per style, tree node, and measurement; no opaque blobs.
  const lines = ['{', '  "format": 1,', `  "baseline": ${signature(data.baseline)},`, `  "styleDefaults": ${signature(data.styleDefaults)},`, '  "styles": ['];
  data.styles.forEach((style, index) => lines.push(`    ${signature(style)}${index < data.styles.length - 1 ? ',' : ''}`));
  lines.push('  ],', '  "trees": {');
  const trees = Object.entries(data.trees);
  trees.forEach(([key, nodes], treeIndex) => {
    lines.push(`    "${key}": [`);
    nodes.forEach((node, index) => lines.push(`      ${signature(node)}${index < nodes.length - 1 ? ',' : ''}`));
    lines.push(`    ]${treeIndex < trees.length - 1 ? ',' : ''}`);
  });
  lines.push('  },', '  "cases": {');
  const cases = Object.entries(data.cases);
  cases.forEach(([key, value], caseIndex) => {
    const {measurements, ...metadata} = value;
    lines.push(`    "${key}": {`);
    for (const [property, content] of Object.entries(metadata)) lines.push(`      "${property}": ${signature(content)},`);
    lines.push('      "measurements": [');
    measurements.forEach((measurement, index) => lines.push(`        ${signature(measurement)}${index < measurements.length - 1 ? ',' : ''}`));
    lines.push('      ]', `    }${caseIndex < cases.length - 1 ? ',' : ''}`);
  });
  lines.push('  }', '}');
  return lines.join('\n') + '\n';
}

export async function finalizeContracts(): Promise<void> {
  if (process.env.RC27_UPDATE_CONTRACT !== '1' || !process.argv.includes('--update')) throw new Error('Finalizing requires RC27_UPDATE_CONTRACT=1 and --update.');
  const files = (await readdir(staging)).filter(file => file.endsWith('.json')).sort();
  if (files.length !== 224) throw new Error(`Expected all 224 frozen baseline captures, found ${files.length}.`);
  const captures = await Promise.all(files.map(async file => [file.slice(0, -5), JSON.parse(await readFile(`${staging}${file}`, 'utf8')) as Contract] as const));
  const expectedBaseline = {desk: '3f1ee24', ui: '897f46a', npm: '0.2.2'};
  const signatures = new Set<string>();
  for (const [, contract] of captures) {
    if (signature(contract.baseline) !== signature(expectedBaseline)) throw new Error('Capture baseline identity changed.');
    for (const delta of contract.styles) signatures.add(signature(fullStyle(contract.styleDefaults, delta)));
  }
  const sorted = [...signatures].sort(), indices = new Map(sorted.map((value, index) => [value, index]));
  const full = sorted.map(value => JSON.parse(value) as Styles), defaults = full[0]!;
  const data: Oracle = {format: 1, baseline: expectedBaseline, styleDefaults: defaults,
    styles: full.map(style => Object.fromEntries(Object.entries(style).filter(([property, value]) => defaults[property] !== value))), trees: {}, cases: {}};
  for (const [name, contract] of captures) {
    const {structure, styleDefaults, styles, baseline: _baseline, ...metadata} = contract;
    const flat = flatten(structure);
    const tree = createHash('sha256').update(signature(flat.nodes)).digest('hex').slice(0, 16);
    if (data.trees[tree] && signature(data.trees[tree]) !== signature(flat.nodes)) throw new Error('DOM tree hash collision.');
    data.trees[tree] = flat.nodes;
    data.cases[name] = {...metadata, tree, styleRefs: styles.map(delta => indices.get(signature(fullStyle(styleDefaults, delta)))!), measurements: flat.measurements};
  }
  data.trees = Object.fromEntries(Object.entries(data.trees).sort(([a], [b]) => a.localeCompare(b)));
  await mkdir(directory, {recursive: true});
  const encoded = oracleJSON(data);
  const decoded = JSON.parse(encoded) as Oracle;
  if (signature(decoded) !== signature(data)) throw new Error('Lossless oracle encoding failed.');
  await writeFile(oracleFile, encoded);
  process.stdout.write(`Frozen ${captures.length} cases, ${Object.keys(data.trees).length} DOM trees, ${full.length} styles in ${encoded.length} bytes.\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await finalizeContracts();
