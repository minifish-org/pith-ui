import {test,expect,type Page} from '@playwright/test';

type Result = {ok: true} | {ok: false;error: string};
interface State {phase: string;message: string;url?: string;code?: string;prompt?: string;promptType?: string;options?: readonly {id: string;label: string}[] | null;error?: string;disabled?: boolean}
interface Session {update(state: State): void;fail(message: string): void;close(): void;isOpen(): boolean;destroy(): void}
interface Harness {session: Session;initial: State;answers: string[];externals: string[];cancelled: number;closed: number;answerReleases: Array<(result: Result) => void>;externalReleases: Array<(result: Result) => void>;cancelReleases: Array<(result: Result) => void>;control?: HTMLInputElement;shared?: {setAppearance(mode: 'light' | 'dark'): void;destroy(): void}}
declare global {interface Window {loginPartsHarness: Harness}}
const prompt: State = {phase: 'prompt',message: 'Continue sign-in.',prompt: 'Enter account',promptType: 'text'};
interface Options {state?: State;appearance?: 'light' | 'dark';pendingAnswer?: boolean;pendingExternal?: boolean;pendingCancel?: boolean;applicationContext?: boolean}

async function openLogin(page: Page,old: boolean,options: Options = {}): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async ({old,options,prompt}) => {
    const appearance = options.appearance ?? 'light';document.documentElement.classList.add('pui');document.documentElement.dataset.appearance = appearance;document.body.dataset.appearance = appearance;
    const opener = document.createElement('button');opener.id = 'login-opener';opener.textContent = 'Login opener';document.body.append(opener);opener.focus();const mount = document.body.appendChild(document.createElement('div'));if (!old && options.applicationContext) mount.classList.add('pui-app');
    const h = {initial: options.state ?? prompt,answers: [],externals: [],cancelled: 0,closed: 0,answerReleases: [],externalReleases: [],cancelReleases: []} as unknown as Harness;
    const external = (url: string): Result | Promise<Result> => {h.externals.push(url);return options.pendingExternal ? new Promise(resolve => h.externalReleases.push(resolve)) : {ok: true};};
    const callbacks = {onAnswer(answer: string): Result | Promise<Result> {h.answers.push(answer);return options.pendingAnswer ? new Promise(resolve => h.answerReleases.push(resolve)) : {ok: true};},
      onCancel(): Result | Promise<Result> {h.cancelled++;return options.pendingCancel ? new Promise(resolve => h.cancelReleases.push(resolve)) : {ok: true};},onClose() {h.closed++;}};
    if (old) {const path = '/src/app/index.ts';const {createApplication} = await import(path);h.session = createApplication(mount,{appearance,host: {openExternal: external}}).settings.openProviderLogin(h.initial,callbacks);}
    else {const path = '/examples/assemblies/provider-login.ts';const {mountProviderLogin} = await import(path);h.session = mountProviderLogin(mount,h.initial,{...callbacks,onOpenExternal: external},{appearance});}
    window.loginPartsHarness = h;
  },{old,options,prompt});
  await expect(page.getByRole('dialog',{name: 'Provider sign-in',exact: true})).toBeVisible();
}

async function presentation(page: Page): Promise<unknown> {
  return page.evaluate(async () => {
    await document.fonts.ready;for (const animation of document.getAnimations()) if (animation.effect?.getTiming().iterations !== Infinity) animation.finish();
    const dialog = document.querySelector('dialog[open]')!,origin = dialog.getBoundingClientRect();
    const inspect = (node: Element) => {
      const box = node.getBoundingClientRect(),style = getComputedStyle(node);
      return {tag: node.localName,text: [...node.childNodes].filter(child => child.nodeType === Node.TEXT_NODE).map(child => child.textContent).join('').trim(),
        box: [box.x-origin.x,box.y-origin.y,box.width,box.height].map(value => Math.round(value*100)/100),
        style: ['display','font-family','font-size','font-weight','line-height','color','background-color','margin-top','margin-bottom','padding-top','padding-right','padding-bottom','padding-left','border-top-width','border-top-color','border-radius','gap','overflow-x','overflow-y','min-width','min-height','height'].map(key => style.getPropertyValue(key)),role: node.getAttribute('role'),
        ...(node instanceof HTMLAnchorElement ? {href: node.getAttribute('href'),target: node.target,rel: node.rel} : {}),
        ...(node instanceof HTMLInputElement ? {type: node.type,value: node.value,disabled: node.disabled,required: node.required,autocomplete: node.autocomplete} : {}),
        ...(node instanceof HTMLSelectElement ? {value: node.value,disabled: node.disabled,required: node.required,options: [...node.options].map(option => [option.value,option.textContent])} : {}),
        ...(node instanceof HTMLButtonElement ? {type: node.type,label: node.getAttribute('aria-label'),disabled: node.disabled} : {})};
    };
    return {dialog: inspect(dialog),nodes: [...dialog.querySelectorAll('h2,p,a,strong,label,form,input,select,button,[role=alert],.pui-modal-footer')].filter(node => !node.closest('[hidden]')).map(inspect),svg: [...dialog.querySelectorAll('svg')].map(svg => svg.innerHTML),overflow: [dialog.clientWidth,dialog.scrollWidth,dialog.clientHeight,dialog.scrollHeight]};
  });
}

