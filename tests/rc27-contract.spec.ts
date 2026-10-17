import {test, expect} from '@playwright/test';
import type {RC27Scenario} from './rc27-contract-fixture.js';
import {readContract, stageContract} from './rc27-contract-data.js';
import {supportsFrozenRC27, assertFrozenRC27Environment} from './rc27-contract-environment.js';

/**
 * Textual baseline captured before replacing the rc.27 templates.
 * Normal runs only compare. Updating requires the explicit
 * RC27_UPDATE_CONTRACT=1 flag; Playwright's --update-snapshots cannot rewrite it.
 * Every generated ID and IDREF shares one mapping, preserving wiring evidence.
 */
const scenarios = [
  'shell', 'welcome-unconfigured', 'welcome-model', 'navigation-menu', 'navigation-empty',
  'conversation', 'conversation-expanded', 'conversation-find', 'conversation-image', 'conversation-unavailable', 'conversation-streaming',
  'composer', 'composer-stop', 'composer-queue', 'tasks', 'approval-command', 'task-failure', 'task-failure-settings',
  'workspace-picker', 'rename', 'message-editor', 'queue-editor', 'confirmation', 'full-access',
  'history-loading', 'history', 'settings-loading', 'settings', 'settings-probing',
  'connections-http', 'connections-stdio', 'model-loading', 'model-picker',
  'connection-loading', 'custom-connection', 'login-link', 'login-text', 'login-secret', 'login-choice', 'login-error',
  'resources-loading', 'resources', 'resource-loading', 'resource-create', 'resource-editor', 'resource-readonly',
  'artifacts', 'preview-text', 'preview-markdown', 'preview-diff', 'preview-image',
] satisfies readonly RC27Scenario[];
const update = process.env.RC27_UPDATE_CONTRACT === '1';
if (update && !supportsFrozenRC27) throw new Error('Record rc.27 geometry only in the documented baseline environment.');
test.skip(!supportsFrozenRC27, 'Exact frozen rc.27 geometry uses recorded macOS fonts and native controls; live old/new and behavior suites remain cross-platform.');
test.beforeAll(async ({browser}, info) => {assertFrozenRC27Environment(info.project.name, browser.version());});
const shortScenarios = new Set<RC27Scenario>(['shell', 'composer', 'tasks', 'custom-connection', 'model-picker']);
test.use({locale: 'en-US', timezoneId: 'Asia/Singapore'});

