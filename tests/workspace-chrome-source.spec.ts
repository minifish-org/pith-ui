import {test, expect, type Page} from '@playwright/test';

// Source of truth: accepted0.3.1 styles471–487/659/664/818–826/833–834,
// confirmed against archived52c0d4d production at1280 and560 in both engines.
// Native select widths are compared with isolated source-styled native controls,
// so platform-specific font/select metrics remain native instead of tolerated.
async function openParts(page: Page, appearance: 'light' | 'dark', width: number) {
  await page.setViewportSize({width, height: 800});
  await page.goto('/tests/fixture.html');
  await page.evaluate(async appearance => {
    const ui = await import('../src/index.js');
    const options = [{value: 'ask', label: 'Ask before changes'}, {value: 'workspace-write', label: 'Allow workspace changes'}, {value: 'full-access', label: 'Full access'}];
    const effortOptions = ['off', 'high', 'max'].map(value => ({value, label: 'Thinking: ' + value}));
    const attach = ui.createIconButton({context: 'inline', icon: 'image', label: 'Attach images', title: 'Attach images'});
    const permission = ui.createSelect({context: 'inline', icon: 'shield', tone: 'warning', label: 'Conversation permissions', description: 'Permission description', options, value: 'full-access'});
    const model = ui.createTextAction({context: 'inline', label: 'DeepSeek V4.1 Flash', accessibleLabel: 'Choose model', title: 'custom-test / test'});
    const thinking = ui.createSelect({context: 'inline', label: 'Thinking effort', options: effortOptions, value: 'high'});
    const send = ui.createIconButton({context: 'inline', icon: 'arrow', intent: 'primary', label: 'Send message', title: 'Send message', onAction: () => new Promise(resolve => Reflect.set(window, 'finishSend', resolve))});
    const composer = ui.createSurface({label: 'Message composer', content: ui.createPromptInput({label: 'Message', value: 'Retained draft'}),
      footer: ui.createToolbar({label: 'Message actions', leading: ui.createActions({align: 'start', children: [attach, permission]}),
        trailing: ui.createActions({children: [model, ui.createSlot({content: thinking}), send]})})});
    const compact = ui.createTextAction({context: 'inline', label: 'Compact', accessibleLabel: 'Compress context', icon: 'compress', title: 'Compress context by summarizing older messages'});
    const files = ui.createPopover({purpose: 'inspector', context: 'inline', icon: 'file', label: 'Conversation files (1)', triggerLabel: '1', content: ui.createText({text: 'Simulated files'})});
    const sidebar = ui.createPane({purpose: 'navigation', header: ui.createStack({children: [ui.createText({text: 'Brand placeholder'}),
      ui.createToolbar({label: 'Workspaces', leading: ui.createText({role: 'label', text: 'WORKSPACES'}), trailing: ui.createIconButton({context: 'inline', icon: 'plus', label: 'Manage workspaces'})}),
      ui.createSearchInput({context: 'navigation', label: 'Search conversation titles', placeholder: 'Search conversations'})]}),
      content: ui.createText({text: 'Navigation content'}), footer: ui.createStack({context: 'flow', children: [ui.createTextAction({context: 'navigation', icon: 'settings', label: 'Settings'}), ui.createNotice({presentation: 'inline', message: 'Reconnecting…', tone: 'info'})]})});
    const main = ui.createPane({purpose: 'conversation', header: ui.createToolbar({label: 'Conversation navigation', leading: ui.createActions({align: 'start', children: [ui.createIconButton({context: 'navigation-toggle', icon: 'menu', label: 'Open sidebar'}), ui.createText({text: 'Location'})]}), trailing: ui.createActions({children: [compact, files]})}),
      content: ui.createText({text: 'Reading content'}), footer: ui.createContentColumn({purpose: 'input', content: ui.createStack({context: 'flow', children: [composer]})})});
    ui.mount(document.body, ui.createSplitPane({navigation: sidebar, content: main}), {appearance, viewport: 'window'});
    Reflect.set(window, 'chromeSource', {permission, model, thinking, attach, send, files, options, effortOptions});
  }, appearance);
  await page.mouse.move(1, 1);
}

