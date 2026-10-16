import {expect, test} from '@playwright/test';

test.beforeEach(async ({page}) => {await page.goto('/tests/fixture.html');});

test('resource snapshots retain the exact expanded row, selection, scroll and focus', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {createResourcesPanel} = await import('../src/files/panels.js');
    const panel = createResourcesPanel(); document.body.append(panel.element); panel.open('Workspace');
    const entry = {name:'AGENTS.md', path:'/demo/AGENTS.md', content:'Long instructions 中文\n'.repeat(100)};
    const state = {instructions:[entry], skills:[], templates:[], diagnostics:[]}; panel.update(state);
    const row = panel.element.querySelector('article')!, details = row.querySelector('details')!;
    details.open = true; const summary = details.querySelector('summary')!; summary.focus();
    const pre = details.querySelector('pre')!; pre.scrollTop = 150;
    const range = document.createRange(); range.setStart(pre.firstChild!, 0); range.setEnd(pre.firstChild!, 4);
    document.getSelection()!.removeAllRanges(); document.getSelection()!.addRange(range);
    const before = {selection:document.getSelection()!.toString(), scroll:pre.scrollTop};
    panel.update(state);
    const unchanged = {sameRow:row === panel.element.querySelector('article'), sameDetails:details === panel.element.querySelector('details'), open:details.isConnected && details.open, focused:document.activeElement === summary, selection:document.getSelection()!.toString(), scroll:panel.element.querySelector('pre')!.scrollTop};
    panel.update({...state, instructions:[{name:'Earlier', path:'/demo/earlier.md', content:'Earlier'}, {...entry, name:'Renamed instructions'}]});
    const reordered = {sameRow:row.isConnected, sameDetails:details.isConnected, open:details.open, focused:document.activeElement === summary, selection:document.getSelection()!.toString(), scroll:pre.scrollTop, name:row.querySelector('strong')!.textContent};
    panel.destroy(); return {before, unchanged, reordered};
  });
  expect(result.before.scroll).toBeGreaterThan(0);
  expect(result.unchanged).toEqual({sameRow:true, sameDetails:true, open:true, focused:true, selection:'Long', scroll:result.before.scroll});
  expect(result.reordered).toEqual({sameRow:true, sameDetails:true, open:true, focused:true, selection:'Long', scroll:result.before.scroll, name:'Renamed instructions'});
});

test('resource rows keep host-owned action nodes and literal content when metadata changes', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {createResourcesPanel} = await import('../src/files/panels.js'); let calls = 0;
    const action = document.createElement('button'); action.textContent = 'Host action'; action.onclick = () => {calls++;};
    const panel = createResourcesPanel(); document.body.append(panel.element); panel.open('Workspace');
    const entry = {name:'Instructions', path:'/demo/AGENTS.md', content:'<script>literal</script>', actions:action};
    panel.update({instructions:[entry], skills:[], templates:[], diagnostics:[]});
    const row = action.closest('article')!; action.focus();
    panel.update({instructions:[{...entry, name:'<Updated instructions>'}], skills:[], templates:[], diagnostics:['<b>Literal note</b>']});
    const retained = {sameRow:row === action.closest('article'), sameAction:panel.element.querySelector('article button') === action, focused:document.activeElement === action, content:panel.element.querySelector('pre')!.textContent, unsafe:panel.element.querySelectorAll('script, img').length};
    action.click(); panel.destroy(); action.click(); return {...retained, calls};
  });
  expect(result).toEqual({sameRow:true, sameAction:true, focused:true, content:'<script>literal</script>', unsafe:0, calls:2});
});