for (const appearance of ['light', 'dark'] as const) {
  for (const scenario of scenarios) {
    for (const size of shortScenarios.has(scenario) ? ['wide', 'short'] as const : ['wide'] as const) {
      test(`rc.27 ${scenario}, ${appearance}, ${size}`, async ({page}, testInfo) => {
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.setViewportSize(size === 'wide' ? {width: 1280, height: 800} : {width: 900, height: 568});
        await page.emulateMedia({reducedMotion: 'no-preference', colorScheme: appearance});
        await page.goto(`/tests/rc27-contract-fixture.html?scenario=${scenario}&appearance=${appearance}`);
        await expect(page.locator('html')).toHaveAttribute('data-contract-ready', scenario);
        expect(errors).toEqual([]);
        const contract = await page.evaluate(() => {
          // Freeze at a known frame without overriding library motion rules;
          // computed durations/keyframe names still describe normal rendering.
          for (const animation of document.getAnimations()) {
            if (animation.effect?.getTiming().iterations === Infinity) {animation.pause(); animation.currentTime = 0;}
            else animation.finish();
          }
          const fixture = window.rc27;
          const all = [...document.querySelectorAll('[id]')];
          const ids = new Map<string, string>();
          const duplicates: string[] = [];
          for (const node of all) {
            if (ids.has(node.id)) duplicates.push(node.id);
            else ids.set(node.id, `id${ids.size + 1}`);
          }
          // Unresolved IDREFs are retained verbatim with a visible marker rather
          // than erased, so normalization cannot hide a newly broken reference.
          const reference = (value: string) => value.split(/\s+/).map(id => ids.get(id) ?? `unresolved:${id.replace(/pui-app-\d+-/g, 'pui-app-N-')}`).join(' ');
          const attributes = (element: Element) => Object.fromEntries([...element.attributes]
            .filter(attribute => attribute.name !== 'src' || !/^(?:blob:|data:)/.test(attribute.value))
            .map(({name, value}) => [name,
              name === 'id' ? ids.get(value)! : /^(?:for|aria-labelledby|aria-describedby|aria-controls|aria-owns|data-close)$/.test(name) ? reference(value) :
              name === 'href' && value.startsWith('#') ? `#${reference(value.slice(1))}` :
              value.replace(/pui-app-\d+-/g, 'pui-app-N-')])
            .sort(([a], [b]) => a!.localeCompare(b!)));
          const styleProperties = [
            'display', 'position', 'box-sizing', 'color', 'background-color', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-align', 'text-decoration-line',
            'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
            'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width', 'border-top-color', 'border-top-style',
            'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
            'gap', 'row-gap', 'column-gap', 'align-items', 'justify-content', 'flex-direction', 'flex-grow', 'flex-shrink', 'grid-template-columns',
            'min-width', 'max-width', 'min-height', 'max-height', 'overflow-x', 'overflow-y', 'opacity', 'visibility',
            'outline-style', 'outline-width', 'box-shadow', 'animation-name', 'animation-duration', 'transition-property', 'transition-duration',
          ];
          const styles: Record<string, string>[] = [];
          let styleDefaults: Record<string, string> | undefined;
          const styleIds = new Map<string, number>();
          const round = (value: number) => Math.round(value * 100) / 100;
          type Captured = {tag: string; attrs?: Record<string, string>; text?: string; state?: unknown; box?: number[]; scroll?: number[]; style?: number; children?: Captured[]};
          const capture = (element: Element): Captured => {
            const entry: Captured = {tag: element.localName};
            const attrs = attributes(element); if (Object.keys(attrs).length) entry.attrs = attrs;
            const text = [...element.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent || '').join('');
            if (text.trim()) entry.text = /^(pre|code|textarea)$/.test(element.localName) ? text : text.replace(/\s+/g, ' ').trim();
            if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
              entry.state = {value: element.value, disabled: element.disabled, ...(element instanceof HTMLSelectElement ? {selected: [...element.selectedOptions].map(option => option.value)} : {readOnly: element.readOnly}), ...(element instanceof HTMLInputElement ? {checked: element.checked} : {})};
            } else if (element instanceof HTMLButtonElement) entry.state = {disabled: element.disabled};
            else if (element instanceof HTMLDetailsElement || element instanceof HTMLDialogElement) entry.state = {open: element.open};
            const rect = element.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && !['path', 'circle', 'line', 'polyline', 'rect', 'g'].includes(element.localName)) {
              const style = getComputedStyle(element);
              entry.box = [rect.x, rect.y, rect.width, rect.height].map(round);
              const values = styleProperties.map(property => style.getPropertyValue(property));
              const signature = JSON.stringify(values);
              let index = styleIds.get(signature);
              if (index === undefined) {
                const full = Object.fromEntries(styleProperties.map((property, i) => [property, values[i]!]));
                styleDefaults ??= full;
                const delta = Object.fromEntries(Object.entries(full).filter(([property, value]) => styleDefaults![property] !== value));
                index = styles.length; styleIds.set(signature, index); styles.push(delta);
              }
              entry.style = index;
              if (element instanceof HTMLElement && (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1)) entry.scroll = [element.clientWidth, element.clientHeight, element.scrollWidth, element.scrollHeight];
            }
            if (element.children.length) entry.children = [...element.children].map(capture);
            return entry;
          };
          const roots = fixture.roots.flatMap(selector => [...document.querySelectorAll(selector)]);
          if (!roots.length) throw new Error(`No roots for ${fixture.scenario}: ${fixture.roots.join(', ')}`);
          const structure = roots.map(capture);
          const focused = document.activeElement;
          const focus = focused ? {tag: focused.localName, ...(focused.id ? {id: ids.get(focused.id)} : {}), ...(focused.getAttribute('aria-label') ? {label: focused.getAttribute('aria-label')} : {})} : null;
          return {baseline: {desk: '3f1ee24', ui: '897f46a', npm: '0.2.2'}, scenario: fixture.scenario,
            appearance: document.documentElement.dataset.theme!, viewport: [innerWidth, innerHeight],
            body: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
            modal: fixture.app.read().hasModal, duplicates, focus, styleDefaults: styleDefaults!, styles, structure};
        });
        expect(contract.duplicates).toEqual([]);
        const name = `${testInfo.project.name}-${appearance}-${size}-${scenario}`;
        if (update) {
          await stageContract(name, contract);
        } else {
          const expected = await readContract(name);
          expect(contract).toEqual(expected);
        }
        await page.evaluate(() => window.rc27.dispose());
        await expect(page.locator('#contract-root')).toBeEmpty();
      });
    }
  }
}
