import {expect, test} from '@playwright/test';

test.beforeEach(async ({page}) => {await page.goto('/tests/fixture.html');});

test('permission choice uses the shared popup, changes once and follows external availability', async ({page}) => {
  await page.evaluate(async () => {
    const {createPermissionControl} = await import('../src/tasks/permission.js');
    const state = {mode:'ask', description:'Ask before modifying files'};
    const block = createPermissionControl(state, {onChange(value) {document.body.dataset.permission = value; document.body.dataset.changes = String(Number(document.body.dataset.changes || 0) + 1);}});
    const disable = document.createElement('button'); disable.textContent = 'Disable permission'; disable.onclick = () => block.update({...state, mode:'workspace-write', disabled:true});
    document.body.append(block.element, disable);
  });
  const choice = page.getByRole('combobox', {name:'Conversation permissions'});
  await expect(choice).toHaveJSProperty('tagName', 'BUTTON');
  await choice.click();
  await page.getByRole('option', {name:'Allow workspace changes', exact:true}).click();
  await expect(choice).toContainText('Allow workspace changes');
  await expect(page.locator('body')).toHaveAttribute('data-permission', 'workspace-write');
  await expect(page.locator('body')).toHaveAttribute('data-changes', '1');
  await expect(page.getByRole('listbox')).toBeHidden();
  await page.getByRole('button', {name:'Disable permission'}).click();
  await expect(choice).toBeDisabled();
});

test('settings appearance and provider choices are enhanced before any draft read', async ({page}) => {
  await page.evaluate(async () => {
    const {createSettingsPanel} = await import('../src/forms/panels.js');
    const block = createSettingsPanel({baseUrl:'https://example.com/v1', hasApiKey:true}, {idPrefix:'settings-', onAppearanceChange(mode) {document.body.dataset.appearance = mode;}, onProviderChange(provider) {document.body.dataset.provider = provider;}});
    block.setProviders([{id:'first', name:'First provider'}, {id:'second', name:'<Second provider>'}], 'first');
    document.body.append(block.element);
  });
  const appearance = page.getByRole('combobox', {name:'Appearance', exact:true});
  const provider = page.getByRole('combobox', {name:'Provider', exact:true});
  await expect(appearance).toHaveJSProperty('tagName', 'BUTTON');
  await expect(provider).toHaveJSProperty('tagName', 'BUTTON');
  await appearance.click(); await page.getByRole('option', {name:'Dark', exact:true}).click();
  await expect(page.locator('body')).toHaveAttribute('data-appearance', 'dark');
  await provider.click(); await page.getByRole('option', {name:'<Second provider>', exact:true}).click();
  await expect(page.locator('body')).toHaveAttribute('data-provider', 'second');
  await expect(provider).toContainText('<Second provider>');
  await expect(page.locator('#settings-settings-provider')).toHaveValue('second');
});

test('MCP connection choice changes the owned fields without submitting and reset restores the visible value', async ({page}) => {
  await page.evaluate(async () => {
    const {createMCPConnectionsPanel} = await import('../src/forms/panels.js');
    const block = createMCPConnectionsPanel({}, {idPrefix:'', onSubmit:() => {document.body.dataset.submitted = 'true'; return {ok:true};}});
    const reset = document.createElement('button'); reset.textContent = 'Reset connection'; reset.onclick = () => block.edit();
    document.body.append(block.element, reset);
  });
  const choice = page.getByRole('combobox', {name:'Connection type', exact:true});
  await expect(choice).toHaveJSProperty('tagName', 'BUTTON');
  await choice.click(); await page.getByRole('option', {name:'Local command (stdio)', exact:true}).click();
  await expect(page.locator('#mcp-stdio-fields')).toBeVisible();
  await expect(page.locator('#mcp-http-fields')).toBeHidden();
  await expect(page.locator('body')).not.toHaveAttribute('data-submitted');
  await page.getByRole('button', {name:'Reset connection'}).click();
  await expect(choice).toContainText('HTTP');
  await expect(page.locator('#mcp-http-fields')).toBeVisible();
});

test('model provider and effort share popup choices while the model list remains a native listbox', async ({page}) => {
  await page.evaluate(async () => {
    const {createModelEditor} = await import('../src/forms/model-editor.js');
    const block = createModelEditor({providers:[{id:'one', name:'One'}, {id:'two', name:'Two'}], models:[{id:'balanced', name:'Balanced', provider:'one', supportsImages:true, contextWindow:128000, maxTokens:8192, thinkingLevels:['off','high']}, {id:'fast', name:'Fast', provider:'two', supportsImages:false, contextWindow:64000, maxTokens:4096, thinkingLevels:['off']}], selection:{provider:'one', model:'balanced', thinkingLevel:'high'}}, {prefix:'models', onChange(selection) {document.body.dataset.selection = JSON.stringify(selection);}});
    document.body.append(block.element);
  });
  const provider = page.getByRole('combobox', {name:'Provider', exact:true});
  const effort = page.getByRole('combobox', {name:'Thinking effort', exact:true});
  await expect(provider).toHaveJSProperty('tagName', 'BUTTON');
  await expect(effort).toHaveJSProperty('tagName', 'BUTTON');
  await expect(page.getByRole('listbox', {name:'Choose model'})).toHaveJSProperty('tagName', 'SELECT');
  await effort.click(); await page.getByRole('option', {name:'Thinking off', exact:true}).click();
  await expect(page.locator('#models-thinking')).toHaveValue('off');
  await provider.click(); await page.getByRole('option', {name:'Two', exact:true}).click();
  await expect(page.locator('#models-model')).toHaveValue('fast');
  await expect(effort).toBeHidden();
  await expect(page.locator('#models-capabilities')).toContainText('Text only');
  await expect(page.locator('body')).toHaveAttribute('data-selection', JSON.stringify({provider:'two', model:'fast', thinkingLevel:'off'}));
});