test('a repeated file preview snapshot preserves the selected page and its reading state', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {createFilePreview} = await import('../src/files/panels.js');
    const preview = createFilePreview(); document.body.append(preview.element); preview.open({name:'large.txt', path:'/demo/large.txt', actions:document.createElement('div')});
    const state = {kind:'text' as const, text:'0123456789\n'.repeat(40000)}; preview.update(state);
    const pagination = preview.element.querySelectorAll<HTMLButtonElement>('.pui-preview-pagination button'); pagination[1].click(); const previous = pagination[0]; previous.focus();
    const pre = preview.element.querySelector('pre')!; pre.style.height = '80px'; pre.style.overflow = 'auto'; pre.scrollTop = 100;
    const range = document.createRange(); range.setStart(pre.firstChild!, 0); range.setEnd(pre.firstChild!, 4);
    document.getSelection()!.removeAllRanges(); document.getSelection()!.addRange(range);
    const before = {page:preview.element.querySelector('.pui-preview-pagination span')!.textContent, selection:document.getSelection()!.toString(), scroll:pre.scrollTop};
    preview.update(state);
    const after = {samePre:pre === preview.element.querySelector('pre'), samePrevious:previous === preview.element.querySelectorAll('.pui-preview-pagination button')[0], focused:document.activeElement === previous, page:preview.element.querySelector('.pui-preview-pagination span')!.textContent, selection:document.getSelection()!.toString(), scroll:preview.element.querySelector('pre')!.scrollTop};
    preview.destroy(); return {before, after};
  });
  expect(result.before.page).toBe('2 / 2'); expect(result.before.scroll).toBeGreaterThan(0);
  expect(result.after).toEqual({samePre:true, samePrevious:true, focused:true, ...result.before});
});

test('image preview metadata updates retain the already decoded image', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {createFilePreview} = await import('../src/files/panels.js');
    const preview = createFilePreview(); document.body.append(preview.element); preview.open({name:'image.svg', path:'/demo/image.svg', actions:document.createElement('div')});
    const state = {kind:'image' as const, imageSrc:'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="16"><rect width="24" height="16" fill="blue"/></svg>'), imageAlt:'Original image'};
    preview.update(state); const image = preview.element.querySelector('img')!; await image.decode();
    preview.update({...state, imageAlt:'Updated image', truncated:true});
    const current = preview.element.querySelector('img')!;
    const result = {sameImage:current === image, decoded:current.complete && current.naturalWidth === 24, alt:current.alt, notes:preview.element.querySelectorAll('.pui-preview-note').length};
    preview.destroy(); return result;
  });
  expect(result).toEqual({sameImage:true, decoded:true, alt:'Updated image', notes:1});
});

test('tool groups retain their identity and folds when history is prepended or a group grows', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {createConversationView} = await import('../src/content/conversation-view.js'); const view = createConversationView(); document.body.append(view.element);
    const a = {id:'a', role:'tool', toolName:'read_file', text:'A output', status:'done'}, b = {id:'b', role:'tool', toolName:'read_file', text:'B output', status:'done'};
    const messages = [{id:'u', role:'user', text:'Start'}, a, {id:'separator', role:'user', text:'Next'}, b];
    view.update({id:'chat', messages, working:false});
    const tool = view.element.querySelector<HTMLDetailsElement>('[data-reading-id="a"]')!, group = tool.closest<HTMLDetailsElement>('.pui-tool-group')!;
    group.open = true; tool.open = true; const summary = tool.querySelector('summary')!; summary.focus();
    const prepended = [{id:'older', role:'tool', toolName:'read_file', text:'Older output', status:'done'}, {id:'older-separator', role:'user', text:'Earlier'}, ...messages];
    view.update({id:'chat', messages:prepended, working:false});
    const afterPrepend = {sameGroup:group === view.element.querySelector('[data-reading-id="a"]')!.closest('.pui-tool-group'), sameTool:tool === view.element.querySelector('[data-reading-id="a"]'), open:group.open && tool.open, focused:document.activeElement === summary, olderClosed:!view.element.querySelector('[data-reading-id="older"]')!.closest<HTMLDetailsElement>('.pui-tool-group')!.open};
    const growing = prepended.flatMap(message => message.id === 'a' ? [message, {id:'a-next', role:'tool', toolName:'read_file', text:'Another A result', status:'running'}] : [message]);
    view.update({id:'chat', messages:growing, working:true});
    const afterAppend = {sameGroup:group === tool.closest('.pui-tool-group'), sameTool:tool.isConnected, open:group.open && tool.open, focused:document.activeElement === summary};
    view.destroy(); return {afterPrepend, afterAppend};
  });
  expect(result.afterPrepend).toEqual({sameGroup:true, sameTool:true, open:true, focused:true, olderClosed:true});
  expect(result.afterAppend).toEqual({sameGroup:true, sameTool:true, open:true, focused:true});
});

