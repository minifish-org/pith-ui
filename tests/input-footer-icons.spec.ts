import {test, expect} from '@playwright/test';

// Archived 52c0d4d production + 0.3.1 cascade, measured in both engines:
// the later .pui-icon rule overrides the primitive18px default with19px.
// The earlier18px expectation in this new regression was a cascade misread.
// Only the primary send glyph is17px with a2px stroke (styles483–487).
test('an input footer keeps quiet attachment and primary send icon measures distinct', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const ui = await import('../src/index.js');
    ui.mount(document.body, ui.createStack({children: [ui.createSurface({
      content: ui.createPromptInput({label: 'Message'}),
      footer: ui.createToolbar({label: 'Input actions',
        leading: ui.createIconButton({label: 'Attach image', icon: 'image', context: 'inline'}),
        trailing: ui.createIconButton({label: 'Send message', icon: 'arrow', intent: 'primary', context: 'inline'})}),
    }), ui.createIconButton({label: 'Standalone inline image', icon: 'image', context: 'inline'})]}));
  });
  const attachment = page.getByRole('button', {name: 'Attach image', exact: true}).locator('svg');
  const send = page.getByRole('button', {name: 'Send message', exact: true}).locator('svg');
  const standalone = page.getByRole('button', {name: 'Standalone inline image', exact: true}).locator('svg');
  await expect(attachment).toHaveCSS('width', '19px');
  await expect(attachment).toHaveCSS('height', '19px');
  await expect(send).toHaveCSS('width', '17px');
  await expect(send).toHaveCSS('height', '17px');
  await expect(send).toHaveCSS('stroke-width', '2px');
  await expect(standalone).toHaveCSS('width', '17px');
  await expect(standalone).toHaveCSS('height', '17px');
});
