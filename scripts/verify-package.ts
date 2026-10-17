import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { lstat, mkdtemp, mkdir, readFile, readdir, realpath, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
const execute = promisify(execFile);
async function run(command: string, args: string[], cwd: string): Promise<string> { try {
    return (await execute(command, args, { cwd, maxBuffer: 8 * 1024 * 1024 })).stdout.trim();
}
catch (error) {
    const e = error as {
        message?: string;
        stdout?: string;
        stderr?: string;
    };
    throw new Error(`${e.message ?? command}\n${e.stdout ?? ''}\n${e.stderr ?? ''}`);
} }
function assert(condition: unknown, message: string): asserts condition { if (!condition)
    throw new Error(message); }
interface Asset {
    path: string;
    bytes: number;
}
export interface PackageConsumerVerification {
    exports: string[];
    consumerTypecheck: 'passed';
    consumerProductionBuild: 'passed';
    recipeProductionBuild: 'passed';
    referenceSha256: string;
    rejectedTypeCases: number;
    rejectedImportCases: number;
    compiledRecipes: number;
    compiledDocumentationExamples: number;
    consumerAssets: Asset[];
    recipeAssets: Asset[];
}
async function assets(directory: string, prefix = ''): Promise<Asset[]> { const result: Asset[] = []; for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name), relative = prefix + entry.name;
    if (entry.isDirectory())
        result.push(...await assets(path, relative + '/'));
    else
        result.push({ path: relative, bytes: (await stat(path)).size });
} return result; }
/** Verify the installed archive itself: no source alias, package symlink,
 * replacement example or declaration skip can make this consumer pass. */