test('explicit fold state updates apply independently of message text changes', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {createConversationView} = await import('../src/content/conversation-view.js'); const view = createConversationView(); document.body.append(view.element);
    const state = {id:'chat', messages:[{id:'tool', role:'tool', toolName:'read_file', text:'Output', status:'done'}], working:false}; view.update(state);
    const group = view.element.querySelector<HTMLDetailsElement>('.pui-tool-group')!, tool = view.element.querySelector<HTMLDetailsElement>('[data-reading-id="tool"]')!;
    const groupKey = group.dataset.toolFold!, toolKey = tool.dataset.toolFold!;
    view.update({...state, folds:new Map([[groupKey, true], [toolKey, true]])}); const opened = {group:group.open, tool:tool.open};
    view.update({...state, folds:new Map([[groupKey, false], [toolKey, false]])}); const closed = {group:group.open, tool:tool.open};
    const stable = group === view.element.querySelector('.pui-tool-group') && tool === view.element.querySelector('[data-reading-id="tool"]'); view.destroy(); return {opened, closed, stable};
  });
  expect(result).toEqual({opened:{group:true, tool:true}, closed:{group:false, tool:false}, stable:true});
});

test('a newly reinserted tool group cannot steal the retained key of another group', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {createConversationView} = await import('../src/content/conversation-view.js'); const view = createConversationView(); document.body.append(view.element);
    const a = {id:'a', role:'tool', toolName:'read_file', text:'A output', status:'done'}, b = {id:'b', role:'tool', toolName:'read_file', text:'B output', status:'done'};
    view.update({id:'chat', messages:[a,b], working:false});
    view.update({id:'chat', messages:[b], working:false});
    const tool = view.element.querySelector<HTMLDetailsElement>('[data-reading-id="b"]')!, group = tool.closest<HTMLDetailsElement>('.pui-tool-group')!;
    group.open = true; tool.open = true; const summary = tool.querySelector('summary')!; summary.focus();
    view.update({id:'chat', messages:[a,{id:'separator', role:'user', text:'Later'},b], working:false});
    const result = {sameGroup:group === view.element.querySelector('[data-reading-id="b"]')!.closest('.pui-tool-group'), sameTool:tool === view.element.querySelector('[data-reading-id="b"]'), open:group.open && tool.open, focused:document.activeElement === summary, keys:[...view.element.querySelectorAll<HTMLDetailsElement>('.pui-tool-group')].map(group => group.dataset.toolFold)};
    view.destroy(); return result;
  });
  expect(result).toMatchObject({sameGroup:true, sameTool:true, open:true, focused:true});
  expect(new Set(result.keys).size).toBe(2);
});

