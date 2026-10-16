import {test, expect} from '@playwright/test';

test.beforeEach(async ({page}) => {await page.goto('/tests/fixture.html');});

test('model search and thinking capabilities retain selection across unchanged state updates', async ({page}) => {
  await page.evaluate(async () => {
    const {createModelEditor} = await import('../src/forms/model-editor.js');
    const state = {providers:[{id:'provider',name:'Provider',model:'balanced',thinkingLevel:'high'}],models:[{id:'balanced',name:'Balanced',provider:'provider',supportsImages:true,contextWindow:128000,maxTokens:8192,thinkingLevels:['off','high']},{id:'fast',name:'Fast',provider:'provider',supportsImages:false,contextWindow:64000,maxTokens:4096,thinkingLevels:['off']}],selection:{provider:'provider',model:'balanced',thinkingLevel:'high'}};
    const block=createModelEditor(state,{prefix:'test'});document.body.append(block.element);
    const refresh=document.createElement('button');refresh.textContent='Unchanged snapshot';refresh.onclick=()=>block.update(state);document.body.append(refresh);
  });
  await expect(page.locator('#test-model')).toHaveValue('balanced');await expect(page.locator('#test-thinking')).toHaveValue('high');
  await page.locator('#test-search').fill('does-not-match');await expect(page.locator('#test-model option')).toHaveCount(1);await expect(page.locator('#test-model')).toHaveValue('balanced');
  await page.locator('#test-search').fill('');await page.locator('#test-model').selectOption('fast');await expect(page.getByRole('combobox',{name:'Thinking effort',exact:true})).toBeHidden();
  await page.getByRole('button',{name:'Unchanged snapshot'}).click();await expect(page.locator('#test-model')).toHaveValue('fast');await expect(page.locator('#test-capabilities')).toContainText('Text only');
});

test('custom model add and remove never submit the form, and draft prices distinguish zero from blank', async ({page}) => {
  await page.evaluate(async () => {
    const {createCustomConnectionEditor}=await import('../src/forms/custom-connection.js');
    const block=createCustomConnectionEditor({name:'Custom',baseUrl:'https://example.com/v1',api:'openai-completions',editing:true,models:[{id:'one',contextWindow:128000,maxTokens:8192,cost:{input:0,output:0,cacheRead:0,cacheWrite:0}}]}, {idPrefix:''});
    block.form.addEventListener('submit',event=>{event.preventDefault();document.body.dataset.submits=String(Number(document.body.dataset.submits||0)+1);});
    const inspect=document.createElement('button');inspect.textContent='Read draft';inspect.onclick=()=>{document.body.dataset.draft=JSON.stringify(block.read());};document.body.append(block.element,inspect);
  });
  await page.locator('#add-custom-model').click();await expect(page.locator('fieldset')).toHaveCount(2);
  await page.locator('fieldset').last().locator('[data-remove-model]').click();await expect(page.locator('fieldset')).toHaveCount(1);
  expect(await page.locator('body').getAttribute('data-submits')).toBeNull();await page.getByRole('button',{name:'Read draft'}).click();
  const draft=JSON.parse(await page.locator('body').getAttribute('data-draft')||'{}');expect(draft.models[0].prices).toEqual({input:'0',output:'0',cacheRead:'0',cacheWrite:'0'});
});

test('MCP type, secret visibility and reset are owned locally and do not submit', async ({page}) => {
  await page.evaluate(async () => {
    const {createMCPConnectionsPanel}=await import('../src/forms/panels.js');const block=createMCPConnectionsPanel({}, {idPrefix:''});document.body.append(block.element);
    block.edit({name:'tools',type:'stdio',command:'/usr/bin/demo',args:[],envKeys:['DEMO_KEY']});
    block.field<HTMLFormElement>('mcp-form').addEventListener('submit',event=>{event.preventDefault();document.body.dataset.submitted='true';});
    const reset=document.createElement('button');reset.textContent='Reset editor';reset.onclick=()=>block.edit();document.body.append(reset);
  });
  await expect(page.locator('#mcp-stdio-fields')).toBeVisible();await expect(page.locator('#mcp-http-fields')).toBeHidden();
  await page.locator('#mcp-env').fill('{"DEMO_KEY":"private"}');await page.locator('#mcp-env-visibility').click();await expect(page.locator('#mcp-env-visibility')).toHaveAttribute('aria-pressed','true');
  expect(await page.locator('body').getAttribute('data-submitted')).toBeNull();
  await page.getByRole('button',{name:'Reset editor'}).click();await expect(page.locator('#mcp-env')).toHaveValue('');await expect(page.locator('#mcp-env-visibility')).toHaveAttribute('aria-pressed','false');await expect(page.locator('#mcp-name')).toBeEditable();
  await expect(page.locator('#mcp-http-fields')).toBeVisible();await expect(page.locator('#mcp-command')).not.toHaveAttribute('required');
});

