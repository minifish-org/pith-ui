import {test, expect, type Locator, type Page} from '@playwright/test';

type Theme = 'light' | 'dark';
interface FocusPresentationFixture {
  updateComposer(): void;
  updateResource(): void;
  openEditor(): void;
  closeEditor(): void;
}
declare global {interface Window {focusPresentation: FocusPresentationFixture}}

// Compare to each control's own unfocused presentation: ordinary surface shadows,
// selected borders and warning/error colors are not focus feedback.
async function paint(locator: Locator) {
  return locator.evaluate(async node => {
    getComputedStyle(node).borderColor;
    await Promise.all(node.getAnimations().map(animation => animation.finished.catch(() => {})));
    const style = getComputedStyle(node);
    return {outline: style.outlineStyle, shadow: style.boxShadow, border: style.border,
      background: style.backgroundColor, color: style.color};
  });
}

async function blurAndLeave(page: Page): Promise<void> {
  await page.evaluate(() => {if (document.activeElement instanceof HTMLElement) document.activeElement.blur();});
  await page.mouse.move(1250, 780);
}

async function keyboardModality(page: Page): Promise<void> {await page.keyboard.press('Tab');}

async function mountStandalone(page: Page, theme: Theme): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async theme => {
    const ui = await import('../src/legacy.js'); ui.setAppearance(document.body, theme);
    document.body.style.display = 'grid'; document.body.style.gridTemplateColumns = 'repeat(3, 280px)';
    document.body.style.gap = '16px'; document.body.style.padding = '20px';
    const blocks = [ui.createButton({label:'Action'}), ui.createIconButton({label:'Icon action',icon:'plus'}),
      ui.createTextAction({label:'Text action'}), ui.createTextInput({label:'Text',value:'Draft 中文 text'}),
      ui.createSecretInput({label:'Secret',value:'Private value'}), ui.createSearchInput({label:'Search'}),
      ui.createNumberInput({label:'Number',value:'42'}), ui.createTextArea({label:'Multiline',value:'Draft 中文 text'}),
      ui.createCheckbox({label:'Enabled',checked:true}),
      ui.createSelect({label:'Choice',options:[{value:'a',label:'Alpha'},{value:'b',label:'Beta'}]}),
      ui.createSelect({label:'Multiple models',multiple:true,size:3,values:['b'],options:[{value:'a',label:'Alpha'},{value:'b',label:'Beta'},{value:'c',label:'Gamma'}]}),
      ui.createDisclosure({title:'Details',content:document.createTextNode('Existing details')})];
    document.body.append(...blocks.map(block=>block.element));
    const link = document.createElement('a'); link.href = '#target'; link.textContent = 'Read details';
    const editable = document.createElement('div'); editable.contentEditable = 'true'; editable.setAttribute('aria-label','Editable content'); editable.textContent = 'Editable 中文';
    const scope = document.createElement('section'); scope.className = 'pui'; scope.tabIndex = 0; scope.setAttribute('aria-label','Focusable scope'); scope.textContent = 'Scoped root';
    document.body.append(link,editable,scope);
  }, theme);
  // WebKit may retain detached listbox theme values until its first paint.
  // Measure the rendered unfocused control, preserving the first-focus check.
  await page.screenshot();
}

function standaloneTargets(page: Page): Locator[] {
  return [page.getByRole('button',{name:'Action',exact:true}),page.getByRole('button',{name:'Icon action',exact:true}),
    page.getByRole('button',{name:'Text action',exact:true}),page.getByRole('textbox',{name:'Text',exact:true}),
    page.getByLabel('Secret',{exact:true}),page.getByRole('searchbox',{name:'Search',exact:true}),
    page.getByRole('spinbutton',{name:'Number',exact:true}),page.getByRole('textbox',{name:'Multiline',exact:true}),
    page.getByRole('checkbox',{name:'Enabled',exact:true}),page.getByRole('combobox',{name:'Choice',exact:true}),
    page.getByRole('listbox',{name:'Multiple models',exact:true}),page.locator('summary'),
    page.getByRole('link',{name:'Read details',exact:true}),page.getByLabel('Editable content'),page.getByLabel('Focusable scope')];
}