test('appending to the selected streaming message preserves its own DOM, selection, code scroll and focus', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {createConversationView} = await import('../src/content/conversation-view.js'); const view = createConversationView(); document.body.append(view.element);
    const messages = [{id:'stream', role:'assistant', text:'中文 selected words\n\n```ts\n' + 'long_code'.repeat(100) + '\n```\n\nStreaming', status:'streaming'}]; view.update({id:'chat', messages, working:true});
    const article = view.element.querySelector('article')!, copy = article.querySelector<HTMLButtonElement>('[data-copy-code]')!; copy.focus();
    const text = article.querySelector('p')!.firstChild!, range = document.createRange(); range.setStart(text, 0); range.setEnd(text, 11);
    document.getSelection()!.removeAllRanges(); document.getSelection()!.addRange(range);
    const pre = article.querySelector('pre')!; pre.style.width = '200px'; pre.style.overflow = 'auto'; pre.scrollLeft = 150;
    const selection = document.getSelection()!.toString(); messages[0].text += ' next token'; view.update({id:'chat', messages, working:true});
    const result = {sameArticle:article === view.element.querySelector('article'), selection:document.getSelection()!.toString(), focused:document.activeElement === copy, sameCopy:copy === view.element.querySelector('[data-copy-code]'), scroll:view.element.querySelector('pre')!.scrollLeft, text:view.element.querySelector('article')!.textContent};
    view.destroy(); return {selection, result};
  });
  expect(result.selection).toBe('中文 selected');
  expect(result.result).toMatchObject({sameArticle:true, selection:'中文 selected', focused:true, sameCopy:true, scroll:150});
  expect(result.result.text).toContain('Streaming next token');
});

test('a message root tag can change without interrupting later keyed updates', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {createConversationView} = await import('../src/content/conversation-view.js'); const view = createConversationView(); document.body.append(view.element);
    const remaining = {id:'remaining', role:'assistant', text:'Remaining before', actions:{copy:true}};
    view.update({id:'chat', messages:[{id:'changing', role:'user', text:'Before'},remaining], working:false});
    const button = view.element.querySelector<HTMLButtonElement>('[data-copy-message="remaining"]')!; button.focus();
    let error: string | null = null;
    try {view.update({id:'chat', messages:[{id:'changing', role:'system', text:'After'},{...remaining,text:'Remaining after'}], working:false});}
    catch (reason) {error = reason instanceof Error ? reason.name : String(reason);}
    const result = {error, tag:view.element.querySelector('[data-reading-id="changing"]')!.tagName, text:view.element.querySelector('[data-reading-id="remaining"]')!.textContent!.trim(), sameButton:button === view.element.querySelector('[data-copy-message="remaining"]'), focused:document.activeElement === button};
    view.destroy(); return result;
  });
  expect(result).toEqual({error:null, tag:'DIV', text:'Remaining after', sameButton:true, focused:true});
});

test('welcome feedback and metadata changes preserve the existing workspace action and brand node', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {createWelcomeView} = await import('../src/content/welcome.js'); const logo = document.createElement('span'); logo.textContent = 'App logo';
    const view = createWelcomeView({logo}); document.body.append(view.element);
    const state = {workspace:{name:'Demo', path:'/demo'}, hasApiKey:true, hasConnections:true, modelName:'Model A'}; view.update(state);
    const button = view.element.querySelector<HTMLButtonElement>('[data-welcome-action="workspace"]')!, brand = view.element.querySelector('.pui-welcome-mark')!.firstChild; button.focus();
    const visible = view.element.textContent; view.update({...state, modelName:'Model B'});
    const unchanged = {sameVisibleText:visible === view.element.textContent, sameButton:button === view.element.querySelector('[data-welcome-action="workspace"]'), sameBrand:brand === view.element.querySelector('.pui-welcome-mark')!.firstChild, focused:document.activeElement === button};
    view.update({...state, workspace:{name:'<Renamed workspace>', path:'/demo'}});
    const updated = {sameButton:button === view.element.querySelector('[data-welcome-action="workspace"]'), sameBrand:brand === view.element.querySelector('.pui-welcome-mark')!.firstChild, focused:document.activeElement === button, name:view.element.querySelector('.pui-welcome-workspace strong')!.textContent, unsafe:view.element.querySelectorAll('script,img').length};
    view.destroy(); return {unchanged, updated};
  });
  expect(result.unchanged).toEqual({sameVisibleText:true, sameButton:true, sameBrand:true, focused:true});
  expect(result.updated).toEqual({sameButton:true, sameBrand:true, focused:true, name:'<Renamed workspace>', unsafe:0});
});

