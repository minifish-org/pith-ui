import {test, expect, type Locator, type Page} from '@playwright/test';

interface ActionStyleFixture {
  setDisabled(disabled: boolean): void;
  calls: number;
  destroy(): void;
}
declare global {interface Window {actionStyleFixture: ActionStyleFixture}}

const labels = ['Add skill', 'Save settings', 'Save connection', 'Theme choice'];

async function mountActions(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async theme => {
    const {setAppearance} = await import('../src/theme.js');
    const {createResourcesPanel} = await import('../src/files/panels.js');
    const {createSettingsPanel, createMCPConnectionsPanel} = await import('../src/forms/panels.js');
    const {createSelect} = await import('../src/primitives.js');
    setAppearance(document.body, theme);
    const start = document.createElement('button'); start.textContent = 'Keyboard start';
    const calls = () => {window.actionStyleFixture.calls++; return {ok: true as const};};
    const resources = createResourcesPanel({onCreate: calls});
    resources.open('Style regression project');
    resources.update({instructions: [], skills: [], templates: [], diagnostics: []});
    const settingsState = {baseUrl: 'https://example.com/v1', hasApiKey: true, ready: true};
    const settings = createSettingsPanel(settingsState, {onSubmit: calls});
    const mcp = createMCPConnectionsPanel({}, {onSubmit: calls});
    const choiceState = {label: 'Theme choice', options: [{value: 'system', label: 'System'}, {value: 'light', label: 'Light'}]};
    const choice = createSelect(choiceState);
    document.body.append(start, resources.element, settings.element, mcp.element, choice.element);
    window.actionStyleFixture = {
      calls: 0,
      setDisabled(disabled) {resources.setCreateDisabled(disabled); settings.update({...settingsState, disabled}); mcp.update({disabled}); choice.update({...choiceState, disabled});},
      destroy() {resources.destroy(); settings.destroy(); mcp.destroy(); choice.destroy();},
    };
  }, theme);
}

async function appearance(button: Locator) {
  return button.evaluate(element => {
    const style = getComputedStyle(element), rect = element.getBoundingClientRect();
    return {width: rect.width, height: rect.height, padding: style.padding, font: style.font,
      border: style.border, radius: style.borderRadius, color: style.color, background: style.backgroundColor};
  });
}

for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: native text, multiline and list fields retain their accepted disabled feedback`, async ({page}) => {
    await mountActions(page, theme);
    const opacity = await page.evaluate(async () => {
      const {createTextInput, createTextArea, createSelect} = await import('../src/primitives.js');
      const fields = [createTextInput({label: 'Native text', disabled: true}), createTextArea({label: 'Native multiline', disabled: true}),
        createSelect({label: 'Native list', multiple: true, size: 3, disabled: true, options: [{value: 'one', label: 'One'}]})];
      document.body.append(...fields.map(field => field.element));
      const values = fields.map(field => ({disabled: field.control.disabled, opacity: getComputedStyle(field.control).opacity}));
      fields.forEach(field => field.destroy());
      return values;
    });
    expect(opacity).toEqual(Array.from({length: 3}, () => ({disabled: true, opacity: '0.5'})));
  });

  test(`${theme}: resource, settings, MCP and choice buttons share disabled feedback without shifting layout`, async ({page}) => {
    await mountActions(page, theme);
    const buttons = labels.map(name => page.getByRole(name === 'Theme choice' ? 'combobox' : 'button', {name, exact: true}).filter({visible: true}));
    const before = await Promise.all(buttons.map(appearance));
    await page.evaluate(() => window.actionStyleFixture.setDisabled(true));
    for (const [index, button] of buttons.entries()) {
      await expect(button).toBeDisabled();
      // WebKit can defer an offscreen opacity transition; inspect the actual
      // visible control without changing its disabled styling or assertions.
      await button.scrollIntoViewIfNeeded();
      await expect.soft(button).toHaveCSS('opacity', '0.45', {timeout: 1000});
      await expect.soft(button).toHaveCSS('cursor', 'not-allowed', {timeout: 1000});
      expect(await appearance(button)).toEqual(before[index]);
      await button.dispatchEvent('click');
    }
    expect(await page.evaluate(() => window.actionStyleFixture.calls)).toBe(0);
    await page.evaluate(() => window.actionStyleFixture.setDisabled(false));
    for (const [index, button] of buttons.entries()) {
      await expect(button).toBeEnabled();
      await button.scrollIntoViewIfNeeded();
      await expect(button).toHaveCSS('opacity', '1');
      expect(await appearance(button)).toEqual(before[index]);
    }
  });

  test(`${theme}: re-enabled actions remain keyboard reachable without painting a focus ring`, async ({page, browserName}) => {
    await mountActions(page, theme);
    await page.evaluate(() => {window.actionStyleFixture.setDisabled(true); window.actionStyleFixture.setDisabled(false);});
    await page.getByRole('button', {name: 'Keyboard start', exact: true}).focus();
    const reached = new Set<string>();
    for (let step = 0; step < 60 && reached.size < labels.length; step++) {
      // macOS WebKit's full-control traversal uses Option-Tab when system
      // keyboard navigation is off; preserve that native browser preference.
      await page.keyboard.press(browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab');
      const focus = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement;
        const style = getComputedStyle(element);
        const labelledBy = element.getAttribute('aria-labelledby')?.split(/\s+/).map(id => document.getElementById(id)?.textContent?.trim() || '').join(' ');
        return {label: labelledBy || element.getAttribute('aria-label') || element.textContent?.trim() || '',
          visible: element.matches(':focus-visible'), outline: style.outlineStyle, shadow: style.boxShadow};
      });
      if (!labels.includes(focus.label)) continue;
      reached.add(focus.label);
      expect(focus.visible).toBe(true);
      expect(focus.outline).toBe('none');
      expect(focus.shadow).toBe('none');
    }
    expect([...reached].sort()).toEqual([...labels].sort());
  });
}

test.afterEach(async ({page}) => {await page.evaluate(() => window.actionStyleFixture?.destroy());});