for (const theme of ['light','dark'] as const) {
  for (const input of ['pointer','keyboard'] as const) {
    test(`${theme}: ${input} focus does not repaint standalone control families`,async ({page}) => {
      await mountStandalone(page,theme);
      for (const target of standaloneTargets(page)) {
        await blurAndLeave(page);
        // Click first, then compare the same business state without hover. This
        // keeps checkbox toggling and native multi-selection out of focus styling.
        if (input === 'pointer') {await target.click(); await blurAndLeave(page);}
        const before = await paint(target);
        if (input === 'keyboard') await keyboardModality(page);
        await target.focus(); await expect(target).toBeFocused();
        const after = await paint(target);
        const description=await target.evaluate(node=>node.outerHTML.slice(0,180));
        expect.soft(after.outline,description+' outline').toBe('none');
        expect.soft(after,description+' focus presentation').toEqual({...before,outline:'none'});
      }
      await expect(page.getByRole('checkbox',{name:'Enabled'})).toBeChecked({checked:input === 'keyboard'});
    });
  }

  test(`${theme}: composer and sidebar search retain their ordinary borders while actual input and selection survive`,async ({page}) => {
    await page.goto('/tests/fixture.html');
    await page.evaluate(async theme => {
      const ui = await import('../src/legacy.js'); ui.setAppearance(document.body,theme);
      const shell = ui.createWorkspaceShell({brand:document.createTextNode('Pith Desk')});
      shell.composer.update({model:{label:'DeepSeek V4.1 Flash',description:'Existing model'},thinking:{value:'max',options:[{value:'high',label:'High'},{value:'max',label:'Max'}]}});
      shell.composer.reset('Draft 中文 text'); document.body.append(shell.element);
      window.focusPresentation = {updateComposer(){shell.composer.update({model:{label:'DeepSeek V4.1 Flash',description:'Updated metadata'},thinking:{value:'max',options:[{value:'high',label:'High'},{value:'max',label:'Max'}]}});},updateResource(){},openEditor(){},closeEditor(){}};
    },theme);
    const input = page.getByRole('textbox',{name:'Message Pith',exact:true});
    const composer = page.locator('.pui-composer'),search = page.getByRole('searchbox',{name:'Search conversation titles'}),searchFrame = page.locator('.pui-history-search');
    await blurAndLeave(page);
    const inputBefore = await paint(input),composerBefore = await paint(composer),searchBefore = await paint(search),searchFrameBefore = await paint(searchFrame);
    for (const mode of ['pointer','keyboard'] as const) {
      if (mode === 'pointer') await input.click(); else {await keyboardModality(page);await input.focus();}
      await expect(input).toBeFocused(); await page.mouse.move(1250,780);
      expect.soft(await paint(input)).toEqual({...inputBefore,outline:'none'});
      expect.soft(await paint(composer)).toEqual(composerBefore);
      await input.evaluate((node:HTMLTextAreaElement)=>node.setSelectionRange(6,8));
      await page.evaluate(()=>window.focusPresentation.updateComposer());
      expect(await input.evaluate((node:HTMLTextAreaElement)=>({value:node.value,selection:[node.selectionStart,node.selectionEnd],focus:node===document.activeElement}))).toEqual({value:'Draft 中文 text',selection:[6,8],focus:true});
      if (mode === 'pointer') await search.click(); else {await keyboardModality(page);await search.focus();}
      await expect(search).toBeFocused(); await page.mouse.move(1250,780);
      expect.soft(await paint(search)).toEqual({...searchBefore,outline:'none'});
      expect.soft(await paint(searchFrame)).toEqual(searchFrameBefore);
    }
    await input.focus(); await input.evaluate((node:HTMLTextAreaElement)=>node.setSelectionRange(6,8)); await page.keyboard.type('world');
    await expect(input).toHaveValue('Draft world text');
    expect(await input.evaluate(node=>getComputedStyle(node).caretColor)).not.toBe('rgba(0, 0, 0, 0)');
    expect(await input.evaluate(node=>getComputedStyle(node).userSelect)).not.toBe('none');
  });

  test(`${theme}: permission warning, errors, selected navigation and drag feedback survive focus removal`,async ({page}) => {
    await page.goto('/tests/fixture.html');
    await page.evaluate(async theme => {
      const ui=await import('../src/legacy.js');ui.setAppearance(document.body,theme);
      const permission=ui.createPermissionControl({mode:'full-access',description:'Full access is enabled'});
      const invalid=ui.createTextInput({label:'Invalid endpoint',value:'Retained draft',error:'Connection failed'});
      const selected=ui.createListRow({title:'Current item',selected:true,actions:ui.createButton({label:'Selected action'}).element});
      const navigation=ui.createWorkspaceNavigation({groups:[{id:'w',name:'Project',path:'/project',expanded:true,selected:true,children:[{id:'c',title:'Current chat',active:true},{id:'other',title:'Other chat',active:false}]}],empty:null});
      const composer=ui.createComposerView();composer.element.classList.add('pui-drag-images');
      document.body.append(permission.element,invalid.element,selected.element,navigation.element,composer.element);
    },theme);
    const permission=page.locator('.pui-permission-control').first(),trigger=permission.getByRole('combobox'),invalid=page.getByRole('textbox',{name:'Invalid endpoint'}),selected=page.locator('.pui-list-row'),nav=page.locator('.pui-history-row.pui-active'),drag=page.locator('.pui-composer');
    await blurAndLeave(page);
    const permissionBefore=await paint(permission),triggerBefore=await paint(trigger),invalidBefore=await paint(invalid),selectedBefore=await paint(selected),navBefore=await paint(nav),dragBefore=await paint(drag);
    expect(permissionBefore.background).not.toBe('rgba(0, 0, 0, 0)');expect(dragBefore.outline).toBe('solid');
    await keyboardModality(page);await trigger.focus();
    expect.soft(await paint(trigger)).toEqual({...triggerBefore,outline:'none'});expect.soft(await paint(permission)).toEqual({...permissionBefore,outline:'none'});
    await invalid.focus();expect.soft(await paint(invalid)).toEqual({...invalidBefore,outline:'none'});await expect(invalid).toHaveAttribute('aria-invalid','true');await expect(page.getByText('Connection failed',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Selected action',exact:true}).focus();expect(await paint(selected)).toEqual(selectedBefore);
    await page.getByRole('button',{name:'Current chat',exact:true}).focus();expect(await paint(nav)).toEqual(navBefore);await expect(page.getByRole('button',{name:'Current chat',exact:true})).toHaveAttribute('aria-current','page');
    await page.getByRole('textbox',{name:'Message Pith'}).focus();expect(await paint(drag)).toEqual(dragBefore);
  });

  test(`${theme}: menus, popovers, disclosure and chat tab targets keep behavior and ordinary surface shadows`,async ({page}) => {
    await page.goto('/tests/fixture.html');
    await page.evaluate(async theme => {
      const ui=await import('../src/legacy.js');ui.setAppearance(document.body,theme);
      const menu=ui.createMenu({label:'Actions',items:[{id:'first',label:'First',onAction(){}},{id:'blocked',label:'Blocked',disabled:true,onAction(){}},{id:'last',label:'Last',onAction(){document.body.dataset.lastAction='true';}}]});
      const popover=ui.createPopover({label:'Details panel',content:ui.createTextInput({label:'Popover field'}).element});
      const disclosure=ui.createDisclosure({title:'Expand details',content:document.createTextNode('Expanded information')});
      const shell=ui.createWorkspaceShell({brand:document.createTextNode('Pith')});
      document.body.append(menu.element,popover.element,disclosure.element,shell.element);
    },theme);
    const actions=page.getByRole('button',{name:'Actions',exact:true});await actions.press('ArrowDown');
    const first=page.getByRole('menuitem',{name:'First',exact:true}),last=page.getByRole('menuitem',{name:'Last',exact:true});await expect(first).toBeFocused();
    const menuFrame=page.getByRole('region',{name:'Actions',exact:true});const menuShadow=(await paint(menuFrame)).shadow;expect(menuShadow).not.toBe('none');
    expect.soft((await paint(first)).outline).toBe('none');expect.soft((await paint(first)).shadow).toBe('none');
    await page.keyboard.press('ArrowDown');await expect(last).toBeFocused();expect.soft((await paint(last)).outline).toBe('none');expect((await paint(menuFrame)).shadow).toBe(menuShadow);
    await page.keyboard.press('Enter');await expect(page.locator('body')).toHaveAttribute('data-last-action','true');await expect(page.getByRole('menu')).toBeHidden();
    await actions.press('ArrowDown');await page.keyboard.press('Escape');await expect(actions).toBeFocused();await expect(page.getByRole('menu')).toBeHidden();
    const popoverTrigger=page.getByRole('button',{name:'Details panel',exact:true});await popoverTrigger.click();
    const field=page.getByRole('textbox',{name:'Popover field',exact:true}),panel=page.locator('.pui-popover-panel:visible');
    await page.mouse.move(1250,780);const panelBefore=await paint(panel),fieldBefore=await paint(field);expect(panelBefore.shadow).not.toBe('none');
    await keyboardModality(page);await field.focus();expect.soft(await paint(field)).toEqual({...fieldBefore,outline:'none'});expect(await paint(panel)).toEqual(panelBefore);
    await page.keyboard.press('Escape');await expect(popoverTrigger).toBeFocused();await expect(panel).toBeHidden();
    const summary=page.locator('.pui-disclosure > summary');await summary.focus();expect.soft((await paint(summary)).outline).toBe('none');await page.keyboard.press('Enter');await expect(page.getByText('Expanded information',{exact:true})).toBeVisible();
    const chat=page.locator('.pui-chat-scroll');await blurAndLeave(page);const chatBefore=await paint(chat);await keyboardModality(page);await chat.focus();await expect(chat).toBeFocused();expect.soft(await paint(chat)).toEqual({...chatBefore,outline:'none'});
  });

  test(`${theme}: resource and modal editors retain selection, input caret, focus restoration and their surface shadows`,async ({page}) => {
    await page.goto('/tests/fixture.html');
    await page.evaluate(async theme => {
      const ui=await import('../src/legacy.js');ui.setAppearance(document.body,theme);
      const state={workspaceId:'w',workspacePath:'/project',path:'/project/AGENTS.md',kind:'instructions',content:'Source 中文 draft',editable:true,workspaceBusy:false};
      const resource=ui.createResourceEditor(state);const host=document.createElement('section');host.className='pui-modal';host.append(resource.element);
      const opener=ui.createButton({label:'Open editor'});const editor=ui.createTextEditDialog({title:'Edit message'});
      document.body.append(opener.element,host);window.focusPresentation={updateComposer(){},updateResource(){resource.update({...state,error:'Save failed'});},openEditor(){editor.open({title:'Edit message',value:'Edited 中文 text'});},closeEditor(){editor.close();}};
    },theme);
    const source=page.locator('.pui-resource-editor textarea'),host=page.locator('.pui-modal');await blurAndLeave(page);const before=await paint(source),hostBefore=await paint(host);
    await keyboardModality(page);await source.focus();await source.evaluate((node:HTMLTextAreaElement)=>node.setSelectionRange(7,9));
    await page.evaluate(()=>window.focusPresentation.updateResource());expect.soft(await paint(source)).toEqual({...before,outline:'none'});expect(await paint(host)).toEqual(hostBefore);
    expect(await source.evaluate((node:HTMLTextAreaElement)=>({value:node.value,selection:[node.selectionStart,node.selectionEnd],focused:node===document.activeElement}))).toEqual({value:'Source 中文 draft',selection:[7,9],focused:true});
    const opener=page.getByRole('button',{name:'Open editor',exact:true});await opener.focus();await page.evaluate(()=>window.focusPresentation.openEditor());
    const dialog=page.getByRole('dialog'),draft=dialog.getByRole('textbox');await expect(draft).toBeFocused();const shadow=(await paint(dialog)).shadow;expect(shadow).not.toBe('none');
    await blurAndLeave(page);const draftBefore=await paint(draft),dialogBefore=await paint(dialog);await keyboardModality(page);await draft.focus();
    expect.soft(await paint(draft)).toEqual({...draftBefore,outline:'none'});expect(await paint(dialog)).toEqual(dialogBefore);
    await dialog.focus();await expect(dialog).toBeFocused();expect.soft(await paint(dialog)).toEqual({...dialogBefore,outline:'none'});await draft.focus();
    await draft.evaluate((node:HTMLTextAreaElement)=>node.setSelectionRange(7,9));await page.keyboard.type('world');await expect(draft).toHaveValue('Edited world text');
    await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(opener).toBeFocused();expect.soft((await paint(opener)).outline).toBe('none');
  });
}

test('forced colors do not reintroduce focus outlines or erase selected and error states',async ({page,browserName}) => {
  test.skip(browserName !== 'chromium','Playwright only emulates forced colors in Chromium.');
  await page.emulateMedia({forcedColors:'active'});await mountStandalone(page,'light');
  await page.evaluate(async ()=>{const ui=await import('../src/legacy.js');document.body.append(ui.createTextInput({label:'Invalid endpoint',error:'Connection failed'}).element);});
  await keyboardModality(page);
  for (const target of [...standaloneTargets(page),page.getByRole('textbox',{name:'Invalid endpoint'})]) {
    await blurAndLeave(page);const before=await paint(target);await target.focus();await expect(target).toBeFocused();
    const after=await paint(target);
    // Forced colors may remap borders to the system Highlight while focused.
    // Keep that browser/user preference; the library must not add a ring/glow.
    expect.soft({outline:after.outline,shadow:after.shadow,background:after.background,color:after.color}).toEqual({outline:'none',shadow:before.shadow,background:before.background,color:before.color});
  }
  await expect(page.getByRole('checkbox',{name:'Enabled'})).toBeChecked();await expect(page.getByRole('listbox',{name:'Multiple models'})).toHaveValues(['b']);
  await expect(page.getByRole('textbox',{name:'Invalid endpoint'})).toHaveAttribute('aria-invalid','true');await expect(page.getByText('Connection failed',{exact:true})).toBeVisible();
});

test('focus suppression is limited to the library scope',async ({page}) => {
  await page.goto('/tests/fixture.html');await page.evaluate(()=>{
    document.body.classList.remove('pui');const outside=document.createElement('button');outside.textContent='Outside';
    const scope=document.createElement('section');scope.className='pui';scope.innerHTML='<button>Inside</button>';document.body.append(outside,scope);
  });
  await keyboardModality(page);const outside=page.getByRole('button',{name:'Outside',exact:true});await outside.focus();await expect(outside).toBeFocused();await expect(outside).not.toHaveCSS('outline-style','none');
  const inside=page.getByRole('button',{name:'Inside',exact:true});await inside.focus();await expect(inside).toBeFocused();expect((await paint(inside)).outline).toBe('none');
});