test('resource feedback preserves edited text, caret and read-only rules', async ({page}) => {
  await page.evaluate(async()=>{
    const {createResourceEditor}=await import('../src/forms/resource-editor.js');
    const state={workspaceId:'workspace',workspacePath:'/demo',path:'/demo/AGENTS.md',kind:'instructions',content:'Original',editable:true,workspaceBusy:false};
    const block=createResourceEditor(state, {idPrefix:''});document.body.append(block.element);
    const input=block.element.querySelector<HTMLTextAreaElement>('#resource-body')!;input.value='Unsaved 中文 draft';input.focus();input.setSelectionRange(2,8);
    block.update({...state,content:'Server snapshot must not replace editing',disabled:true,error:'Save failed'});
    document.body.dataset.selection=JSON.stringify([input.selectionStart,input.selectionEnd]);document.body.dataset.sameFocus=String(document.activeElement===input);
  });
  await expect(page.locator('#resource-body')).toHaveValue('Unsaved 中文 draft');expect(await page.locator('body').getAttribute('data-selection')).toBe('[2,8]');expect(await page.locator('body').getAttribute('data-same-focus')).toBe('true');await expect(page.locator('[data-resource-error]')).toHaveText('Save failed');await expect(page.locator('#resource-form button[type="submit"]')).toBeDisabled();
});

test('dialog content destruction and queued close events cannot clear a reopened dialog',async({page})=>{
  const result=await page.evaluate(async()=>{
    const {createFeatureDialogFrame}=await import('../src/forms/dialog-frame.js');const frame=createFeatureDialogFrame();document.body.append(frame.element);let destroyed=0;
    const first=document.createElement('p');first.textContent='First';frame.open({title:'First',body:{element:first,destroy(){destroyed++;first.remove();}}});
    frame.close();const second=document.createElement('p');second.textContent='Second body';frame.open({title:'Second',body:second});
    await new Promise(resolve=>setTimeout(resolve,30));const result={destroyed,open:(frame.element as HTMLDialogElement).open,text:frame.element.textContent};frame.destroy();return result;
  });
  expect(result.destroyed).toBe(1);expect(result.open).toBe(true);expect(result.text).toContain('Second body');
});

test('approval pending updates preserve lazy argument view and stable approval identity',async({page})=>{
  const result=await page.evaluate(async()=>{
    const {createApprovalPanel}=await import('../src/tasks/approval.js');
    const approval={id:'approval-a',toolName:'edit_file',canAlwaysAllow:true,argsText:'{"path":"README.md"}',preview:{kind:'modify',path:'README.md',diff:'-old\n+new'}};
    const block=createApprovalPanel({approval}, {idPrefix:''});document.body.append(block.element);const details=block.element.querySelector<HTMLDetailsElement>('details')!;details.open=true;await new Promise(resolve=>setTimeout(resolve,0));
    const args=block.element.querySelector('#approval-args-preview pre');block.update({approval,disabled:true});
    const result={sameArgs:args!==null&&args===block.element.querySelector('#approval-args-preview pre'),open:details.open,allDisabled:[...block.element.querySelectorAll<HTMLButtonElement>('[data-approval]')].every(button=>button.disabled),ids:[...block.element.querySelectorAll<HTMLButtonElement>('[data-approval]')].map(button=>button.dataset.approvalId)};block.destroy();return result;
  });
  expect(result).toEqual({sameArgs:true,open:true,allDisabled:true,ids:['approval-a','approval-a','approval-a']});
});

test('navigation keys preserve button identity, focus and scroll across status and running updates',async({page})=>{
  const result=await page.evaluate(async()=>{
    const {createWorkspaceNavigation}=await import('../src/navigation/navigation.js');
    const status=()=>{const element=document.createElement('span');element.textContent='Running';return element;};
    const children=Array.from({length:30},(_,index)=>({id:'chat-'+index,title:'Conversation '+index,active:index===0,status:index===0?status():null}));
    const state={groups:[{id:'workspace',name:'Workspace',path:'/demo',expanded:true,selected:true,children}],empty:null};
    const block=createWorkspaceNavigation(state);document.body.append(block.element);block.element.style.height='100px';block.element.style.overflow='auto';
    const button=block.element.querySelector<HTMLButtonElement>('[data-conversation="chat-0"]')!;button.focus();const statusNode=button.lastElementChild;
    block.element.scrollTop=75;const before=block.element.scrollTop;
    block.update({...state,groups:[{...state.groups[0],children:children.map(entry=>({...entry,status:entry.id==='chat-0'?status():null}))}]});
    const stable={sameButton:button===block.element.querySelector('[data-conversation="chat-0"]'),sameStatus:statusNode===button.lastElementChild,focused:document.activeElement===button,scroll:block.element.scrollTop===before};
    block.update({...state,disabled:true});const disabled=button.disabled;block.destroy();return{...stable,disabled};
  });
  expect(result).toEqual({sameButton:true,sameStatus:true,focused:true,scroll:true,disabled:true});
});