for (const appearance of ['light', 'dark'] as const) for (const width of [1280, 560]) {
  test(`input footer retains source groups, colors and geometry: ${appearance} ${width}`, async ({page}) => {
    await openParts(page, appearance, width);
    const toolbar = page.getByRole('toolbar', {name: 'Message actions', exact: true});
    await expect(toolbar).toHaveCSS('gap', '12px');
    await expect(toolbar).toHaveCSS('align-items', width <= 720 ? 'flex-end' : 'center');
    await expect(toolbar.locator('.pui-toolbar-leading>.pui-actions')).toHaveCSS('gap', '8px');
    await expect(toolbar.locator('.pui-toolbar-trailing>.pui-actions')).toHaveCSS('gap', '12px');
    await expect(toolbar.locator('.pui-toolbar-trailing>.pui-actions')).toHaveCSS('flex-wrap', 'nowrap');
    if (width <= 720) {
      const toggle = page.getByRole('button', {name: 'Open sidebar', exact: true});
      await expect(toggle).toHaveCSS('width', '27px');
      await expect(toggle).toHaveCSS('height', '27px');
      await expect(toggle).toHaveCSS('border-top-width', '0px');
      await expect(toggle.locator('svg')).toHaveCSS('width', '19px');
    }
    const attach = page.getByRole('button', {name: 'Attach images', exact: true});
    await expect(attach).toHaveCSS('width', '27px');
    await expect(attach).toHaveCSS('height', '27px');
    await expect(attach).toHaveCSS('padding', '4px');
    await expect(attach).toHaveCSS('border-top-width', '0px');
    await expect(attach).toHaveCSS('border-radius', '6px');
    await expect(attach).toHaveCSS('font-size', '14px');
    await expect(attach).toHaveAttribute('title', 'Attach images');
    const send = page.getByRole('button', {name: 'Send message', exact: true});
    await expect(send).toHaveCSS('width', '32px');
    await expect(send).toHaveCSS('height', '32px');
    await expect(send).toHaveCSS('border-top-width', '0px');
    await expect(send).toHaveCSS('border-radius', '9px');
    await expect(send).toHaveCSS('font-size', '14px');
    await expect(send).toHaveCSS('color', appearance === 'light' ? 'rgb(255, 255, 255)' : 'rgb(23, 36, 53)');
    await expect(send).toHaveAttribute('title', 'Send message');
    const model = page.getByRole('button', {name: 'Choose model', exact: true});
    await expect(model).toHaveCSS('height', '34px');
    await expect(model).toHaveCSS('padding', '8px');
    await expect(model).toHaveCSS('border-radius', '0px');
    await expect(model).toHaveCSS('border-top-width', '0px');
    await expect(model).toHaveCSS('font-size', '12px');
    await expect(model).toHaveCSS('line-height', '18px');
    await expect(model).toHaveCSS('max-width', width <= 900 ? '125px' : '190px');
    await expect(model).toHaveCSS('color', appearance === 'light' ? 'rgb(93, 103, 122)' : 'rgb(158, 165, 175)');
    await model.hover();
    await expect(model).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(model).toHaveCSS('color', appearance === 'light' ? 'rgb(31, 37, 48)' : 'rgb(240, 241, 243)');
    await page.mouse.move(1, 1);
    const permission = page.getByRole('combobox', {name: 'Conversation permissions', exact: true});
    const frame = permission.locator('xpath=ancestor::*[contains(concat(" ",normalize-space(@class)," ")," pui-inline-choice ")][1]');
    await expect(frame).toHaveCSS('height', '36px');
    await expect(frame).toHaveCSS('padding', '8px');
    await expect(frame).toHaveCSS('border-radius', '6px');
    await expect(frame).toHaveCSS('border-top-width', '1px');
    await expect(frame.locator('.pui-inline-choice-icon svg')).toHaveCSS('width', '12px');
    await expect(permission).toHaveCSS('padding', '0px 16px 0px 0px');
    await expect(permission.locator('.pui-select-arrow')).toHaveCSS('width', '10px');
    await expect(permission).toHaveCSS('color', appearance === 'light' ? 'rgb(138, 87, 10)' : 'rgb(233, 195, 123)');
    await expect(frame).toHaveCSS('background-color', appearance === 'light' ? 'rgb(255, 244, 221)' : 'rgb(50, 41, 29)');
    await expect(permission).toHaveAccessibleDescription('Permission description');
    await page.evaluate(() => {const f = Reflect.get(window, 'chromeSource'); f.permission.update({label: 'Conversation permissions', options: f.options}); f.permission.reset('ask');});
    await expect(frame).toHaveCSS('color', appearance === 'light' ? 'rgb(93, 103, 122)' : 'rgb(158, 165, 175)');
    const effort = page.getByRole('combobox', {name: 'Thinking effort', exact: true});
    await expect(effort).toHaveCSS('height', '34px');
    await expect(effort).toHaveCSS('padding', '8px 4px');
    await expect(effort).toHaveCSS('border-radius', '8px');
    await expect(effort).toHaveCSS('color', appearance === 'light' ? 'rgb(93, 103, 122)' : 'rgb(158, 165, 175)');
    const native = await page.evaluate(width => {
      const iframe = document.createElement('iframe'); document.body.append(iframe);
      try {
        const doc = iframe.contentDocument!, make = (labels: string[], style: string) => {
          const node = doc.createElement('select');
          node.style.cssText = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;line-height:18px;font-weight:400;box-sizing:border-box;border:0;" + style;
          labels.forEach(text => {const option = doc.createElement('option'); option.textContent = text; node.append(option);});
          doc.body.append(node); return node.getBoundingClientRect().width;
        };
        return {permission: make(['Ask before changes', 'Allow workspace changes', 'Full access'], `appearance:none;max-width:${width <= 720 ? 150 : 180}px;padding:0 16px 0 0;`), effort: make(['Thinking: off', 'Thinking: high', 'Thinking: max'], 'max-width:132px;padding:8px 4px;')};
      } finally {iframe.remove();}
    }, width);
    expect((await permission.boundingBox())!.width).toBe(native.permission);
    expect((await frame.boundingBox())!.width).toBe(native.permission + 40);
    expect((await effort.boundingBox())!.width).toBe(native.effort);
  });
}