test('answer form visibility, inline native control, leading feedback and bounded external link need no DOM or presentation escape',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts';const p = await import(path);let opens: string[] = [];
    const field = p.createInputPart({label: 'Answer',required: true}),inline = p.createInlineGroupPart({children: [field]});
    const form = p.createFormPart({purpose: 'answer',hidden: true,children: [inline,p.createButtonPart({label: 'Continue',variant: 'primary',type: 'submit'})]});form.update({hidden: false});
    const status = p.createFeedbackPart({presentation: 'lead',message: 'Continue in your browser',tone: 'info'});
    const link = p.createLinkPart({label: 'Open browser',href: 'javascript:alert(1)',presentation: 'paragraph',onOpen(url: string) {opens.push(url);}});
    const root = p.createStackPart({children: [status,link,form]}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,root);
    const invalidHidden = mount.querySelector('a')!.parentElement!.hidden;link.update({label: 'Open browser',href: 'https://provider.example/login'});mount.querySelector('a')!.click();
    const result = {invalidHidden,opens,inline: mount.querySelector('form > span')?.localName,formHidden: mount.querySelector('form')!.hidden,lead: mount.querySelector('[role=status]')!.localName,
      safe: {target: mount.querySelector('a')!.target,rel: mount.querySelector('a')!.rel},leaks: [form,inline,status,link].some(part => Object.values(part).some(value => value instanceof Node))};tree.destroy();return result;
  });
  expect(value).toEqual({invalidHidden: true,opens: ['https://provider.example/login'],inline: 'span',formHidden: false,lead: 'p',safe: {target: '_blank',rel: 'noopener noreferrer'},leaks: false});
});

const scenarios: Record<string,State> = {starting: {phase: 'starting',message: 'Preparing sign-in…'},browser: {phase: 'browser',message: 'Continue in your browser.',url: 'https://provider.example/login?ticket=demo',code: 'VERIFY<&123'},
  prompt,secret: {...prompt,prompt: 'Enter token',promptType: 'secret'},choice: {...prompt,prompt: 'Choose account',options: [{id: 'first',label: 'First account'},{id: 'second',label: 'Second account 中文'}]},emptyChoices: {...prompt,options: []},
  complete: {phase: 'complete',message: 'Signed in.'},error: {phase: 'error',message: 'Provider sign-in failed.',error: 'Credentials were rejected.'},disabled: {...prompt,disabled: true},invalidURL: {phase: 'browser',message: 'Invalid external URL',url: 'javascript:alert(1)'},
  long: {phase: 'browser',message: 'The provider is preparing an authorization challenge. '.repeat(8),url: 'http://127.0.0.1:54819/callback',code: 'LONG-VERIFICATION-CODE-中文'}};
for (const appearance of ['light','dark'] as const) for (const [name,state] of Object.entries(scenarios)) test(`${appearance} provider login ${name} composition preserves the actual sign-in scene`,async ({page}) => {
  await page.emulateMedia({colorScheme: appearance === 'dark' ? 'light' : 'dark'});await openLogin(page,true,{state,appearance,applicationContext: true});if (name === 'error') await page.evaluate(() => window.loginPartsHarness.session.fail('Independent frame failure'));const old = await presentation(page);
  await openLogin(page,false,{state,appearance,applicationContext: true});if (name === 'error') await page.evaluate(() => window.loginPartsHarness.session.fail('Independent frame failure'));expect(await presentation(page)).toEqual(old);
});

for (const viewport of [{width: 900,height: 568},{width: 390,height: 844}]) test(`provider login ${viewport.width} preserves long challenge scrolling and prompt sizing`,async ({page}) => {
  await page.setViewportSize(viewport);const state = {...scenarios.long,phase: 'prompt',prompt: 'Enter the verification answer',promptType: 'text'};
  await openLogin(page,true,{state,applicationContext: true});const old = await presentation(page);await openLogin(page,false,{state,applicationContext: true});expect(await presentation(page)).toEqual(old);
});