test('independent full blocks have unique default IDs for comparison galleries',async({page})=>{
  const result=await page.evaluate(async()=>{
    const [{createApprovalPanel},{createRuntimePanel},{createProviderLoginPanel},{createSettingsPanel,createModelPicker},{createResourceEditor},{createCustomConnectionEditor},{createRenameConversation,createWorkspacePicker},{createFullAccessConfirmation}]=await Promise.all([import('../src/tasks/approval.js'),import('../src/tasks/runtime.js'),import('../src/forms/provider-login.js'),import('../src/forms/panels.js'),import('../src/forms/resource-editor.js'),import('../src/forms/custom-connection.js'),import('../src/navigation/navigation.js'),import('../src/tasks/permission.js')]);
    const blocks: Array<{element:HTMLElement;destroy():void}>=[];
    for(let i=0;i<2;i++)blocks.push(
      createApprovalPanel({approval:{id:'demo',toolName:'edit_file',canAlwaysAllow:true,argsText:'{}',preview:{kind:'modify',path:'README.md',diff:'-old\n+new'}}}),
      createRuntimePanel({visible:true,summary:'Working',duration:'1s',speed:'1',inputTokens:'1',outputTokens:'1',cacheRead:'0',cacheWrite:'0',contextTokens:'1',contextWindow:'10',compactions:'0',toolFailures:'0',recordedCost:'0',latestCost:'0'}),
      createProviderLoginPanel({phase:'prompt',message:'Sign in',prompt:'Code'}),
      createSettingsPanel({baseUrl:'https://example.com',hasApiKey:true}),createModelPicker(),
      createResourceEditor({workspaceId:'w',workspacePath:'/demo',kind:'skill',content:'# Skill',editable:true,workspaceBusy:false}),
      createCustomConnectionEditor({name:'Example',baseUrl:'https://example.com',api:'openai-completions',editing:false,models:[]}),
      createRenameConversation({id:'chat',title:'Demo'}),createWorkspacePicker({workspaces:[]}),createFullAccessConfirmation({title:'Demo'})
    );
    document.body.append(...blocks.map(block=>block.element));const ids=[...document.querySelectorAll<HTMLElement>('[id]')].map(node=>node.id);const duplicates=ids.filter((id,index)=>ids.indexOf(id)!==index);blocks.forEach(block=>block.destroy());return duplicates;
  });
  expect(result).toEqual([]);
});

test('MCP status updates retain the keyed connection and focused edit action',async({page})=>{
  const result=await page.evaluate(async()=>{
    const {createMCPConnectionList}=await import('../src/forms/panels.js');
    const first={name:'tools',type:'http',url:'https://example.com/mcp',enabled:true,status:'connecting',statusLabel:'Connecting…'};
    const list=createMCPConnectionList({entries:[first]});document.body.append(list.element);const article=list.element.querySelector('article')!;const button=list.element.querySelector<HTMLButtonElement>('[data-mcp-edit]')!;button.focus();
    list.update({entries:[{...first,status:'connected',statusLabel:'Connected · 3 tools',hasBearerToken:true,oauth:true,signedIn:true}]});
    const result={sameArticle:article===list.element.querySelector('article'),sameButton:button===list.element.querySelector('[data-mcp-edit]'),focused:document.activeElement===button,status:list.element.querySelector('[role="status"]')!.textContent,actions:list.element.querySelectorAll('button').length};list.destroy();return result;
  });
  expect(result).toEqual({sameArticle:true,sameButton:true,focused:true,status:'Connected · 3 tools',actions:5});
});

test('custom model snapshots preserve blurred edits and only explicit reset replaces input',async({page})=>{
  await page.evaluate(async()=>{
    const {createCustomModelRow}=await import('../src/forms/custom-connection.js');
    const initial={id:'initial-model',name:'Initial name',contextWindow:128000,maxTokens:8192,reasoning:true,input:['text','image'],cost:{input:1,output:2,cacheRead:0,cacheWrite:0}};
    const block=createCustomModelRow(initial);const snapshot=document.createElement('button');snapshot.textContent='Apply snapshot';snapshot.onclick=()=>block.update({...initial,error:'Validation failed'});
    const reset=document.createElement('button');reset.textContent='Explicit reset';reset.onclick=()=>block.reset({id:'reset-model',name:'Reset name',contextWindow:64000,maxTokens:4096,input:['text']});
    document.body.append(block.element,snapshot,reset);
  });
  await page.locator('[name="id"]').fill('my-typed-model');await page.locator('[name="name"]').fill('My edited name');await page.locator('[name="contextWindow"]').fill('256000');
  await page.getByRole('button',{name:'Apply snapshot'}).click();await expect(page.locator('[name="id"]')).toHaveValue('my-typed-model');await expect(page.locator('[name="name"]')).toHaveValue('My edited name');await expect(page.locator('[name="contextWindow"]')).toHaveValue('256000');await expect(page.getByRole('alert')).toHaveText('Validation failed');
  await page.getByRole('button',{name:'Explicit reset'}).click();await expect(page.locator('[name="id"]')).toHaveValue('reset-model');await expect(page.locator('[name="name"]')).toHaveValue('Reset name');await expect(page.locator('[name="contextWindow"]')).toHaveValue('64000');await expect(page.locator('[name="reasoning"]')).not.toBeChecked();await expect(page.locator('[name="price-input"]')).toHaveValue('');
});