test('input footer pending and disabled states keep business feedback and the current action tooltip', async ({page}) => {
  await openParts(page, 'light', 1280);
  const send = page.getByRole('button', {name: 'Send message', exact: true});
  await send.click();
  await expect(send).toBeDisabled();
  await expect(send).toHaveAttribute('aria-busy', 'true');
  await expect(send).toHaveCSS('opacity', '0.7');
  await expect(send).toHaveCSS('background-color', 'rgb(240, 242, 246)');
  await expect(send).toHaveCSS('color', 'rgb(93, 103, 122)');
  await expect(send).toHaveAttribute('title', 'Send message');
  await page.evaluate(() => Reflect.get(window, 'finishSend')({ok: true}));
  await expect(send).toBeEnabled();
  await page.evaluate(() => {const f = Reflect.get(window, 'chromeSource'); f.send.update({label: 'Stop agent', title: 'Stop agent', icon: 'stop', intent: 'primary'}); f.attach.update({label: 'Attach images', title: 'Attach images', icon: 'image', disabled: true}); f.model.update({label: 'DeepSeek V4.1 Flash', accessibleLabel: 'Choose model', title: 'custom-test / test', disabled: true});});
  const stop = page.getByRole('button', {name: 'Stop agent', exact: true});
  await expect(stop).toHaveAttribute('title', 'Stop agent');
  await expect(stop.locator('rect')).toHaveAttribute('fill', 'currentColor');
  await expect(page.getByRole('button', {name: 'Attach images', exact: true})).toHaveCSS('opacity', '0.45');
  await expect(page.getByRole('button', {name: 'Choose model', exact: true})).toHaveCSS('opacity', '0.45');
});