test('same-prompt snapshots preserve raw answer, caret, control identity and one pending callback',async ({page}) => {
  await openLogin(page,false,{pendingAnswer: true});const field = page.getByRole('textbox',{name: 'Enter account',exact: true});await field.fill('  raw answer 中文  ');
  await field.evaluate(node => {const input = node as HTMLInputElement;input.focus();input.setSelectionRange(3,9);window.loginPartsHarness.control = input;});
  await page.evaluate(() => {const h = window.loginPartsHarness;h.session.update({...h.initial,message: 'New status',url: 'https://provider.example/sign-in',code: 'NEW-CODE'});});
  expect(await field.evaluate(node => ({same: node === window.loginPartsHarness.control,focus: node === document.activeElement,selection: [(node as HTMLInputElement).selectionStart,(node as HTMLInputElement).selectionEnd]}))).toEqual({same: true,focus: true,selection: [3,9]});
  await page.getByRole('button',{name: 'Continue',exact: true}).click();await page.evaluate(() => {const h = window.loginPartsHarness;h.session.update({...h.initial,disabled: true});h.session.update({...h.initial,disabled: false});document.querySelector('dialog[open] form')!.dispatchEvent(new SubmitEvent('submit',{bubbles: true,cancelable: true}));});
  await expect(page.getByRole('button',{name: 'Continue',exact: true})).toBeDisabled();expect(await page.evaluate(() => window.loginPartsHarness.answers)).toEqual(['  raw answer 中文  ']);
  await page.evaluate(() => window.loginPartsHarness.answerReleases[0]!({ok: false,error: 'Answer rejected'}));await expect(page.locator('dialog[open] [role=alert]').first()).toHaveText('Answer rejected');await expect(field).toHaveValue('  raw answer 中文  ');
  await page.evaluate(() => {const h = window.loginPartsHarness;h.session.update({...h.initial,message: 'Same prompt metadata'});});await expect(page.locator('dialog[open] [role=alert]').first()).toHaveText('Answer rejected');
});

test('a changed prompt signature resets only the answer operation and retires an earlier error',async ({page}) => {
  await openLogin(page,false,{pendingAnswer: true});await page.getByRole('textbox',{name: 'Enter account',exact: true}).fill('Old answer');await page.getByRole('button',{name: 'Continue',exact: true}).click();
  await page.evaluate(state => window.loginPartsHarness.session.update(state),scenarios.choice);
  await expect(page.getByRole('combobox',{name: 'Choose account',exact: true})).toBeEnabled();await expect(page.getByRole('button',{name: 'Continue',exact: true})).toBeEnabled();
  await page.evaluate(() => window.loginPartsHarness.answerReleases[0]!({ok: false,error: 'Retired answer failure'}));await expect(page.locator('dialog[open] [role=alert]').first()).toHaveText('');
  await page.getByRole('combobox',{name: 'Choose account',exact: true}).click();await page.getByRole('option',{name: 'Second account 中文',exact: true}).click();await page.getByRole('button',{name: 'Continue',exact: true}).click();expect(await page.evaluate(() => window.loginPartsHarness.answers)).toEqual(['Old answer','second']);
});

test('required text answers validate natively, while answer success waits for the provider phase instead of closing',async ({page}) => {
  await openLogin(page,false);await page.getByRole('button',{name: 'Continue',exact: true}).click();expect(await page.evaluate(() => window.loginPartsHarness.answers)).toEqual([]);
  await page.getByRole('textbox',{name: 'Enter account',exact: true}).fill('Answer');await page.getByRole('button',{name: 'Continue',exact: true}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('textbox',{name: 'Enter account',exact: true})).toHaveValue('Answer');
  await page.evaluate(state => window.loginPartsHarness.session.update(state),scenarios.complete);await expect(page.getByRole('button',{name: 'Continue',exact: true})).toHaveCount(0);await expect(page.getByRole('button',{name: 'Cancel sign-in',exact: true})).toHaveCount(0);await page.getByRole('button',{name: 'Close',exact: true}).click();expect(await page.evaluate(() => ({cancelled: window.loginPartsHarness.cancelled,closed: window.loginPartsHarness.closed}))).toEqual({cancelled: 0,closed: 1});
});

