import { expect, test } from '@playwright/test';

test('enhancing compact choices preserves native intrinsic sizing and composer wrapping', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const sizes = await page.evaluate(async () => {
    const path = '/src/workspace.ts'; const { createComposerView } = await import(path);
    const observations: unknown[] = [];
    for (const width of [340, 400, 480, 600]) {
      const composer = createComposerView();
      composer.update({ model: { label: 'Example model' }, thinking: { options: ['low', 'medium', 'high'].map(value => ({ value, label: value })), value: 'high' } });
      const enhanced = document.createElement('div'), native = document.createElement('div');
      enhanced.style.width = native.style.width = `${width}px`;
      enhanced.append(composer.element);
      const original = composer.element.cloneNode(true) as HTMLElement;
      for (const wrapper of original.querySelectorAll('.pui-select')) {
        const select = wrapper.querySelector('select')!;
        select.classList.remove('pui-select-backing'); select.removeAttribute('aria-hidden'); select.removeAttribute('tabindex');
        wrapper.replaceWith(select);
      }
      native.append(original); document.body.append(enhanced, native);
      const measure = (node: HTMLElement) => ({
        height: node.getBoundingClientRect().height,
        permission: node.querySelector('.pui-permission-control')!.getBoundingClientRect().width,
        effort: node.querySelector('.pui-composer-thinking')!.getBoundingClientRect().width,
      });
      observations.push({ width, enhanced: measure(composer.element), native: measure(original) });
      composer.destroy(); enhanced.remove(); native.remove();
    }
    return observations as Array<{ width: number; enhanced: { height: number; permission: number; effort: number }; native: { height: number; permission: number; effort: number } }>;
  });
  for (const observation of sizes) {
    expect(observation.enhanced.height, `composer height at ${observation.width}px`).toBeCloseTo(observation.native.height, 1);
    expect(observation.enhanced.permission, `permission width at ${observation.width}px`).toBeCloseTo(observation.native.permission, 1);
    expect(observation.enhanced.effort, `effort width at ${observation.width}px`).toBeCloseTo(observation.native.effort, 1);
  }
});