for (const appearance of ['light', 'dark'] as const) {
  test(`navigation and conversation chrome preserve source contexts without changing standalone controls: ${appearance}`, async ({page}) => {
    await openParts(page, appearance, 1280);
    const label = page.getByText('WORKSPACES', {exact: true});
    await expect(label).toHaveCSS('color', appearance === 'light' ? 'rgb(93, 103, 122)' : 'rgb(158, 165, 175)');
    await expect(page.locator('.pui-search-navigation')).toHaveCSS('margin-bottom', '12px');
    expect(await page.locator('.pui-pane-navigation>.pui-pane-footer .pui-notice-inline').evaluate(node => {const css=getComputedStyle(node,'::before');return {width:css.width,height:css.height};})).toEqual({width:'5px',height:'5px'});
    const settings = page.getByRole('button', {name: 'Settings', exact: true});
    await expect(settings).toHaveCSS('height', '37px');
    await expect(settings).toHaveCSS('border-top-width', '0px');
    await expect(settings).toHaveCSS('border-radius', '7px');
    await settings.hover();
    await expect(settings).toHaveCSS('color', appearance === 'light' ? 'rgb(31, 37, 48)' : 'rgb(240, 241, 243)');
    const compact = page.getByRole('button', {name: 'Compress context', exact: true});
    await expect(compact).toHaveCSS('height', '30px');
    await expect(compact).toHaveCSS('border-top-width', '0px');
    await expect(compact).toHaveCSS('border-radius', '6px');
    await expect(compact.locator('svg')).toHaveCSS('width', '19px');
    const files = page.getByRole('button', {name: 'Conversation files (1)', exact: true});
    await expect(files).toHaveCSS('height', '36px');
    await expect(files).toHaveCSS('min-width', '36px');
    await expect(files).toHaveCSS('padding', '8px');
    await expect(files).toHaveCSS('border-top-width', '0px');
    await expect(files).toHaveCSS('border-radius', '9px');
    await expect(files.locator('svg')).toHaveCSS('width', '19px');
    await expect(files.locator('span')).toHaveCSS('font-size', '12px');
    await expect(files.locator('span')).toHaveCSS('font-weight', '600');
    await expect(files).toHaveAttribute('title', 'Conversation files (1)');
    await files.click();
    await expect(files).toHaveAttribute('aria-expanded', 'true');
    await expect(files).toHaveAttribute('title', 'Conversation files (1)');
    await expect(files).toHaveCSS('background-color', appearance === 'light' ? 'rgb(224, 229, 238)' : 'rgb(45, 50, 58)');
    await expect(files).toHaveCSS('color', appearance === 'light' ? 'rgb(31, 37, 48)' : 'rgb(240, 241, 243)');
    await files.press('Escape');
    await page.evaluate(async appearance => {
      const ui = await import('../src/index.js'), host = document.createElement('div'); document.body.append(host);
      ui.mount(host, ui.createStack({children: [ui.createText({role: 'label', text: 'Standalone label'}), ui.createTextAction({context: 'inline', label: 'Standalone action', icon: 'compress'})]}), {appearance});
    }, appearance);
    await expect(page.getByText('Standalone label', {exact: true})).toHaveCSS('color', appearance === 'light' ? 'rgb(102, 112, 133)' : 'rgb(158, 165, 175)');
    await expect(page.getByRole('button', {name: 'Standalone action', exact: true})).toHaveCSS('min-height', '32px');
    await expect(page.getByRole('button', {name: 'Standalone action', exact: true}).locator('svg')).toHaveCSS('width', '19px');
  });
}

