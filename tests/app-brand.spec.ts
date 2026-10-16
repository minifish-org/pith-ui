import {test, expect} from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.goto('/tests/fixture.html');
  // createApplication owns the document theme root, as in the real host. A
  // second .pui root on the generic fixture body would reset inherited tokens.
  await page.evaluate(() => document.body.classList.remove('pui'));
});

for (const viewport of [{width: 1280, welcome: 32}, {width: 600, welcome: 27}]) {
  test(`the named Pith mark preserves the original geometry at ${viewport.width}px`, async ({page}) => {
    await page.setViewportSize({width: viewport.width, height: 800});
    const result = await page.evaluate(async () => {
      const entry = '/src/app/index.ts'; const {createApplication} = await import(entry);
      const app = createApplication(document.body, {appearance: 'light', brand: {name: 'Pith', qualifier: 'Desk', mark: {symbol: 'pith', alt: ''}}});
      app.workspace.updateWelcome({hasApiKey: true, hasConnections: true, modelName: 'Example'});
      const original = document.createElement('div');
      original.className = 'pui';
      original.innerHTML = '<span class="pui-logo-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span><div class="pui-welcome-mark"><span class="pui-logo-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span></div>';
      document.body.append(original);
      const measure = (mark: Element | null) => {
        if (!(mark instanceof HTMLElement)) return null;
        const style = getComputedStyle(mark), bounds = mark.getBoundingClientRect();
        return {
          tag: mark.tagName, width: style.width, height: style.height, gap: style.gap,
          transform: style.transform, overflow: style.overflow,
          bounds: {width: bounds.width, height: bounds.height},
          hidden: mark.getAttribute('aria-hidden'),
          tiles: Array.from(mark.children, tile => {
            const style = getComputedStyle(tile);
            return {tag: tile.tagName, width: style.width, height: style.height, radius: style.borderRadius, opacity: style.opacity, background: style.backgroundColor};
          }),
        };
      };
      const actual = [measure(document.querySelector('.pui-brand .pui-logo-mark')), measure(document.querySelector('.pui-welcome .pui-logo-mark'))];
      const expected = [measure(original.querySelector(':scope > .pui-logo-mark')), measure(original.querySelector('.pui-welcome-mark .pui-logo-mark'))];
      const images = document.querySelectorAll('.pui-brand img, .pui-welcome .pui-welcome-mark img').length;
      app.destroy(); original.remove(); return {actual, expected, images};
    });
    expect(result.images).toBe(0);
    for (const [index, size] of [24, viewport.welcome].entries()) {
      const mark = result.actual[index];
      expect(mark).not.toBeNull();
      const original = result.expected[index]!;
      expect({...mark, bounds: undefined}).toEqual({...original, bounds: undefined});
      // The reference is at a different page position; transformed DOMRect
      // subtraction may differ below one hundredth of a CSS pixel.
      expect(mark!.bounds.width).toBeCloseTo(original.bounds.width, 2);
      expect(mark!.bounds.height).toBeCloseTo(original.bounds.height, 2);
      expect(mark).toMatchObject({tag: 'SPAN', width: `${size}px`, height: `${size}px`, gap: index ? '4px' : '3px', overflow: 'visible', hidden: 'true'});
      expect(mark!.bounds.width).toBeGreaterThan(size);
      expect(mark!.bounds.height).toBeGreaterThan(size);
      expect(mark!.tiles).toHaveLength(4);
      expect(mark!.tiles.map(tile => tile.radius)).toEqual(['2px', '2px 9px 2px 2px', '2px 2px 2px 9px', '2px']);
      expect(mark!.tiles.map(tile => tile.opacity)).toEqual(['1', '0.7', '0.7', '1']);
      expect(mark!.tiles.every(tile => tile.tag === 'I' && tile.background === 'rgb(74, 98, 200)')).toBe(true);
    }
  });
}

test('the named Pith mark follows every theme without replacing its nodes or exposing visual options', async ({page}) => {
  await page.emulateMedia({colorScheme: 'dark'});
  await page.evaluate(async () => {
    const entry = '/src/app/index.ts'; const {createApplication} = await import(entry);
    const app = createApplication(document.body, {appearance: 'light', brand: {name: 'Pith', mark: {symbol: 'pith', alt: 'Pith symbol'}}});
    const welcome = {hasApiKey: true, hasConnections: true, modelName: 'First'};
    app.workspace.updateWelcome(welcome);
    const marks = Array.from(document.querySelectorAll('.pui-logo-mark'));
    (window as unknown as {pithBrand: {appearance(mode: 'light' | 'dark' | 'system'): void; stable(): boolean}}).pithBrand = {
      appearance(mode) {app.setAppearance(mode); app.workspace.updateWelcome({...welcome, modelName: mode});},
      stable() {return marks.length === 2 && marks.every((mark, index) => mark === document.querySelectorAll('.pui-logo-mark')[index]);},
    };
  });
  const marks = page.getByRole('img', {name: 'Pith symbol', exact: true});
  await expect(marks).toHaveCount(2);
  const tiles = page.locator('.pui-logo-mark > i:first-child');
  await expect(tiles.nth(0)).toHaveCSS('background-color', 'rgb(74, 98, 200)');
  await expect(tiles.nth(1)).toHaveCSS('background-color', 'rgb(74, 98, 200)');
  await page.evaluate(() => (window as unknown as {pithBrand: {appearance(mode: 'dark'): void}}).pithBrand.appearance('dark'));
  await expect(tiles.nth(0)).toHaveCSS('background-color', 'rgb(134, 182, 242)');
  await expect(tiles.nth(1)).toHaveCSS('background-color', 'rgb(134, 182, 242)');
  await page.evaluate(() => (window as unknown as {pithBrand: {appearance(mode: 'system'): void}}).pithBrand.appearance('system'));
  await expect(tiles.nth(0)).toHaveCSS('background-color', 'rgb(134, 182, 242)');
  await page.emulateMedia({colorScheme: 'light'});
  await expect(tiles.nth(0)).toHaveCSS('background-color', 'rgb(74, 98, 200)');
  await expect(tiles.nth(1)).toHaveCSS('background-color', 'rgb(74, 98, 200)');
  expect(await page.evaluate(() => (window as unknown as {pithBrand: {stable(): boolean}}).pithBrand.stable())).toBe(true);
});