test('image zoom shortcuts belong to the focused viewer and leave an overlaid dialog input alone', async ({page}) => {
  await page.evaluate(async () => {
    const {createImageViewer} = await import('../src/content/image-viewer.js'); const viewer = createImageViewer();
    const source = document.createElement('button'); source.textContent = 'Image source'; document.body.append(source);
    viewer.open({src:'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"/>'), returnFocus:source});
    await viewer.element.querySelector('img')!.decode();
    const dialog = document.createElement('dialog'); dialog.innerHTML = '<input aria-label="Other dialog input"><button type="button">Close other dialog</button>'; document.body.append(dialog);
    dialog.querySelector('button')!.onclick = () => dialog.close(); dialog.showModal(); dialog.querySelector('input')!.focus();
  });
  const scale = page.locator('[data-image-scale]'); await expect(scale).toContainText('100%');
  await page.getByRole('textbox', {name:'Other dialog input'}).press('-');
  await expect(page.getByRole('textbox', {name:'Other dialog input'})).toHaveValue('-'); await expect(scale).toContainText('100%');
  await page.getByRole('button', {name:'Close other dialog'}).click(); await page.getByRole('button', {name:'Zoom in', exact:true}).focus();
  await page.keyboard.press('-'); await expect(scale).toContainText('80%');
  await page.getByRole('button', {name:'Close image', exact:true}).click(); await expect(page.getByRole('button', {name:'Image source'})).toBeFocused();
});

test('destroy removes an auto-mounted image viewer while a caller-owned dialog remains available', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {createImageViewer} = await import('../src/content/image-viewer.js'); const src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"/>');
    const owned = createImageViewer(); owned.open({src}); const wasMounted = owned.element.isConnected; owned.destroy(); owned.destroy();
    const retained = document.createElement('dialog'); document.body.append(retained); const adopted = createImageViewer({dialog:retained}); adopted.open({src}); adopted.destroy();
    return {wasMounted, ownedRemoved:!owned.element.isConnected, retained:retained.isConnected, retainedClosed:!retained.open, retainedEmpty:retained.childElementCount === 0};
  });
  expect(result).toEqual({wasMounted:true, ownedRemoved:true, retained:true, retainedClosed:true, retainedEmpty:true});
});

test('reader public methods are inert after destruction, including stale direct calls', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {installConversationReader} = await import('../src/content/conversation-reader.js');
    const root = document.createElement('div'); root.innerHTML = '<button data-outside>Outside</button><div data-find hidden><input><span data-find-count></span><button data-find-previous></button><button data-find-next></button><button data-find-close></button></div><div data-scroll tabindex="0" style="height:80px;overflow:auto"><div data-messages><article data-reading-id="a" style="height:1000px">a+b</article></div></div><button data-latest></button>'; document.body.append(root);
    const scroll = root.querySelector<HTMLElement>('[data-scroll]')!, bar = root.querySelector<HTMLElement>('[data-find]')!, input = bar.querySelector('input')!, outside = root.querySelector<HTMLButtonElement>('[data-outside]')!;
    const reader = installConversationReader(scroll, root.querySelector('[data-messages]')!, bar, root.querySelector('[data-latest]')!); reader.beforeRender('chat'); reader.afterRender(); reader.destroy(); reader.destroy();
    outside.focus(); reader.openFind(); const open = {hidden:bar.hidden, focus:document.activeElement === outside};
    bar.hidden = false; input.focus(); reader.closeFind(); const close = {visible:!bar.hidden, focus:document.activeElement === input};
    scroll.scrollTop = 40; reader.followLatest(); const top = scroll.scrollTop; reader.beforeRender('stale'); reader.afterRender(); reader.prune([]);
    return {open, close, top};
  });
  expect(result).toEqual({open:{hidden:true, focus:true}, close:{visible:true, focus:true}, top:40});
});