export async function verifyInstalledPackageConsumer(root: string, consumer: string): Promise<PackageConsumerVerification> {
    const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as {
        name: string;
        version: string;
    }, installed = join(consumer, 'node_modules', metadata.name);
    assert(!(await lstat(installed)).isSymbolicLink(), 'Package consumer must use the installed package, not a source symlink');
    const pkg = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8')) as {
        name: string;
        version: string;
        dependencies?: Record<string, string>;
        exports?: Record<string, string | {
            types?: string;
            import?: string;
        }>;
    };
    assert(pkg.name === metadata.name && pkg.version === metadata.version, 'Installed package metadata differs');
    assert(JSON.stringify(Object.keys(pkg.exports ?? {}).sort()) === JSON.stringify(['.', './styles.css']), 'The package must expose only the bounded root and stylesheet');
    const entry = pkg.exports?.['.'];
    assert(entry && typeof entry !== 'string' && entry.types === './dist/index.d.ts' && entry.import === './dist/index.js', 'Invalid bounded public entry');
    assert(pkg.exports?.['./styles.css'] === './dist/styles.css', 'Missing portable public stylesheet entry');
    for (const name of ['README.md', 'AI.md', 'API.md', 'APP.md', 'LICENSE', 'dist/index.js', 'dist/index.d.ts', 'dist/styles.css'])
        assert((await readFile(join(installed, name))).byteLength > 0, `Missing or empty package file: ${name}`);
    assert(pkg.dependencies && Object.values(pkg.dependencies).every(version => /^\d+\.\d+\.\d+$/.test(version)), 'Runtime dependencies must use exact versions');
    const css = await readFile(join(installed, 'dist/styles.css'), 'utf8');
    assert(css.length > 0 && !/@import\s+['"]\.\//.test(css), 'Published CSS must not depend on relative source imports');
    const blocked = ['pith-ui/app', 'pith-ui/parts', 'pith-ui/dist/parts/ownership.js', 'pith-ui/src/dom.js'];
    const runtime = JSON.parse(await run(process.execPath, ['--input-type=module', '-e', `
 const ui=await import('pith-ui'),names=Object.keys(ui).sort();
 if(!names.length||names.some(name=>name!=='mountParts'&&!/^create[A-Za-z0-9]+Part$/.test(name)))throw new Error('An unrestricted or template API escaped through the public root');
 for(const name of ${JSON.stringify(blocked)}){let rejected=false;try{await import(name);}catch(error){if(error.code!=='ERR_PACKAGE_PATH_NOT_EXPORTED')throw error;rejected=true;}if(!rejected)throw new Error('Private package import accepted: '+name);}console.log(JSON.stringify(names));`], consumer)) as string[];
    const api = await readFile(join(installed, 'API.md'), 'utf8'), documented = [...api.matchAll(/^\| \[\x60((?:create[A-Za-z0-9]+Part)|mountParts)\x60\]/gm)].map(match => match[1]!).sort();
    assert(JSON.stringify(runtime) === JSON.stringify(documented), 'Installed runtime exports differ from the generated public API index');
    const ts = (await import(pathToFileURL(join(root, 'node_modules/typescript/lib/typescript.js')).href)).default as typeof import('typescript'), compiler = join(root, 'node_modules/typescript/bin/tsc');
    const compilerOptions = { target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, noEmit: true, lib: ['ES2022', 'DOM', 'DOM.Iterable'], types: [], skipLibCheck: false, verbatimModuleSyntax: true };
    const recipes = (await readdir(join(installed, 'examples/assemblies'))).filter(name => name.endsWith('.ts')).sort();
    assert(recipes.length > 0, 'No executable assembly documentation was packed');
    const recipeDirectory = join(consumer, 'examples/assemblies');
    await mkdir(recipeDirectory, { recursive: true });
    let reference = '';
    for (const name of recipes) {
        const body = await readFile(join(installed, 'examples/assemblies', name), 'utf8'), source = ts.createSourceFile(name, body, ts.ScriptTarget.Latest, true);
        const visit = (node: import('typescript').Node): void => { if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
            if (node.moduleSpecifier)
                assert(ts.isStringLiteral(node.moduleSpecifier) && (node.moduleSpecifier.text === 'pith-ui' || /^\.\/[^/]+\.js$/.test(node.moduleSpecifier.text)), `Packed assembly uses a private or source import: ${name}`); assert(!(ts.isIdentifier(node) && ['document', 'window', 'Node', 'DOMParser'].includes(node.text)), `Packed assembly creates or inspects raw DOM: ${name}`); ts.forEachChild(node, visit); };
        visit(source);
        await writeFile(join(recipeDirectory, name), body);
        reference += name + '\n' + body + '\n';
    }
    assert(recipes.includes('desk.ts'), 'The complete tested local assembly is missing from package documentation');
    const docDirectory = join(consumer, 'docs/assemblies');
    await mkdir(docDirectory, { recursive: true });
    let compiledDocumentationExamples = 0;
    for (const name of (await readdir(join(installed, 'docs/assemblies'))).filter(name => name.endsWith('.md')).sort()) {
        const body = await readFile(join(installed, 'docs/assemblies', name), 'utf8');
        let index = 0;
        for (const match of body.matchAll(/^```(?:ts|typescript)\s*\n([\s\S]*?)^```\s*$/gm)) {
            await writeFile(join(docDirectory, `${name}.example-${++index}.ts`), match[1] + '\nexport {};\n');
            compiledDocumentationExamples++;
        }
        assert(index > 0, `Assembly documentation has no executable example: ${name}`);
    }
    const main = `import {createButtonPart,createInputPart,createStackPart,createTextPart,mountParts} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst message=createTextPart({text:'Installed bounded parts'}),input=createInputPart({label:'Name',value:'中文 example 🐟'});\nconst save=createButtonPart({label:'Save',variant:'primary',onAction(){message.update({text:input.read()});}});\nmountParts(document.getElementById('app') as HTMLElement,createStackPart({children:[message,input,save]}),{appearance:'light'});\n`;
    const recipeMain = `import {mountDesk} from './examples/assemblies/desk.js';\nimport 'pith-ui/styles.css';\nconst app=mountDesk(document.getElementById('app') as HTMLElement,{appearance:'light'});\nwindow.addEventListener('pagehide',()=>app.destroy(),{once:true});\n`;
    await writeFile(join(consumer, 'main.ts'), main);
    await writeFile(join(consumer, 'recipe-main.ts'), recipeMain);
    await writeFile(join(consumer, 'tsconfig.json'), JSON.stringify({ compilerOptions, include: ['main.ts', 'recipe-main.ts', 'examples/assemblies/*.ts', 'docs/assemblies/*.ts'] }, null, 2));
    await run(process.execPath, [compiler, '--project', 'tsconfig.json'], consumer);
    const prelude = `import {createButtonPart,createInputPart,createStackPart,mountParts,type Part} from 'pith-ui';\ndeclare const mount:HTMLElement;\nconst button=createButtonPart({label:'Save'}),input=createInputPart({label:'Name'});\n`;
    const forbidden = [['button.element;', 'element'], ['input.control;', 'control'], ['input.element;', 'element'], ["createButtonPart({label:'Save',style:{padding:8}});", 'style'], ["createButtonPart({label:'Save',className:'custom'});", 'className'], ["createButtonPart({label:'Save',render:()=>document.createElement('span')});", 'render'], ['createStackPart({children:[document.body]});', 'Part'], ['createStackPart({children:[],gap:12});', 'gap'], ["createButtonPart({label:'Save',duration:100});", 'duration'], ["createButtonPart({label:'Save',icon:'custom-svg'});", 'custom-svg'], ["createInputPart({label:'Name',width:300});", 'width'], ["mountParts(mount,button,{appearance:'custom'});", 'custom'], ['const fake:Part={destroy(){}};', 'Part'], ["createButtonPart({purpose:'prompt',variant:'overlay-close',icon:'close',label:'Close'});", 'prompt'], ["import {createApplication} from 'pith-ui';", 'createApplication'], ["import {createButton} from 'pith-ui';", 'createButton']];
    for (const [source, diagnostic] of forbidden) {
        await writeFile(join(consumer, 'rejected-consumer.ts'), prelude + source + '\n');
        await writeFile(join(consumer, 'rejected-tsconfig.json'), JSON.stringify({ compilerOptions, include: ['rejected-consumer.ts'] }));
        let rejected = false;
        try {
            await execute(process.execPath, [compiler, '--project', 'rejected-tsconfig.json'], { cwd: consumer, maxBuffer: 8 * 1024 * 1024 });
        }
        catch (error) {
            const e = error as {
                code?: unknown;
                stdout?: string;
                stderr?: string;
            }, output = `${e.stdout ?? ''}\n${e.stderr ?? ''}`;
            assert(typeof e.code === 'number' && output.includes('rejected-consumer.ts') && output.includes(diagnostic!), `Unexpected failure while checking forbidden public type: ${output}`);
            rejected = true;
        }
        assert(rejected, `Packed public declarations accepted forbidden UI surface: ${source}`);
    }
    const html = (entry: string) => `<!doctype html><html><head><meta charset="utf-8"><title>Installed Pith UI consumer</title></head><body><div id="app"></div><script type="module" src="/${entry}"></script></body></html>`, vite = join(root, 'node_modules/vite/bin/vite.js');
    await writeFile(join(consumer, 'index.html'), html('main.ts'));
    await run(process.execPath, [vite, 'build', '--outDir', 'dist'], consumer);
    await writeFile(join(consumer, 'index.html'), html('recipe-main.ts'));
    await run(process.execPath, [vite, 'build', '--outDir', 'recipe-dist'], consumer);
    const consumerAssets = await assets(join(consumer, 'dist')), recipeAssets = await assets(join(consumer, 'recipe-dist'));
    for (const built of [consumerAssets, recipeAssets])
        assert(built.some(asset => asset.path.endsWith('.js') && asset.bytes > 0) && built.some(asset => asset.path.endsWith('.css') && asset.bytes > 0), 'Consumer production builds must contain JavaScript and CSS');
    return { exports: runtime, consumerTypecheck: 'passed', consumerProductionBuild: 'passed', recipeProductionBuild: 'passed', referenceSha256: createHash('sha256').update(reference).digest('hex'), rejectedTypeCases: forbidden.length, rejectedImportCases: blocked.length, compiledRecipes: recipes.length, compiledDocumentationExamples, consumerAssets, recipeAssets };
}
interface Packed {
    filename: string;
    integrity: string;
    size: number;
    unpackedSize: number;
    files: Array<{
        path: string;
        size: number;
    }>;
}
async function main(): Promise<void> {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), evidence = process.env.PITH_UI_EVIDENCE_DIR ? resolve(process.env.PITH_UI_EVIDENCE_DIR) : await mkdtemp(join(tmpdir(), 'pith-ui-package-'));
    await mkdir(evidence, { recursive: true });
    const consumer = await realpath(await mkdtemp(join(tmpdir(), 'pith-ui-consumer-')));
    await run('npm', ['run', 'build'], root);
    const [packed] = JSON.parse(await run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', evidence], root)) as Packed[];
    assert(packed, 'npm pack did not return a package');
    const paths = new Set(packed.files.map(file => file.path));
    for (const expected of ['package.json', 'README.md', 'AI.md', 'API.md', 'APP.md', 'LICENSE', 'dist/index.js', 'dist/index.d.ts', 'dist/styles.css'])
        assert(paths.has(expected), `Missing published entry: ${expected}`);
    for (const path of paths) {
        assert(!/^(?:src|showroom|tests|node_modules|output)\//.test(path), `Development-only file entered the package: ${path}`);
        assert(!path.startsWith('dist/app/') && path !== 'APP-API.md', `Removed public template entry remains in the archive: ${path}`);
        if (path.startsWith('examples/'))
            assert(/^examples\/assemblies\/[^/]+\.ts$/.test(path), `Unexpected example runtime or HTML: ${path}`);
    }
    const tarball = resolve(evidence, packed.filename), bytes = await readFile(tarball), integrity = `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
    assert(integrity === packed.integrity, 'Packed file integrity differs from npm output');
    await writeFile(join(consumer, 'package.json'), JSON.stringify({ name: 'pith-ui-verification-consumer', version: '1.0.0', private: true, type: 'module' }, null, 2));
    await run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball], consumer);
    const installed = join(consumer, 'node_modules/pith-ui');
    for (const file of packed.files) {
        const current = await readFile(join(installed, file.path));
        assert(current.length === file.size, `Installed file size mismatch: ${file.path}`);
        assert((await readFile(join(root, file.path))).equals(current), `Installed content differs from packed source: ${file.path}`);
    }
    const verification = await verifyInstalledPackageConsumer(root, consumer), report = join(evidence, 'package-verification.json');
    await writeFile(report, JSON.stringify({ tarball, consumer, integrity, sha256: createHash('sha256').update(bytes).digest('hex'), compressedBytes: packed.size, unpackedBytes: packed.unpackedSize, files: packed.files, ...verification }, null, 2));
    console.log(JSON.stringify({ report, tarball, consumer, exportCount: verification.exports.length, compiledRecipes: verification.compiledRecipes, compiledDocumentationExamples: verification.compiledDocumentationExamples, consumerTypecheck: 'passed', consumerProductionBuild: 'passed', recipeProductionBuild: 'passed' }, null, 2));
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
    await main();