test('external links deliver only normalized HTTP URLs once while pending and report failures in the independent frame',async ({page}) => {
  await openLogin(page,false,{state: {...scenarios.browser,url: 'https://provider.example'},pendingExternal: true});const link = page.getByRole('link',{name: 'Open sign-in page in your browser ↗',exact: true});await link.click();await link.click();expect(await page.evaluate(() => window.loginPartsHarness.externals)).toEqual(['https://provider.example/']);
  await page.evaluate(state => window.loginPartsHarness.session.update(state),scenarios.complete);await page.evaluate(() => window.loginPartsHarness.externalReleases[0]!({ok: false,error: 'Browser could not be opened'}));await expect(page.locator('dialog[open] [role=alert]').last()).toHaveText('Browser could not be opened');
  await page.evaluate(state => window.loginPartsHarness.session.update(state),scenarios.invalidURL);await expect(page.getByRole('link')).toHaveCount(0);
});

for (const dismissal of ['cancel','escape','header'] as const) test(`${dismissal} dismisses one opening immediately and retires its pending answer and cancellation`,async ({page}) => {
  await openLogin(page,false,{pendingAnswer: true,pendingCancel: true});await page.getByRole('textbox',{name: 'Enter account',exact: true}).fill('Pending answer');await page.getByRole('button',{name: 'Continue',exact: true}).click();
  if (dismissal === 'cancel') await page.getByRole('button',{name: 'Cancel sign-in',exact: true}).click();else if (dismissal === 'escape') await page.keyboard.press('Escape');else await page.getByRole('button',{name: 'Close provider sign-in',exact: true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('#login-opener')).toBeFocused();
  await page.evaluate(() => {const h = window.loginPartsHarness;h.answerReleases[0]!({ok: false,error: 'Late answer'});h.cancelReleases[0]?.({ok: false,error: 'Late cancel'});h.session.update({...h.initial,error: 'Late snapshot'});h.session.fail('Late frame');h.session.destroy();});
  expect(await page.evaluate(() => ({cancelled: window.loginPartsHarness.cancelled,closed: window.loginPartsHarness.closed,open: window.loginPartsHarness.session.isOpen()}))).toEqual({cancelled: dismissal === 'cancel' ? 1 : 0,closed: 1,open: false});
});

test('a shared sign-in composition preserves a secret answer through theme changes and wipes its native field on parent destruction',async ({page}) => {
  await page.goto('/tests/fixture.html');await page.evaluate(async initial => {
    const recipePath = '/examples/assemblies/provider-login.ts',partsPath = '/src/parts/index.ts';const {composeProviderLogin} = await import(recipePath),p = await import(partsPath);
    const h = {initial,answers: [],externals: [],cancelled: 0,closed: 0,answerReleases: [],externalReleases: [],cancelReleases: []} as unknown as Harness;
    const session = composeProviderLogin(initial,{onAnswer(answer: string) {h.answers.push(answer);return new Promise<Result>(resolve => h.answerReleases.push(resolve));},onClose() {h.closed++;}});h.session = session;
    const mount = document.body.appendChild(document.createElement('div'));h.shared = p.mountParts(mount,p.createStackPart({children: [p.createTextPart({text: 'Application'}),session.part]}),{appearance: 'light'});session.open();window.loginPartsHarness = h;
  },scenarios.secret);
  const field = page.getByLabel('Enter token',{exact: true});await field.fill('Private answer');await field.evaluate(node => {const control = node as HTMLInputElement;control.focus();control.setSelectionRange(2,8);window.loginPartsHarness.control = control;});
  await page.evaluate(() => window.loginPartsHarness.shared!.setAppearance('dark'));await expect(page.getByRole('dialog')).toHaveCSS('background-color','rgb(34, 37, 42)');await expect(field).toBeFocused();expect(await field.evaluate(node => [(node as HTMLInputElement).selectionStart,(node as HTMLInputElement).selectionEnd])).toEqual([2,8]);
  await page.getByRole('button',{name: 'Continue',exact: true}).click();await page.evaluate(() => window.loginPartsHarness.shared!.destroy());
  const value = await page.evaluate(async () => {const h = window.loginPartsHarness;h.answerReleases[0]!({ok: false,error: 'Retired failure'});await new Promise(resolve => setTimeout(resolve,0));h.session.update({...h.initial,error: 'Late snapshot'});h.session.fail('Late frame');h.session.destroy();return {closed: h.closed,open: h.session.isOpen(),secret: h.control!.value};});expect(value).toEqual({closed: 1,open: false,secret: ''});await expect(page.locator('dialog,input')).toHaveCount(0);
});