test('disabled updates cannot install an available version and pending remains authoritative', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {createUpdatePanel} = await import('../src/files/systems.js'); let calls = 0;
    const panel = createUpdatePanel({onInstall() {calls++;}}); document.body.append(panel.element);
    const state = {version:'0.1.0', enabled:false, phase:'available', availableVersion:'0.1.1', progress:0, message:'Updates unavailable'};
    const check = panel.element.querySelector<HTMLButtonElement>('[data-update-check]')!, install = panel.element.querySelector<HTMLButtonElement>('[data-update-install]')!;
    panel.update(state); install.click(); const disabled = {check:check.disabled, install:install.disabled, calls};
    panel.update({...state, enabled:true}); panel.setPending(true); panel.update({...state, enabled:true}); install.click(); const pending = {install:install.disabled, calls};
    panel.setPending(false); install.click(); const enabled = {install:install.disabled, calls}; panel.destroy(); install.click(); return {disabled, pending, enabled, afterDestroy:calls};
  });
  expect(result).toEqual({disabled:{check:true, install:true, calls:0}, pending:{install:true, calls:0}, enabled:{install:false, calls:1}, afterDestroy:1});
});

test('paged Markdown copy provides the actual button once and keeps its host adapter isolated', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {createPagedPreview} = await import('../src/content/paged-preview.js'); const container = document.createElement('div'); document.body.append(container); let calls = 0, delegated = 0, actual = false, copied = '';
    document.addEventListener('click', event => {if ((event.target as Element).closest('[data-copy-code]')) delegated++;});
    const options = {container, text:'```ts\nconst answer = 42;\n```', kind:'markdown' as const, onCopyCode(text:string, button?:HTMLButtonElement) {calls++; copied = text; actual = button === container.querySelector('[data-copy-code]');}};
    const preview = createPagedPreview(options); const button = container.querySelector<HTMLButtonElement>('[data-copy-code]')!; button.click();
    const first = {calls, delegated, actual, copied}; preview.destroy(); button.click(); return {first, afterDestroy:calls};
  });
  expect(result).toEqual({first:{calls:1, delegated:0, actual:true, copied:'const answer = 42;\n'}, afterDestroy:1});
});

test('file preview forwards code copy to the full block callback without duplicate routing', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {createFilePreview} = await import('../src/files/panels.js'); const container = document.createElement('div'); document.body.append(container); let calls = 0, delegated = 0, actual = false, copied = '';
    document.addEventListener('click', event => {if ((event.target as Element).closest('[data-copy-code]')) delegated++;});
    const options = {container, onCopyCode(text:string, button?:HTMLButtonElement) {calls++; copied = text; actual = button === container.querySelector('[data-copy-code]');}};
    const preview = createFilePreview(options); preview.open({name:'README.md', path:'/demo/README.md', actions:document.createElement('div')}); preview.update({kind:'markdown', text:'```ts\nconst file = "safe";\n```'});
    const button = container.querySelector<HTMLButtonElement>('[data-copy-code]')!; button.click(); const first = {calls, delegated, actual, copied}; preview.destroy(); button.click(); return {first, afterDestroy:calls};
  });
  expect(result).toEqual({first:{calls:1, delegated:0, actual:true, copied:'const file = "safe";\n'}, afterDestroy:1});
});

test('Markdown without a copy callback preserves delegated compatibility routing', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {createPagedPreview} = await import('../src/content/paged-preview.js'); const preview = createPagedPreview({text:'```ts\nconst value = 1;\n```', kind:'markdown'}); document.body.append(preview.element); let calls = 0;
    preview.element.addEventListener('click', event => {if ((event.target as Element).closest('[data-copy-code]')) calls++;}); preview.element.querySelector<HTMLButtonElement>('[data-copy-code]')!.click(); preview.destroy(); return calls;
  });
  expect(result).toBe(1);
});

