import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => { await page.goto('/tests/fixture.html'); });
test('settings semantic API preserves native validation, credential drafts and selection during feedback', async ({ page }) => {
    const result = await page.evaluate(async () => {
        const { createSettingsPanel } = await import('../src/forms/panels.js');
        const state = { baseUrl: 'https://example.com/v1', hasApiKey: false, ready: true };
        const block = createSettingsPanel(state);
        document.body.append(block.element);
        block.setProviders([{ id: 'provider', name: 'Provider' }], 'provider');
        block.resetProvider({ provider: 'provider', baseUrl: 'https://example.com/v1' });
        block.setCredential({ status: 'Not configured', hidden: false, required: true, placeholder: 'API key', removeVisible: false });
        const key = block.element.querySelector<HTMLInputElement>('input[type=password]')!, url = block.element.querySelector<HTMLInputElement>('input[type=url]')!;
        key.value = 'Unsaved 中文 key';
        key.focus();
        key.setSelectionRange(2, 8);
        block.update({ ...state, disabled: true, error: 'Save failed' });
        const retained = { draft: block.read(), sameFocus: document.activeElement === key, selection: [key.selectionStart, key.selectionEnd], disabled: block.element.querySelector<HTMLButtonElement>('[type=submit]')!.disabled };
        url.value = 'invalid';
        const valid = url.checkValidity(), advanced = block.element.querySelector<HTMLDetailsElement>('details')!.open;
        const keyRequired = key.required;
        block.clearSecrets();
        const cleared = key.value;
        block.destroy();
        return { ...retained, valid, advanced, keyRequired, cleared };
    });
    expect(result).toEqual({ draft: { provider: 'provider', baseUrl: 'https://example.com/v1', apiKey: 'Unsaved 中文 key' }, sameFocus: true, selection: [2, 8], disabled: true, valid: false, advanced: true, keyRequired: true, cleared: '' });
});
test('settings pending merges external availability, rejects repeats and keeps a failed draft', async ({ page }) => {
    await page.evaluate(async () => {
        const { createSettingsPanel } = await import('../src/forms/panels.js');
        const state = { baseUrl: 'https://example.com/v1', hasApiKey: true, ready: true };
        let calls = 0;
        const block = createSettingsPanel(state, { onSubmit: async (draft) => { document.body.dataset.draft = JSON.stringify(draft); document.body.dataset.calls = String(++calls); return await new Promise(resolve => { (window as unknown as {
                finish: () => void;
            }).finish = () => { block.update({ ...state, disabled: true }); resolve({ ok: false, error: 'Rejected' }); }; }); } });
        block.setProviders([{ id: 'provider', name: 'Provider' }]);
        document.body.append(block.element);
        const key = block.element.querySelector<HTMLInputElement>('input[type=password]')!;
        key.value = 'private draft';
    });
    const submit = page.getByRole('button', { name: 'Save settings' });
    await submit.click();
    await expect(submit).toBeDisabled();
    await page.evaluate(() => { const form = document.querySelector('form')!; form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    await expect(page.locator('body')).toHaveAttribute('data-calls', '1');
    await page.evaluate(() => { (window as unknown as {
        finish: () => void;
    }).finish(); });
    await expect(page.locator('[data-dialog-error]')).toHaveText('Rejected');
    await expect(submit).toBeDisabled();
    await expect(page.locator('input[type=password]')).toHaveValue('private draft');
});

test('resetting a provider invalidates its old submission and preserves the next draft',async ({page})=>{
    const result = await page.evaluate(async()=>{
        const {createSettingsPanel}=await import('../src/forms/panels.js');
        let release!:(result:{ok:false;error:string})=>void;
        const block=createSettingsPanel({baseUrl:'https://a.example',hasApiKey:true,ready:true},{onSubmit:()=>new Promise(resolve=>{release=resolve;})});
        block.setProviders([{id:'a',name:'A'},{id:'b',name:'B'}],'a');document.body.append(block.element);
        block.element.querySelector<HTMLFormElement>('form')!.requestSubmit();
        block.resetProvider({provider:'b',baseUrl:'https://b.example',clearKey:true});
        const key=block.element.querySelector<HTMLInputElement>('input[type=password]')!;key.value='B 中文 draft';key.focus();key.setSelectionRange(2,6);
        release({ok:false,error:'Old A error'});await new Promise(resolve=>setTimeout(resolve,0));
        const result={draft:block.read(),error:block.element.querySelector('[data-dialog-error]')!.textContent,focused:document.activeElement===key,selection:[key.selectionStart,key.selectionEnd],enabled:!block.element.querySelector<HTMLButtonElement>('[type=submit]')!.disabled};
        block.destroy();return result;
    });
    expect(result).toEqual({draft:{provider:'b',baseUrl:'https://b.example',apiKey:'B 中文 draft'},error:'',focused:true,selection:[2,6],enabled:true});
});
test('MCP read and explicit edit isolate late results, retain JSON and clear credentials', async ({ page }) => {
    await page.evaluate(async () => {
        const { createMCPConnectionsPanel } = await import('../src/forms/panels.js');
        let count = 0;
        const block = createMCPConnectionsPanel({}, { onSubmit: async (draft) => { document.body.dataset.draft = JSON.stringify(draft); document.body.dataset.calls = String(++count); return await new Promise(resolve => { (window as unknown as {
                finish: () => void;
            }).finish = () => resolve({ ok: false, error: 'Old error' }); }); } });
        document.body.append(block.element);
        block.edit({ name: 'tools', type: 'stdio', command: '/usr/bin/demo', args: ['one'], envKeys: ['KEY'] });
        const env = block.element.querySelector<HTMLTextAreaElement>('[name=env]')!;
        env.value = '{"KEY":"private"}';
        (window as unknown as {
            reset: () => void;
        }).reset = () => block.edit({ name: 'new-target', type: 'http', url: 'https://example.com/mcp' });
    });
    await page.getByRole('button', { name: 'Save connection' }).click();
    await expect(page.getByRole('button', { name: 'Save connection' })).toBeDisabled();
    const draft = JSON.parse(await page.locator('body').getAttribute('data-draft') || '{}');
    expect(draft).toMatchObject({ name: 'tools', type: 'stdio', args: '[\n  "one"\n]', env: '{"KEY":"private"}' });
    await page.evaluate(() => { (window as unknown as {
        reset: () => void;
        finish: () => void;
    }).reset(); (window as unknown as {
        finish: () => void;
    }).finish(); });
    await expect(page.locator('input[name=name]')).toHaveValue('new-target');
    await expect(page.locator('textarea[name=env]')).toHaveValue('');
    await expect(page.locator('[id$=mcp-form-error]')).toHaveText('');
    await expect(page.getByRole('button', { name: 'Save connection' })).toBeEnabled();
});
test('model picker owns the model editor and catalog feedback preserves user choice and search', async ({ page }) => {
    await page.evaluate(async () => {
        const { createModelPicker } = await import('../src/forms/panels.js');
        const editor = { providers: [{ id: 'provider', name: 'Provider', model: 'balanced', thinkingLevel: 'high' }], models: [{ id: 'balanced', name: 'Balanced', provider: 'provider', supportsImages: true, contextWindow: 128000, maxTokens: 8192, thinkingLevels: ['off', 'high'] }, { id: 'fast', name: 'Fast', provider: 'provider', supportsImages: false, contextWindow: 64000, maxTokens: 4096, thinkingLevels: ['off'] }], selection: { provider: 'provider', model: 'balanced', thinkingLevel: 'high' } };
        const state = { editor, loading: false };
        const block = createModelPicker(state, { onSubmit: selection => { document.body.dataset.selection = JSON.stringify(selection); return { ok: true }; } });
        document.body.append(block.element);
        (window as unknown as {
            refresh: () => void;
        }).refresh = () => block.update({ ...state, editor: { ...editor, models: editor.models.map(model => ({ ...model, maxTokens: model.maxTokens + 1 })) }, error: 'Catalog feedback' });
    });
    const model = page.locator('[id$=picker-model]'), search = page.getByRole('searchbox');
    await model.selectOption('fast');
    await search.fill('absent');
    await search.focus();
    await page.evaluate(() => { (window as unknown as {
        refresh: () => void;
    }).refresh(); });
    await expect(model).toHaveValue('fast');
    await expect(search).toHaveValue('absent');
    await expect(search).toBeFocused();
    await expect(page.getByRole('combobox', { name: 'Thinking effort', exact: true })).toBeHidden();
    await page.getByRole('button', { name: 'Use model' }).click();
    expect(JSON.parse(await page.locator('body').getAttribute('data-selection') || '{}')).toEqual({ provider: 'provider', model: 'fast', thinkingLevel: 'off' });
});
test('connection editor composes keyed model rows with stable source indices and native price limits', async ({ page }) => {
    const result = await page.evaluate(async () => {
        const { createCustomConnectionEditor } = await import('../src/forms/custom-connection.js');
        const state = { name: 'Custom', baseUrl: 'https://example.com', api: 'openai-completions', editing: true, models: [{ id: 'one', contextWindow: 128000, maxTokens: 8192, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }, { id: 'two', contextWindow: 64000, maxTokens: 4096 }] };
        const block = createCustomConnectionEditor(state);
        document.body.append(block.element);
        const second = block.element.querySelectorAll('fieldset')[1], input = second.querySelector<HTMLInputElement>('[name=name]')!;
        input.value = 'Edited 中文';
        input.focus();
        input.setSelectionRange(2, 5);
        block.element.querySelector<HTMLButtonElement>('[data-remove-model]')!.click();
        block.element.querySelector<HTMLButtonElement>('[id$=add-custom-model]')!.click();
        block.update({ ...state, error: 'Save failed' });
        const retained = { sameRow: block.element.querySelector('fieldset') === second, sameFocus: document.activeElement === input, selection: [input.selectionStart, input.selectionEnd], indices: block.read().models.map(row => row.sourceIndex), name: block.read().models[0].name };
        const context = second.querySelector<HTMLInputElement>('[name=contextWindow]')!;
        context.value = '0';
        const contextValid = context.checkValidity();
        const price = second.querySelector<HTMLInputElement>('[name=price-input]')!;
        price.value = '-1';
        const priceValid = price.checkValidity();
        block.destroy();
        return { ...retained, contextValid, priceValid };
    });
    expect(result).toEqual({ sameRow: true, sameFocus: true, selection: [2, 5], indices: [1, 2], name: 'Edited 中文', contextValid: false, priceValid: false });
});
test('resource semantic callbacks validate names and ignore feedback after destruction', async ({ page }) => {
    await page.evaluate(async () => {
        const { createResourceEditor } = await import('../src/forms/resource-editor.js');
        const state = { workspaceId: 'w', workspacePath: '/demo', kind: 'skill', content: 'Initial', editable: true, workspaceBusy: false };
        const block = createResourceEditor(state, { onSubmit: async (draft) => { document.body.dataset.draft = JSON.stringify(draft); return await new Promise(resolve => { (window as unknown as {
                finish: () => void;
            }).finish = () => { block.destroy(); resolve({ ok: false, error: 'Late error' }); }; }); } });
        document.body.append(block.element);
    });
    await page.locator('input').fill('bad name');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    expect(await page.locator('body').getAttribute('data-draft')).toBeNull();
    await page.locator('input').fill('good-name');
    await page.locator('textarea').fill('Unsaved 中文');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    expect(JSON.parse(await page.locator('body').getAttribute('data-draft') || '{}')).toEqual({ name: 'good-name', content: 'Unsaved 中文' });
    await page.evaluate(() => { (window as unknown as {
        finish: () => void;
    }).finish(); });
    await expect(page.locator('.pui-resource-editor')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('Late error');
});