test('dynamic sign-in choice uses the shared field and destroys an open popup when the prompt changes', async ({page}) => {
  await page.evaluate(async () => {
    const {createProviderLoginPanel} = await import('../src/forms/provider-login.js');
    const block = createProviderLoginPanel({phase:'prompt', message:'Choose an account', prompt:'Account', options:[{id:'personal', label:'Personal'}, {id:'team', label:'Team'}]}, {idPrefix:'login-', onAnswer(answer) {document.body.dataset.answer = answer; return {ok:true};}});
    const advance = document.createElement('button'); advance.textContent = 'Next prompt'; advance.onclick = () => block.update({phase:'prompt', message:'Enter a code', prompt:'Verification code'});
    document.body.append(block.element, advance);
  });
  const choice = page.getByRole('combobox', {name:'Account', exact:true});
  await expect(choice).toHaveJSProperty('tagName', 'BUTTON');
  await choice.click(); await page.getByRole('option', {name:'Team', exact:true}).click();
  await page.getByRole('button', {name:'Continue', exact:true}).click();
  await expect(page.locator('body')).toHaveAttribute('data-answer', 'team');
  await choice.click(); await expect(page.getByRole('listbox')).toBeVisible();
  await page.getByRole('button', {name:'Next prompt', exact:true}).click();
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(page.getByRole('textbox', {name:'Verification code'})).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Enter a code');
});

test('sign-in feedback keeps status and error semantics across prompt updates', async ({page}) => {
  await page.evaluate(async () => {
    const {createProviderLoginPanel} = await import('../src/forms/provider-login.js');
    const block = createProviderLoginPanel({phase:'waiting', message:'Waiting for sign-in'});
    const fail = document.createElement('button'); fail.textContent = 'Fail sign-in'; fail.onclick = () => block.update({phase:'error', message:'Sign-in expired'});
    const retry = document.createElement('button'); retry.textContent = 'Await sign-in'; retry.onclick = () => block.update({phase:'waiting', message:'Waiting again'});
    document.body.append(block.element, fail, retry);
  });
  await expect(page.getByRole('status')).toHaveText('Waiting for sign-in');
  await page.getByRole('button', {name:'Fail sign-in'}).click();
  await expect(page.getByRole('alert').first()).toHaveText('Sign-in expired');
  await page.getByRole('button', {name:'Await sign-in'}).click();
  await expect(page.getByRole('status')).toHaveText('Waiting again');
});

test('independent connection protocol selection updates its draft without submitting', async ({page}) => {
  await page.evaluate(async () => {
    const {createCustomConnectionEditor} = await import('../src/forms/custom-connection.js');
    const block = createCustomConnectionEditor({name:'Custom', baseUrl:'https://example.com/v1', api:'openai-completions', editing:false, models:[]}, {idPrefix:'', onSubmit:() => {document.body.dataset.submitted = 'true'; return {ok:true};}});
    const read = document.createElement('button'); read.textContent = 'Read protocol'; read.onclick = () => {document.body.dataset.api = block.read().api;};
    document.body.append(block.element, read);
  });
  const choice = page.getByRole('combobox', {name:'API protocol', exact:true});
  await expect(choice).toHaveJSProperty('tagName', 'BUTTON');
  await choice.click(); await page.getByRole('option', {name:'anthropic-messages', exact:true}).click();
  await page.getByRole('button', {name:'Read protocol'}).click();
  await expect(page.locator('body')).toHaveAttribute('data-api', 'anthropic-messages');
  await expect(page.locator('body')).not.toHaveAttribute('data-submitted');
});

test('composer effort retains callbacks and reflects option refresh and collapsed availability', async ({page}) => {
  await page.evaluate(async () => {
    const {createComposerView} = await import('../src/workspace.js');
    const block = createComposerView({prefix:'composer-', onThinkingChange(value) {document.body.dataset.effort = value; document.body.dataset.changes = String(Number(document.body.dataset.changes || 0) + 1);}});
    block.update({thinking:{options:[{value:'off', label:'Off'}, {value:'high', label:'High'}], value:'high'}});
    const refresh = document.createElement('button'); refresh.textContent = 'Refresh effort'; refresh.onclick = () => block.update({thinking:{options:[{value:'medium', label:'Medium'}, {value:'high', label:'High effort'}], value:'medium'}});
    const single = document.createElement('button'); single.textContent = 'One effort'; single.onclick = () => block.update({thinking:{options:[{value:'off', label:'Off'}], value:'off'}});
    document.body.append(block.element, refresh, single);
  });
  const choice = page.getByRole('combobox', {name:'Thinking effort', exact:true});
  await expect(choice).toHaveJSProperty('tagName', 'BUTTON');
  await choice.click(); await page.getByRole('option', {name:'Off', exact:true}).click();
  await expect(page.locator('body')).toHaveAttribute('data-effort', 'off');
  await expect(page.locator('body')).toHaveAttribute('data-changes', '1');
  await page.getByRole('button', {name:'Refresh effort'}).click();
  await expect(choice).toContainText('Medium');
  await page.getByRole('button', {name:'One effort'}).click();
  await expect(choice).toBeHidden();
});
