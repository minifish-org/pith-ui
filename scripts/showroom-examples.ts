import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import ts from 'typescript';
export function partId(name: string): string { return name === 'mountParts' || name === 'createButtonPart' ? 'button-parts' : name.replace(/^create/, '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase(); }
export async function showroomExampleSources(root: string): Promise<Map<string, string>> {
    const path = join(root, 'showroom/parts-examples.ts'), source = ts.createSourceFile(path, await readFile(path, 'utf8'), ts.ScriptTarget.Latest, true), examples = new Map<string, string>();
    let imageSource = '';
    for (const statement of source.statements)
        if (ts.isVariableStatement(statement))
            for (const declaration of statement.declarationList.declarations) {
                if (!ts.isIdentifier(declaration.name) || !declaration.initializer)
                    continue;
                if (declaration.name.text === 'imageSource')
                    imageSource = declaration.initializer.getText(source);
                if (!['simpleLayouts', 'specialExamples'].includes(declaration.name.text))
                    continue;
                const initializer = ts.isSatisfiesExpression(declaration.initializer) ? declaration.initializer.expression : declaration.initializer;
                if (!ts.isObjectLiteralExpression(initializer))
                    throw new Error('Showroom examples must be literal typed records');
                for (const member of initializer.properties) {
                    if (!ts.isPropertyAssignment(member) || !ts.isIdentifier(member.name))
                        throw new Error('Showroom examples need named factories');
                    const name = member.name.text;
                    if (examples.has(name))
                        throw new Error('Duplicate formal showroom example: ' + name);
                    let expression: string;
                    if (declaration.name.text === 'simpleLayouts')
                        expression = `p.${name}({children:[p.createTextPart({text:'Caller-owned content'})]})`;
                    else {
                        if (!ts.isArrowFunction(member.initializer))
                            throw new Error('Showroom examples must be typed arrow builders');
                        const body = member.initializer.body;
                        expression = ts.isBlock(body) ? `(() => ${body.getText(source)})()` : body.getText(source);
                    }
                    examples.set(name, expression);
                }
            }
    if (!imageSource)
        throw new Error('Showroom image content is missing');
    return new Map([...examples].map(([name, expression]) => [name, `import * as p from 'pith-ui';\n\n// Supply an ordinary host. All presentation belongs to the library.\ndeclare const mount: HTMLElement;\nconst disabled = false;\nconst notify = (message: string) => console.log(message);\nconst imageSource = ${imageSource};\nconst part = ${expression};\np.mountParts(mount, part);\n`]));
}
export async function recipeExampleSources(root: string): Promise<Map<string,string>> {
  const path = join(root,'showroom/recipe-cases.ts'), source=ts.createSourceFile(path,await readFile(path,'utf8'),ts.ScriptTarget.Latest,true), examples=new Map<string,string>();
  const visit=(node: ts.Node): void => {
    if(ts.isObjectLiteralExpression(node)) {
      const member=(name:string)=>node.properties.find(p=>p.name?.getText(source)===name);
      const id=member('id'),factories=member('factories'),create=member('create');
      if(id&&ts.isPropertyAssignment(id)&&ts.isStringLiteral(id.initializer)&&factories&&create) {
        const expression=ts.isMethodDeclaration(create)&&create.body?`(${create.parameters.map(p=>p.getText(source)).join(',')}) => ${create.body.getText(source)}`:ts.isPropertyAssignment(create)?create.initializer.getText(source):undefined;
        if(!expression)throw new Error('Recipe exhibit needs an executable builder');
        examples.set(id.initializer.text,`import * as p from 'pith-ui';\nimport * as r from 'pith-ui/recipes';\n\ninterface DemoContext {state: string;log(message: string): void;action(): Promise<r.RecipeResult>}\ntype Region = {part:p.Part;open?():void;destroy():void};\nconst createRegion: (context: DemoContext)=>Region = ${expression};\ndeclare const mount:HTMLElement;\nconst region=createRegion({state:'normal',log:console.log,async action(){return {ok:true};}});\np.mountParts(mount,region.part);region.open?.();\n`);
        return;
      }
    }
    ts.forEachChild(node,visit);
  };visit(source);return examples;
}
export async function generateShowroomExamples(root: string): Promise<void> { const examples = await showroomExampleSources(root); await writeFile(join(root, 'showroom/parts-code.ts'), '// Generated from the actual typed example builders; do not hand-edit.\nexport const exampleCode: Record<string,string> = ' + JSON.stringify(Object.fromEntries(examples), null, 2) + ';\n'); const recipes=await recipeExampleSources(root);await writeFile(join(root,'showroom/recipe-code.ts'),'// Generated from the actual region demo builders; do not hand-edit.\nexport const recipeCode: Record<string,string> = '+JSON.stringify(Object.fromEntries(recipes),null,2)+';\n'); }