test('resource and file content close requests belong to their own dialog identities', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {createResourcesPanel, createFilePreview} = await import('../src/files/panels.js'); let resourcesClosed = 0, previewClosed = 0, hostCalls = 0;
    const foreign = () => {const button = document.createElement('button'); button.type = 'button'; button.dataset.close = 'another-dialog'; button.textContent = 'Close another surface'; button.onclick = () => {hostCalls++;}; return button;};
    const resources = createResourcesPanel({dialogId:'resources-owned', onClose() {resourcesClosed++;}}); document.body.append(resources.element); const resourceAction = foreign(); resources.open('Workspace', resourceAction); resourceAction.click();
    const preview = createFilePreview({dialogId:'preview-owned', onClose() {previewClosed++;}}); document.body.append(preview.element); const previewAction = foreign(); preview.open({name:'File', path:'/demo/file', actions:previewAction}); previewAction.click();
    const unrelated = {resourcesClosed, previewClosed, hostCalls}; resources.element.querySelector<HTMLButtonElement>('[data-close="resources-owned"]')!.click(); preview.element.querySelector<HTMLButtonElement>('[data-close="preview-owned"]')!.click();
    const own = {resourcesClosed, previewClosed, hostCalls}; resources.destroy(); preview.destroy(); return {unrelated, own};
  });
  expect(result).toEqual({unrelated:{resourcesClosed:0, previewClosed:0, hostCalls:2}, own:{resourcesClosed:1, previewClosed:1, hostCalls:2}});
});

test('file actions expose disabled state without clearing copy or host restrictions', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {createFileActions} = await import('../src/files/panels.js'); let calls = 0;
    const block = createFileActions({kind:'resource', ownerId:'workspace', path:'/demo/AGENTS.md', preview:true, copyMode:'file', onAction() {calls++;}});
    document.body.append(block.element); const buttons = [...block.element.querySelectorAll('button')];
    block.setDisabled(true); buttons.forEach(button => button.click()); const disabled = {all:buttons.every(button => button.disabled), calls};
    const copy = block.element.querySelector<HTMLButtonElement>('[data-file-action="copy"]')!; copy.dataset.copyPending = 'true';
    block.setDisabled(false); copy.click(); const pending = {copy:copy.disabled, others:buttons.filter(button => button !== copy).every(button => !button.disabled), calls};
    delete copy.dataset.copyPending; block.setDisabled(false); copy.click(); const enabled = {copy:copy.disabled, calls};
    block.destroy(); copy.click(); return {supported:typeof block.setDisabled === 'function', disabled, pending, enabled, afterDestroy:calls};
  });
  expect(result).toEqual({supported:true, disabled:{all:true,calls:0}, pending:{copy:true,others:true,calls:0}, enabled:{copy:false,calls:1}, afterDestroy:1});
});

test('file action callbacks own their route while omitted callbacks retain delegation', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {createFileActions} = await import('../src/files/panels.js'); let owned = 0, delegated = 0;
    const host = document.createElement('section'); host.addEventListener('click', () => delegated++); document.body.append(host);
    const first = createFileActions({kind:'artifact', ownerId:'chat', path:'/report.md', onAction() {owned++;}});
    const legacy = createFileActions({kind:'artifact', ownerId:'chat', path:'/report.md'});
    host.append(first.element, legacy.element); first.element.querySelector<HTMLButtonElement>('[data-file-action="open"]')!.click();
    const afterOwned = {owned, delegated}; legacy.element.querySelector<HTMLButtonElement>('[data-file-action="open"]')!.click();
    first.destroy(); legacy.destroy(); return {afterOwned, afterLegacy:{owned,delegated}};
  });
  expect(result).toEqual({afterOwned:{owned:1,delegated:0}, afterLegacy:{owned:1,delegated:1}});
});
