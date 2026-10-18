import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.goto('/tests/fixture.html');});

test('shared dialog lifecycle respects disabled cancellation, Escape and geometric backdrop closing', async ({page}) => {
  await page.evaluate(async () => {
    const {installDialogLifecycle} = await import('../src/surface.js');
    const opener = document.createElement('button'); opener.textContent = 'Open surface'; document.body.append(opener);
    const dialog = document.createElement('dialog'); dialog.style.width = '300px'; dialog.innerHTML = '<p>Dialog body</p>'; document.body.append(dialog);
    let blocked = true;
    const surface = installDialogLifecycle(dialog, {canClose: () => !blocked});
    opener.onclick = () => surface.open();
    Object.assign(window, {surfaceFixture: {allow() {blocked = false;}}});
  });
  await page.getByRole('button', {name: 'Open surface', exact: true}).click();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toBeVisible();
  await page.mouse.click(2, 2); await expect(page.getByRole('dialog')).toBeVisible();
  await page.evaluate(() => (window as unknown as {surfaceFixture: {allow(): void}}).surfaceFixture.allow());
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('button', {name: 'Open surface', exact: true})).toBeFocused();
  await page.getByRole('button', {name: 'Open surface', exact: true}).click();
  await page.mouse.click(2, 2); await expect(page.getByRole('dialog')).toBeHidden();
});

test('an explicit backdrop veto wins when the shell and a child share a dialog', async ({page}) => {
  await page.evaluate(async () => {
    const {installDialogLifecycle} = await import('../src/surface.js');
    const dialog = document.createElement('dialog'); dialog.style.width = '300px'; dialog.innerHTML = '<p>Shared body</p>'; document.body.append(dialog);
    const shell = installDialogLifecycle(dialog);
    const child = installDialogLifecycle(dialog, {closeOnBackdrop: false});
    Object.assign(window, {surfaceFixture: {child}}); shell.open();
  });
  await page.mouse.click(2, 2); await expect(page.getByRole('dialog')).toBeVisible();
  await page.evaluate(() => (window as unknown as {surfaceFixture: {child: {destroy(): void}}}).surfaceFixture.child.destroy());
  await page.mouse.click(2, 2); await expect(page.getByRole('dialog')).toBeHidden();
});

test('explicit focus returns and dialogs opened by close callbacks take precedence over default focus restoration', async ({page}) => {
  await page.evaluate(async () => {
    const {installDialogLifecycle} = await import('../src/surface.js');
    const original = document.createElement('button'); original.textContent = 'Original opener';
    const explicit = document.createElement('button'); explicit.textContent = 'Explicit return';
    const first = document.createElement('dialog'); first.innerHTML = '<button>First content</button>';
    const second = document.createElement('dialog'); second.innerHTML = '<input aria-label="Second content" />';
    document.body.append(original, explicit, first, second); original.focus();
    let next = false;
    const following = installDialogLifecycle(second);
    const current = installDialogLifecycle(first, {returnFocus: () => explicit, onClose() {if (next) following.open();}});
    current.open();
    Object.assign(window, {surfaceFixture: {reopen() {next = true; current.open();}}});
  });
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', {name: 'Explicit return', exact: true})).toBeFocused();
  await page.evaluate(() => (window as unknown as {surfaceFixture: {reopen(): void}}).surfaceFixture.reopen());
  await page.keyboard.press('Escape'); await expect(page.getByRole('textbox', {name: 'Second content', exact: true})).toBeFocused();
});