test('inspector tooltips follow their current safe label while ordinary popovers keep their default', async ({page}) => {
  await openParts(page, 'light', 1280);
  await page.evaluate(async () => {
    const ui = await import('../src/index.js'), host = document.createElement('div'); document.body.append(host);
    ui.mount(host, ui.createPopover({label: 'Ordinary panel', content: ui.createText({text: 'Content'})}));
    Reflect.get(window, 'chromeSource').files.update({label: 'Conversation files are unavailable', triggerLabel: '1', icon: 'file'});
  });
  await expect(page.getByRole('button', {name: 'Conversation files are unavailable', exact: true})).toHaveAttribute('title', 'Conversation files are unavailable');
  await page.getByRole('button', {name: 'Conversation files are unavailable', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Conversation files are unavailable', exact: true})).toHaveAttribute('title', 'Conversation files are unavailable');
  await expect(page.getByRole('button', {name: 'Ordinary panel', exact: true})).toHaveAttribute('title', '');
});

test('input footer rules do not change a notice footer or an ordinary inline icon button', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const ui = await import('../src/index.js');
    ui.mount(document.body, ui.createSurface({purpose:'notice', content:ui.createText({text:'Notice'}), footer:ui.createToolbar({label:'Notice actions',leading:ui.createIconButton({context:'inline',icon:'image',label:'Notice image'})})}));
  });
  const button=page.getByRole('button',{name:'Notice image',exact:true});
  await expect(button).toHaveCSS('width','32px');
  await expect(button).toHaveCSS('height','32px');
  await expect(button.locator('svg')).toHaveCSS('width','17px');
});

test('mounted warning descendants follow initial, explicit and system themes without replacing input state', async ({page}) => {
  await page.emulateMedia({colorScheme:'light'});
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const ui=await import('../src/index.js');
    const input=ui.createTextInput({label:'Theme draft',value:'Retained draft'});
    const choice=ui.createSelect({label:'Theme permission',context:'inline',icon:'shield',tone:'warning',options:[{value:'full',label:'Full access'}]});
    const notice=ui.createNotice({tone:'warning',message:'Warning feedback'});
    const surface=ui.createSurface({purpose:'notice',tone:'warning',content:ui.createText({text:'Warning surface'})});
    const owner=ui.mount(document.body,ui.createStack({children:[input,choice,notice,surface]}),{appearance:'dark'});
    Reflect.set(window,'themeOwner',owner);
  });
  const input=page.getByRole('textbox',{name:'Theme draft',exact:true});
  await input.focus();await input.evaluate(node=>(node as HTMLInputElement).setSelectionRange(2,8));
  const retained=await input.elementHandle();
  const check=async(dark:boolean)=>{
    const color=dark?'rgb(50, 41, 29)':'rgb(255, 244, 221)';
    for(const node of [page.locator('.pui-choice-warning'),page.locator('.pui-notice-warning'),page.locator('.pui-surface-warning')])await expect(node).toHaveCSS('background-color',color);
    await expect(input).toBeFocused();await expect(input).toHaveValue('Retained draft');
    expect(await input.evaluate(node=>[(node as HTMLInputElement).selectionStart,(node as HTMLInputElement).selectionEnd])).toEqual([2,8]);
    expect(await retained!.evaluate(node=>node===document.querySelector('input'))).toBe(true);
  };
  await check(true);
  await page.evaluate(()=>Reflect.get(window,'themeOwner').setAppearance('light'));await check(false);
  await page.evaluate(()=>Reflect.get(window,'themeOwner').setAppearance('dark'));await check(true);
  await page.emulateMedia({colorScheme:'dark'});
  await page.evaluate(()=>Reflect.get(window,'themeOwner').setAppearance('system'));await check(true);
  await page.emulateMedia({colorScheme:'light'});await check(false);
  await page.emulateMedia({colorScheme:'dark'});await check(true);
});
