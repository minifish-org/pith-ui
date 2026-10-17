import {expect,test} from '@playwright/test';

const uiFont = ['-apple-system','BlinkMacSystemFont','Segoe UI','sans-serif'];
const codeFont = ['ui-monospace','SFMono-Regular','Menlo','monospace'];
// Chromium's CSSOM canonicalizes the BlinkMacSystemFont alias as system-ui.
const normalizeFont = (value: string) => value.split(',').map(part => part.trim().replace(/["']/g,'').replace(/^system-ui$/,'BlinkMacSystemFont'));
const sizes = [12,14,16], weights = ['400','600'], spaces = [4,8,12,16,24];

test.beforeEach(async ({page}) => {await page.goto('/tests/fixture.html');});

test('primitive text uses the fixed UI font, three sizes, two weights and one line ratio',async ({page}) => {
  const samples = await page.evaluate(async () => {
    const ui = await import('../src/internal-components.js');
    const samples: Array<{id: string; node: HTMLElement; size?: number; weight?: string}> = [];
    const add = (id: string,node: HTMLElement,size?: number,weight?: string) => {samples.push({id,node,size,weight});};
    const button = ui.createButton({label:'Ordinary action'}), compact = ui.createButton({label:'Compact action',density:'compact'});
    const field = ui.createTextInput({label:'Name',description:'Field explanation',error:'Field validation',value:'中文 Name'});
    const area = ui.createTextArea({label:'Description',value:'中文 prose'});
    const checkbox = ui.createCheckbox({label:'Enabled',description:'Checkbox explanation'});
    const status = ui.createStatus({label:'Connected'}), notice = ui.createNotice({message:'A normal notice'});
    const section = ui.createFormSection({title:'Section title',description:'Section explanation'});
    const row = ui.createListRow({title:'List title',description:'List explanation',meta:'Metadata'});
    const dialog = ui.createDialog({title:'Dialog title',description:'Dialog explanation',eyebrow:'DIALOG CONTEXT'});
    for (const block of [button,compact,field,area,checkbox,status,notice,section,row,dialog]) document.body.append(block.element);
    dialog.element.setAttribute('open','');
    add('ordinary button',button.element,14); add('compact button',compact.element,12);
    add('ordinary input',field.control,14); add('textarea',area.control,14);
    add('field label',field.element.querySelector('label')!);
    add('field description',field.element.querySelector<HTMLElement>('.pui-field-description')!,12);
    add('field error',field.element.querySelector<HTMLElement>('.pui-field-error')!,12);
    add('checkbox label',checkbox.element); add('checkbox description',checkbox.element.querySelector('small')!,12);
    add('status',status.element,12); add('notice',notice.element,14);
    add('section heading',section.element.querySelector('h3')!,undefined,'600');
    add('section explanation',section.element.querySelector('p')!,12);
    add('list title',row.element.querySelector<HTMLElement>('.pui-list-row-title')!);
    add('list metadata',row.element.querySelector('small')!,12);
    add('dialog heading',dialog.element.querySelector('h2')!,16,'600');
    add('dialog explanation',dialog.element.querySelector('p')!,12);
    add('eyebrow',dialog.element.querySelector<HTMLElement>('.pui-eyebrow')!,12);
    return samples.map(({id,node,size,weight}) => {const css = getComputedStyle(node); return {id,size,weight,font:css.fontFamily,actualSize:parseFloat(css.fontSize),actualWeight:css.fontWeight,line:parseFloat(css.lineHeight)};});
  });
  for (const sample of samples) {
    expect.soft(normalizeFont(sample.font),sample.id+' font').toEqual(uiFont);
    expect.soft(sizes,sample.id+' size').toContain(sample.actualSize);
    expect.soft(weights,sample.id+' weight').toContain(sample.actualWeight);
    expect.soft(sample.line,sample.id+' line height').toBeCloseTo(sample.actualSize*1.5,3);
    if (sample.size !== undefined) expect.soft(sample.actualSize,sample.id+' role').toBe(sample.size);
    if (sample.weight !== undefined) expect.soft(sample.actualWeight,sample.id+' emphasis').toBe(sample.weight);
  }
});

test('product settings, welcome, approvals and permissions follow the same text roles',async ({page}) => {
  const samples = await page.evaluate(async () => {
    const ui = await import('../src/internal-components.js');
    const settings = ui.createSettingsPanel({baseUrl:'https://example.test/v1',hasApiKey:true,ready:true});
    const welcomeHost = document.createElement('div'); welcomeHost.className = 'pui-welcome';
    const welcome = ui.createWelcomeView({container:welcomeHost}); welcome.update({hasApiKey:false,hasConnections:false,modelName:''});
    const permission = ui.createPermissionControl({mode:'ask',description:'Ask before changes'});
    const approval = ui.createApprovalPanel({approval:{id:'approval',toolName:'edit_file',canAlwaysAllow:true,argsText:'{}',preview:{kind:'modify',path:'README.md',diff:'-old\n+new'}}});
    const fullAccess = ui.createFullAccessConfirmation({title:'Example conversation'});
    for (const block of [settings,welcome,permission,approval,fullAccess]) document.body.append(block.element);
    const samples: Array<{id: string; node: HTMLElement; size?: number}> = [
      {id:'settings title',node:settings.element.querySelector('h2')!,size:16},
      {id:'settings hint',node:settings.element.querySelector<HTMLElement>('.pui-field-hint')!,size:12},
      {id:'settings action',node:settings.field<HTMLButtonElement>('save-settings'),size:14},
      {id:'welcome title',node:welcomeHost.querySelector('h1')!,size:16},
      {id:'welcome prose',node:welcomeHost.querySelector<HTMLElement>('.pui-welcome-description')!,size:14},
      {id:'welcome step title',node:welcomeHost.querySelector('.pui-setup-step strong')!},
      {id:'welcome footnote',node:welcomeHost.querySelector<HTMLElement>('.pui-welcome-footnote')!,size:12},
      {id:'permission trigger',node:permission.element.querySelector<HTMLButtonElement>('[role="combobox"]')!,size:12},
      {id:'approval heading',node:approval.element.querySelector('.pui-approval-heading strong')!},
      {id:'approval scope',node:approval.element.querySelector<HTMLElement>('.pui-approval-scope')!,size:12},
      {id:'full access title',node:fullAccess.element.querySelector('h2')!,size:16},
      {id:'full access prose',node:fullAccess.element.querySelector<HTMLElement>('.pui-modal-description')!,size:14},
    ];
    return samples.map(({id,node,size}) => {const css = getComputedStyle(node); return {id,size,font:css.fontFamily,actualSize:parseFloat(css.fontSize),weight:css.fontWeight,line:parseFloat(css.lineHeight)};});
  });
  for (const sample of samples) {
    expect.soft(normalizeFont(sample.font),sample.id+' font').toEqual(uiFont);
    expect.soft(sizes,sample.id+' size').toContain(sample.actualSize);
    expect.soft(weights,sample.id+' weight').toContain(sample.weight);
    expect.soft(sample.line,sample.id+' line height').toBeCloseTo(sample.actualSize*1.5,3);
    if (sample.size !== undefined) expect.soft(sample.actualSize,sample.id+' role').toBe(sample.size);
  }
});

test('Markdown keeps semantic headings and emphasis while using the fixed text scale',async ({page}) => {
  const samples = await page.evaluate(async () => {
    const {createConversationView} = await import('../src/internal-components.js'); const view = createConversationView();
    view.update({id:'conversation',working:false,messages:[{id:'message',role:'assistant',text:'# First\n\n## Second\n\n### Third\n\n#### Fourth\n\n##### Fifth\n\n###### Sixth\n\nA paragraph with **strong text** and *emphasized text*.\n\n- A list item\n\n> A quoted sentence\n\nInline `code`.'}]});
    document.body.append(view.element);
    return [...view.element.querySelectorAll<HTMLElement>('.pui-markdown h1,.pui-markdown h2,.pui-markdown h3,.pui-markdown h4,.pui-markdown h5,.pui-markdown h6,.pui-markdown p,.pui-markdown strong,.pui-markdown em,.pui-markdown li,.pui-markdown blockquote')].map(node => {
      const css = getComputedStyle(node); return {tag:node.tagName,text:node.textContent,font:css.fontFamily,size:parseFloat(css.fontSize),weight:css.fontWeight,line:parseFloat(css.lineHeight),fontStyle:css.fontStyle};
    });
  });
  expect(samples.filter(sample=>/^H[1-6]$/.test(sample.tag))).toHaveLength(6);
  for (const sample of samples) {
    expect.soft(normalizeFont(sample.font),sample.tag+' font').toEqual(uiFont);
    expect.soft(sizes,sample.tag+' size').toContain(sample.size);
    expect.soft(weights,sample.tag+' weight').toContain(sample.weight);
    expect.soft(sample.line,sample.tag+' line height').toBeCloseTo(sample.size*1.5,3);
    if (/^H[1-6]$/.test(sample.tag)) {expect.soft(sample.size,sample.tag+' heading role').toBe(16); expect.soft(sample.weight,sample.tag+' heading emphasis').toBe('600');}
    if (sample.tag === 'STRONG') expect.soft(sample.weight,'Markdown strong semantics').toBe('600');
    if (sample.tag === 'EM') expect.soft(sample.fontStyle,'Markdown emphasis semantics').toBe('italic');
  }
});

test('code, command output and resource source share the one monospace font role',async ({page}) => {
  const samples = await page.evaluate(async () => {
    const ui = await import('../src/internal-components.js'); const conversation = ui.createConversationView();
    conversation.update({id:'conversation',working:false,messages:[
      {id:'assistant',role:'assistant',text:'Inline `path` and code:\n\n```ts\nconst value = 1;\n```'},
      {id:'tool',role:'tool',toolName:'exec',status:'done',text:'Output 中文',command:{text:'pwd',cwd:'/workspace',exitCode:0}},
    ]});
    const approval = ui.createApprovalPanel({approval:{id:'approval',toolName:'edit_file',canAlwaysAllow:false,argsText:'{"content":"中文"}',preview:{kind:'modify',path:'README.md',diff:'-old\n+new'}}});
    const preview = ui.createPagedPreview({kind:'text',text:'Raw source 中文'});
    const resource = ui.createResourceEditor({workspaceId:'workspace',workspacePath:'/workspace',path:'/workspace/AGENTS.md',kind:'instructions',content:'Resource source',editable:true,workspaceBusy:false});
    const resourceHost = document.createElement('section'); resourceHost.className = 'pui-modal'; resourceHost.append(resource.element);
    for (const block of [conversation,approval,preview]) document.body.append(block.element); document.body.append(resourceHost);
    for (const detail of document.querySelectorAll('details')) detail.open = true;
    const nodes: Array<[string,HTMLElement]> = [
      ['inline code',conversation.element.querySelector('.pui-markdown p code')!],['fenced code',conversation.element.querySelector('.pui-code-block pre code')!],
      ['command',conversation.element.querySelector<HTMLElement>('.pui-command-text')!],['command directory',conversation.element.querySelector('.pui-command-directory code')!],['command output',conversation.element.querySelector('.pui-command-output pre')!],
      ['approval tool',approval.element.querySelector<HTMLElement>('.pui-approval-badge')!],['approval diff',approval.element.querySelector<HTMLElement>('.pui-approval-diff')!],
      ['plain preview',preview.element.querySelector('pre')!],['resource path',resource.element.querySelector<HTMLElement>('.pui-file-path')!],['resource editor',resource.element.querySelector('textarea')!],
    ];
    return nodes.map(([id,node]) => {const css = getComputedStyle(node); return {id,font:css.fontFamily,size:parseFloat(css.fontSize),weight:css.fontWeight,line:parseFloat(css.lineHeight)};});
  });
  for (const sample of samples) {
    expect.soft(normalizeFont(sample.font),sample.id+' font').toEqual(codeFont);
    expect.soft(sizes,sample.id+' size').toContain(sample.size);
    expect.soft(weights,sample.id+' weight').toContain(sample.weight);
    expect.soft(sample.line,sample.id+' line height').toBeCloseTo(sample.size*1.5,3);
  }
});

test('primitive layouts use the standard spacing roles in measured boxes',async ({page}) => {
  const measurements = await page.evaluate(async () => {
    const ui = await import('../src/internal-components.js');
    const field = ui.createTextInput({label:'Name',description:'Help',value:'Value'});
    const button = ui.createButton({label:'Add',icon:'plus'});
    const toolbar = ui.createToolbar({label:'Tools',children:[document.createTextNode('Tools')]}), compact = ui.createToolbar({label:'Compact tools',density:'compact',children:[document.createTextNode('Tools')]});
    const actions = ui.createActions({children:[document.createTextNode('Actions')]});
    const section = ui.createFormSection({title:'Section',description:'Description'});
    const dialog = ui.createDialog({title:'Dialog',content:document.createTextNode('Content')}); dialog.element.setAttribute('open','');
    for (const block of [field,button,toolbar,compact,actions,section,dialog]) document.body.append(block.element);
    const rows: Array<[string,HTMLElement,string,number]> = [
      ['compact toolbar',compact.element,'column-gap',4],['action row',actions.element,'column-gap',8],['ordinary toolbar',toolbar.element,'column-gap',8],
      ['field grouping',field.element,'row-gap',8],['button icon and caption',button.element,'column-gap',8],['form grouping',section.element,'row-gap',12],
      ['dialog heading',dialog.element.querySelector<HTMLElement>('.pui-dialog-heading')!,'column-gap',16],['dialog inset',dialog.element,'padding-left',24],
    ];
    return rows.map(([id,node,property,expected]) => ({id,expected,actual:parseFloat(getComputedStyle(node).getPropertyValue(property))}));
  });
  for (const item of measurements) expect.soft(item.actual,item.id).toBe(item.expected);
});

test('product action groups and reading surfaces use only standard interior spacing',async ({page}) => {
  const measurements = await page.evaluate(async () => {
    const ui = await import('../src/internal-components.js');
    const settings = ui.createSettingsPanel({baseUrl:'https://example.test',hasApiKey:true,ready:true});
    const permission = ui.createPermissionControl({mode:'ask',description:'Ask before changes'});
    const actions = ui.createResourceActions({kind:'skill',workspaceId:'workspace',resource:{name:'demo',path:'/workspace/demo.md'}});
    const conversation = ui.createConversationView(); conversation.update({id:'conversation',working:false,messages:[{id:'message',role:'assistant',text:'```ts\nconst value = 1;\n```',actions:{copy:'Copy answer',edit:true}}]});
    for (const block of [settings,permission,actions,conversation]) document.body.append(block.element);
    const nodes: Array<[string,HTMLElement,string[]]> = [
      ['settings fields',settings.element.querySelector<HTMLElement>('.pui-settings-field')!,['row-gap']],
      ['settings actions',settings.element.querySelector<HTMLElement>('.pui-modal-footer')!,['column-gap','margin-top','padding-top']],
      ['permission',permission.element,['column-gap']],['resource actions',actions.element.querySelector<HTMLElement>('.pui-file-actions')!,['column-gap']],
      ['message actions',conversation.element.querySelector<HTMLElement>('.pui-message-actions')!,['column-gap']],
      ['code toolbar',conversation.element.querySelector<HTMLElement>('.pui-code-toolbar')!,['column-gap','padding-top','padding-right']],
    ];
    return nodes.flatMap(([id,node,properties])=>properties.map(property=>({id:id+' '+property,value:parseFloat(getComputedStyle(node).getPropertyValue(property))})));
  });
  for (const item of measurements) expect.soft(spaces,item.id).toContain(item.value);
});

test('ordinary and compact fields keep their 40 and 30 CSS px interaction heights',async ({page}) => {
  const measurements = await page.evaluate(async () => {
    const ui = await import('../src/internal-components.js'); const result: Array<{id: string; actual: number; expected: number}> = [];
    for (const density of ['normal','compact'] as const) {
      const blocks = [ui.createButton({label:'Action',density}),ui.createTextInput({label:'Text',value:'中文 Text',density}),ui.createSearchInput({label:'Search',density}),ui.createSelect({label:'Choice',density,options:[{value:'a',label:'Alpha'},{value:'b',label:'Beta'}]})];
      for (const [index,block] of blocks.entries()) {document.body.append(block.element); const node = block.element.querySelector<HTMLElement>('[role="combobox"]') || ('control' in block ? block.control : block.element); result.push({id:density+' control '+index,actual:node.getBoundingClientRect().height,expected:density === 'normal' ? 40 : 30});}
    }
    return result;
  });
  for (const item of measurements) expect.soft(item.actual,item.id).toBe(item.expected);
});

test('product form actions use ordinary dimensions and resource actions use the compact context',async ({page}) => {
  const samples = await page.evaluate(async () => {
    const ui = await import('../src/internal-components.js'); const settings = ui.createSettingsPanel({baseUrl:'https://example.test',hasApiKey:true,ready:true});
    const resource = ui.createResourceActions({kind:'skill',workspaceId:'workspace',resource:{name:'demo',path:'/workspace/demo.md'}});
    document.body.append(settings.element,resource.element);
    const rows: Array<[HTMLButtonElement,string,number,number]> = [[settings.field<HTMLButtonElement>('save-settings'),'ordinary',40,14],[resource.element.querySelector<HTMLButtonElement>('[data-sdk="use-resource"]')!,'compact',30,12]];
    return rows.map(([node,id,height,size])=>{const style = getComputedStyle(node); return {id,height,size,actualHeight:node.getBoundingClientRect().height,actualSize:parseFloat(style.fontSize),line:parseFloat(style.lineHeight)};});
  });
  for (const sample of samples) {expect.soft(sample.actualHeight,sample.id+' height').toBe(sample.height); expect.soft(sample.actualSize,sample.id+' text size').toBe(sample.size); expect.soft(sample.line,sample.id+' line ratio').toBeCloseTo(sample.actualSize*1.5,3);}
});

test('file actions keep their compact dimensions inside feature and settings dialogs',async ({page}) => {
  const result = await page.evaluate(async () => {
    const ui = await import('../src/internal-components.js'); const samples: Array<{context: string; height: number; size: string; line: string; padding: string}> = []; let calls = 0;
    for (const context of ['standalone','feature dialog','settings dialog']) {
      const actions = ui.createResourceActions({kind:'skill',workspaceId:'workspace',resource:{name:'demo',path:'/workspace/demo.md'}},{onResourceAction() {calls++;}});
      let frame: ReturnType<typeof ui.createFeatureDialogFrame> | undefined;
      let settings: ReturnType<typeof ui.createSettingsPanel> | undefined;
      if (context === 'standalone') document.body.append(actions.element);
      else {
        frame = ui.createFeatureDialogFrame();
        if (context === 'settings dialog') {
          settings = ui.createSettingsPanel({baseUrl:'https://example.test',hasApiKey:true,ready:true});
          settings.setCredential({status:'Configured',hidden:false,required:false,placeholder:'Saved key',removeVisible:false,actions:actions.element});
          frame.open({title:'Settings',body:settings});
        } else frame.open({title:'Resources',body:actions});
      }
      const button = actions.element.querySelector<HTMLButtonElement>('[data-sdk="use-resource"]')!, css = getComputedStyle(button);
      samples.push({context,height:button.getBoundingClientRect().height,size:css.fontSize,line:css.lineHeight,padding:css.padding}); button.click();
      frame?.destroy(); settings?.destroy(); actions.destroy();
    }
    return {samples,calls};
  });
  expect(result.calls).toBe(3);
  for (const sample of result.samples) expect.soft(sample,sample.context).toEqual({context:sample.context,height:30,size:'12px',line:'18px',padding:'4px 8px'});
});

test('code Copy keeps its compact dimensions inside preview and settings dialogs',async ({page}) => {
  const result = await page.evaluate(async () => {
    const ui = await import('../src/internal-components.js'); const samples: Array<{context: string; height: number; size: string; line: string; padding: string}> = []; let calls = 0;
    for (const context of ['standalone','feature dialog','settings dialog']) {
      const preview = ui.createFilePreview({onCopyCode() {calls++;}}); preview.open({name:'Example.md',path:'/workspace/Example.md',actions:document.createTextNode('')}); preview.update({kind:'markdown',text:'```ts\nconst value = 1;\n```'});
      let frame: ReturnType<typeof ui.createFeatureDialogFrame> | undefined;
      let settings: ReturnType<typeof ui.createSettingsPanel> | undefined;
      if (context === 'standalone') document.body.append(preview.element);
      else {
        frame = ui.createFeatureDialogFrame();
        if (context === 'settings dialog') {
          settings = ui.createSettingsPanel({baseUrl:'https://example.test',hasApiKey:true,ready:true});
          settings.setCredential({status:'Configured',hidden:false,required:false,placeholder:'Saved key',removeVisible:false,actions:preview.element});
          frame.open({title:'Settings',body:settings});
        } else frame.open({title:'Preview',body:preview});
      }
      const button = preview.element.querySelector<HTMLButtonElement>('[data-copy-code]')!, css = getComputedStyle(button);
      samples.push({context,height:button.getBoundingClientRect().height,size:css.fontSize,line:css.lineHeight,padding:css.padding}); button.click();
      frame?.destroy(); settings?.destroy(); preview.destroy();
    }
    return {samples,calls};
  });
  expect(result.calls).toBe(3);
  for (const sample of result.samples) expect.soft(sample,sample.context).toEqual({context:sample.context,height:30,size:'12px',line:'18px',padding:'4px 8px'});
});

test('the retained compact conversation action keeps its compact geometry and text role',async ({page}) => {
  const result = await page.evaluate(async () => {
    const {createWorkspaceShell} = await import('../src/internal-components.js'); const shell = createWorkspaceShell({brand:document.createTextNode('Example')}); document.body.append(shell.element);
    const button = shell.element.querySelector<HTMLButtonElement>('[data-sdk="compact"]')!, css = getComputedStyle(button);
    const result = {height:button.getBoundingClientRect().height,size:css.fontSize,line:css.lineHeight,padding:css.padding}; shell.destroy(); return result;
  });
  expect(result).toEqual({height:30,size:'12px',line:'18px',padding:'4px 8px'});
});

test('the compatible compact secondary button stays compact inside a feature dialog',async ({page}) => {
  const result = await page.evaluate(async () => {
    const ui = await import('../src/internal-components.js'); const button = ui.createButton({label:'Compact action',appearance:'secondary',density:'compact'}), frame = ui.createFeatureDialogFrame();
    frame.open({title:'Example',body:button}); const css = getComputedStyle(button.element);
    const result = {height:button.element.getBoundingClientRect().height,size:css.fontSize,line:css.lineHeight,padding:css.padding}; frame.destroy(); return result;
  });
  expect(result).toEqual({height:30,size:'12px',line:'18px',padding:'4px 8px'});
});

test('native multiple-row choice retains 16 px text and platform keyboard selection',async ({page}) => {
  await page.evaluate(async () => {
    const {createSelect} = await import('../src/internal-components.js'); const list = createSelect({label:'Models',size:5,multiple:true,options:Array.from({length:8},(_,index)=>({value:String(index),label:'Model '+index}))}); document.body.append(list.element);
  });
  const list = page.getByRole('listbox',{name:'Models'});
  expect(await list.evaluate(node=>getComputedStyle(node).fontSize)).toBe('16px');
  expect(await list.locator('option').first().evaluate(node=>getComputedStyle(node).fontSize)).toBe('16px');
  await list.focus(); await list.press('Home'); await list.press('ArrowDown');
  expect(await list.evaluate((node: HTMLSelectElement)=>[...node.selectedOptions].map(option=>option.value))).toEqual(['1']);
  await list.selectOption(['2','4']); expect(await list.evaluate((node: HTMLSelectElement)=>[...node.selectedOptions].map(option=>option.value))).toEqual(['2','4']);
  await expect(list).toBeFocused();
});

test('the product model list uses readable native text without turning into a dropdown',async ({page}) => {
  await page.evaluate(async () => {
    const {createModelEditor} = await import('../src/internal-components.js');
    const editor = createModelEditor({providers:[{id:'demo',name:'Demo'}],models:['first','second','third'].map(id=>({id,name:id,provider:'demo',supportsImages:false,contextWindow:1000,maxTokens:100})),selection:{provider:'demo',model:'first',thinkingLevel:'off'}},{onChange(value) {document.body.dataset.selectedModel = value.model;}});
    document.body.append(editor.element);
  });
  const models = page.getByRole('listbox',{name:'Choose model',exact:true});
  expect.soft(await models.evaluate(node=>getComputedStyle(node).fontSize),'product native model text').toBe('16px');
  expect.soft(await models.locator('option').first().evaluate(node=>getComputedStyle(node).fontSize),'product native model option').toBe('16px');
  expect(await models.evaluate(node=>node.getBoundingClientRect().height)).toBeGreaterThan(40);
  await models.focus(); await models.press('Home'); await models.press('ArrowDown');
  await expect(models).toHaveValue('second'); await expect(models).toBeFocused();
  expect(await page.evaluate(()=>document.body.dataset.selectedModel)).toBe('second');
});

test('responsive welcome text keeps the same approved roles at narrow and desktop widths',async ({page}) => {
  await page.evaluate(async () => {
    const {createWelcomeView} = await import('../src/internal-components.js'); const container = document.createElement('div'); container.className = 'pui-welcome'; document.body.append(container);
    createWelcomeView({container}).update({hasApiKey:false,hasConnections:false,modelName:''});
  });
  for (const width of [360,900,1440]) {
    await page.setViewportSize({width,height:800});
    const samples = await page.locator('.pui-welcome').evaluate(root=>[root.querySelector('h1')!,root.querySelector<HTMLElement>('.pui-welcome-description')!].map(node=>{const style = getComputedStyle(node); return {tag:node.tagName,size:parseFloat(style.fontSize),line:parseFloat(style.lineHeight)};}));
    for (const sample of samples) {expect.soft(sample.size,width+' '+sample.tag+' role').toBe(sample.tag === 'H1' ? 16 : 14); expect.soft(sample.line,width+' '+sample.tag+' line ratio').toBeCloseTo(sample.size*1.5,3);}
  }
});

test('fixed presentation preserves field validation, dropdown keyboard use and draft focus',async ({page}) => {
  await page.evaluate(async () => {
    const ui = await import('../src/internal-components.js'); const form = document.createElement('form');
    const field = ui.createTextInput({label:'Name',required:true}), select = ui.createSelect({label:'Provider',value:'first',options:[{value:'first',label:'First'},{value:'blocked',label:'Unavailable',disabled:true},{value:'second',label:'Second'}]}), save = ui.createButton({label:'Save',type:'submit'});
    form.addEventListener('submit',event=>{event.preventDefault(); document.body.dataset.saved = field.getValue()+':'+select.getValue();}); form.append(field.element,select.element,save.element); document.body.append(form);
  });
  await page.getByRole('button',{name:'Save',exact:true}).click(); expect(await page.evaluate(()=>document.body.dataset.saved)).toBeUndefined();
  const input = page.getByRole('textbox',{name:'Name',exact:false}); await expect(input).toBeFocused(); await input.fill('未保存 draft');
  const choice = page.getByRole('combobox',{name:'Provider',exact:true}); await choice.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  await expect(choice).toBeFocused(); await expect(choice).toHaveText('Second');
  await page.getByRole('button',{name:'Save',exact:true}).click(); expect(await page.evaluate(()=>document.body.dataset.saved)).toBe('未保存 draft:second');
  await input.focus(); await input.evaluate((node: HTMLInputElement)=>node.setSelectionRange(1,5));
  await expect(input).toHaveValue('未保存 draft'); await expect(input).toBeFocused();
  expect(await input.evaluate((node: HTMLInputElement)=>[node.selectionStart,node.selectionEnd])).toEqual([1,5]);
});
