import { test, expect } from '@playwright/test';
test('a bounded section in a pane footer yields space to multiline input in short windows', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 568 });
    await page.goto('/tests/fixture.html');
    await page.evaluate(async () => {
        const u = await import('../src/index.js');
        const status = u.createScrollArea({ label: 'Supplementary content', content: u.createStack({ children: [u.createText({ role: 'code', text: 'Long output\n'.repeat(200) }), u.createButton({ label: 'Review action' })] }) });
        const input = u.createPromptInput({ label: 'Draft', value: 'A multiline draft\n'.repeat(6) });
        u.mount(document.body, u.createPane({ header: u.createToolbar({ label: 'Header', children: [u.createText({ text: 'Title' })] }), content: u.createText({ text: 'Reading' }), footer: u.createStack({ children: [u.createSlot({ content: status }), input, u.createButton({ label: 'Submit draft' }), u.createText({ role: 'description', text: 'A retained note below the input.' })] }) }), { viewport: 'window' });
    });
    const submit = page.getByRole('button', { name: 'Submit draft' });
    await expect(submit).toBeVisible();
    expect((await submit.boundingBox())!.y + (await submit.boundingBox())!.height).toBeLessThanOrEqual(568);
    const region = page.getByRole('region', { name: 'Supplementary content' });
    expect(await region.evaluate(node => node.scrollHeight > node.clientHeight && node.clientHeight > 0)).toBe(true);
    await page.getByRole('button', { name: 'Review action' }).scrollIntoViewIfNeeded();
    expect((await page.getByRole('button', { name: 'Review action' }).boundingBox())!.y).toBeGreaterThanOrEqual(0);
});
test('retained attachment images form a wrapping collection without a styling option', async ({ page }) => {
    await page.goto('/tests/fixture.html');
    await page.evaluate(async () => { const u = await import('../src/index.js'); const images = [0, 1].map(index => u.createImage({ label: 'Attachment ' + index, source: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', purpose: 'attachment', onRemove() { } })); u.mount(document.body, u.createList({ items: images.map((content, index) => ({ key: String(index), content })) })); });
    const images = page.locator('.pui-image-attachment');
    const first = (await images.nth(0).boundingBox())!, second = (await images.nth(1).boundingBox())!;
    expect(second.y).toBe(first.y);
    expect(second.x).toBeGreaterThan(first.x);
});
test('Markdown code stays horizontally scrollable inside a composed grid stack', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 600 });
    await page.goto('/tests/fixture.html');
    await page.evaluate(async () => { const u = await import('../src/index.js'); const text = '```ts\n' + ('const longIdentifier=1;'.repeat(100)) + '\n```'; u.mount(document.body, u.createStack({ children: [u.createMessage({ role: 'assistant', content: u.createStack({ children: [u.createMarkdown({ text })] }) })] })); });
    const pre = page.locator('.pui-code-block pre');
    expect(await pre.evaluate(node => { node.scrollLeft = 100; return { scrolled: node.scrollLeft, within: node.getBoundingClientRect().right <= innerWidth }; })).toEqual({ scrolled: 100, within: true });
});
test('an interactive row uses a native primary action distinct from its owned auxiliary action', async ({ page }) => {
    await page.goto('/tests/fixture.html');
    await page.evaluate(async () => { const u = await import('../src/index.js'); let finish!: (value: {
        ok: true;
    }) => void; const calls: string[] = []; const row = u.createListRow({ title: 'Saved item', description: 'Description', onAction: () => { calls.push('select'); return new Promise(resolve => finish = resolve); }, actions: u.createButton({ label: 'Details', onAction: () => { calls.push('details'); } }) }); u.mount(document.body, row); Object.assign(window, { row, calls, finish: () => finish({ ok: true }) }); });
    await page.getByRole('button', { name: 'Details', exact: true }).click();
    await page.getByRole('button', { name: 'Saved item', exact: true }).press('Enter');
    await expect(page.getByRole('button', { name: 'Saved item', exact: true })).toBeDisabled();
    await page.evaluate(() => Reflect.get(window, 'row').update({ title: 'Saved item', description: 'Description', disabled: true }));
    await page.evaluate(() => Reflect.get(window, 'finish')());
    await expect(page.getByRole('button', { name: 'Saved item', exact: true })).toBeDisabled();
    expect(await page.evaluate(() => Reflect.get(window, 'calls'))).toEqual(['details', 'select']);
});

test('a small user-message frame retains the accepted light and dark user surfaces',async({page})=>{
  for(const appearance of ['light','dark'] as const){await page.goto('/tests/fixture.html');await page.evaluate(async appearance=>{const u=await import('../src/index.js');u.mount(document.body,u.createMessage({role:'user',content:u.createText({text:'A saved message'})}),{appearance});},appearance);await expect(page.locator('.pui-message-frame')).toHaveCSS('background-color',appearance==='dark'?'rgb(48, 48, 48)':'rgb(240, 242, 246)');}
});

test('a split pane keeps long reading and navigation bounded while its draft grows and the window narrows',async({page})=>{
  await page.setViewportSize({width:900,height:600});await page.goto('/tests/fixture.html');
  await page.evaluate(async()=>{const u=await import('../src/index.js');const items=Array.from({length:120},(_,index)=>({key:String(index),revision:'1',content:u.createMessage({role:index%2?'assistant':'user',content:u.createText({text:'Historical message '+index+' 中文'})})}));const reader=u.createReadingArea({label:'Long reading',identity:'saved',items,viewport:'fill'});const input=u.createPromptInput({label:'Window draft'});const pane=u.createPane({content:reader,footer:u.createStack({children:[input,u.createButton({label:'Send draft'})]})});u.mount(document.body,u.createSplitPane({navigation:u.createPane({content:u.createText({text:'A workspace row\n'.repeat(200)})}),content:pane}),{viewport:'window'});});
  const draft=page.getByRole('textbox',{name:'Window draft',exact:true});
  for(const viewport of [{width:900,height:600},{width:1280,height:800},{width:390,height:844}]){
    await page.setViewportSize(viewport);await draft.fill('A growing draft 中文\n'.repeat(8));
    await expect(draft).toBeFocused();await expect(draft).toHaveValue('A growing draft 中文\n'.repeat(8));
    const send=(await page.getByRole('button',{name:'Send draft',exact:true}).boundingBox())!;
    expect(send.y+send.height).toBeLessThanOrEqual(viewport.height);
    expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBe(viewport.height);
    expect(await page.getByRole('region',{name:'Long reading',exact:true}).evaluate(node=>node.scrollHeight>node.clientHeight&&node.clientHeight>0)).toBe(true);
  }
});
