import {test, expect} from '@playwright/test';
import type {AppArtifactsState, AppFileTarget, Application, ActionResult} from '../src/app/index.js';

interface ArtifactActionFixture {
  app: Application;
  state: AppArtifactsState;
  events: {action: string; target: AppFileTarget}[];
  releases: Partial<Record<string, (result: ActionResult) => void>>;
  button?: HTMLButtonElement;
}
declare global {
  interface Window {artifactActionFixture: ArtifactActionFixture}
}

test.beforeEach(async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const entry = '/src/app/index.ts';
    const {createApplication} = await import(entry);
    const mount = document.createElement('div'); document.body.append(mount);
    const fixture: ArtifactActionFixture = {
      app: createApplication(mount, {appearance: 'light'}),
      state: {ownerId: 'chat-a', files: [{name: 'Report', path: 'report.md'}], loading: false, error: '', copyMode: 'path'},
      events: [], releases: {},
    };
    const action = (action: string, target: AppFileTarget) => {
      fixture.events.push({action, target});
      return new Promise<ActionResult>(resolve => {fixture.releases[action] = resolve;});
    };
    fixture.app.files.updateArtifacts(fixture.state, {
      onPreview: target => action('preview', target), onFileAction: action,
    });
    window.artifactActionFixture = fixture;
  });
  await page.getByRole('button', {name: 'Conversation files (1 file)', exact: true}).click();
});
test.afterEach(async ({page}) => {
  await page.evaluate(() => window.artifactActionFixture?.app.destroy());
});

test('a pointer-triggered native action preserves the existing platform focus and dismissal behavior', async ({page, browserName}) => {
  const button = page.getByRole('button', {name: 'Open', exact: true});
  await button.evaluate(button => {window.artifactActionFixture.button = button as HTMLButtonElement;});
  await button.click();
  // Chromium blurs a focused button when it becomes disabled; WebKit does not
  // focus that button on pointer activation. Preserve the native distinction.
  await expect.poll(() => page.evaluate(() => ({
    pending: window.artifactActionFixture.button!.disabled,
    open: window.artifactActionFixture.app.files.areArtifactsOpen(),
    calls: window.artifactActionFixture.events.length,
  }))).toEqual({pending: true, open: browserName === 'webkit', calls: 1});
  await page.evaluate(() => window.artifactActionFixture.releases.open!({ok: true}));
  if (browserName === 'chromium') await page.getByRole('button', {name: 'Conversation files (1 file)', exact: true}).click();
  await expect(button).toBeVisible();
  await expect(button).toBeEnabled();
});

for (const action of ['open', 'reveal', 'preview'] as const) {
  const label = action[0]!.toUpperCase() + action.slice(1);
  test(`${label} reports pending and merges external disabled snapshots without duplicate requests`, async ({page}) => {
    const button = page.getByRole('button', {name: label, exact: true});
    await button.evaluate(button => {window.artifactActionFixture.button = button as HTMLButtonElement;});
    await button.dispatchEvent('click');
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute('aria-busy', 'true');
    for (const disabled of [true, false, true]) {
      await page.evaluate(disabled => {
        const fixture = window.artifactActionFixture;
        fixture.state = {...fixture.state, files: [{name: 'Updated report', path: 'report.md'}], loading: true, disabled};
        fixture.app.files.updateArtifacts(fixture.state);
      }, disabled);
      await expect(button).toBeDisabled();
      await expect(button).toHaveAttribute('aria-busy', 'true');
      expect(await button.evaluate(button => button === window.artifactActionFixture.button)).toBe(true);
      await button.dispatchEvent('click');
    }
    expect(await page.evaluate(() => window.artifactActionFixture.events)).toEqual([
      {action, target: {owner: {kind: 'artifact', id: 'chat-a'}, name: 'Report', path: 'report.md'}},
    ]);
    await page.evaluate(action => window.artifactActionFixture.releases[action]!({ok: true}), action);
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute('aria-busy', 'false');
    await page.evaluate(() => {
      const fixture = window.artifactActionFixture;
      fixture.state = {...fixture.state, loading: false, disabled: false};
      fixture.app.files.updateArtifacts(fixture.state);
    });
    await expect(button).toBeEnabled();
    await button.dispatchEvent('click');
    expect(await page.evaluate(() => window.artifactActionFixture.events)).toEqual([
      {action, target: {owner: {kind: 'artifact', id: 'chat-a'}, name: 'Report', path: 'report.md'}},
      {action, target: {owner: {kind: 'artifact', id: 'chat-a'}, name: 'Updated report', path: 'report.md'}},
    ]);
    await page.evaluate(action => window.artifactActionFixture.releases[action]!({ok: true}), action);
    await expect(button).toBeEnabled();
    await expect(button).toHaveAttribute('aria-busy', 'false');
  });

  test(`${label} failure restores availability, reports the error and does not retry`, async ({page}) => {
    const button = page.getByRole('button', {name: label, exact: true});
    await button.dispatchEvent('click');
    await page.evaluate(action => window.artifactActionFixture.releases[action]!({ok: false, error: 'Native action refused'}), action);
    await expect(page.getByRole('alert').filter({hasText: 'Native action refused'})).toBeVisible();
    await expect(button).toBeEnabled();
    await expect(button).toHaveAttribute('aria-busy', 'false');
    expect(await page.evaluate(() => window.artifactActionFixture.events.length)).toBe(1);
    await button.dispatchEvent('click');
    expect(await page.evaluate(() => window.artifactActionFixture.events.length)).toBe(2);
    await page.evaluate(action => window.artifactActionFixture.releases[action]!({ok: true}), action);
    await expect(button).toBeEnabled();
  });
}

for (const transition of ['owner', 'removed-row', 'destroy'] as const) test(`late artifact results cannot change a ${transition} replacement`, async ({page}) => {
  await page.getByRole('button', {name: 'Open', exact: true}).dispatchEvent('click');
  await page.evaluate(transition => {
    const fixture = window.artifactActionFixture;
    fixture.releases.old = fixture.releases.open;
    if (transition === 'destroy') {fixture.app.files.destroy(); return;}
    if (transition === 'removed-row') fixture.app.files.updateArtifacts({...fixture.state, files: []});
    fixture.state = {...fixture.state, ownerId: transition === 'owner' ? 'chat-b' : 'chat-a', files: [{name: 'Current report', path: 'report.md'}]};
    fixture.app.files.updateArtifacts(fixture.state);
  }, transition);
  if (transition !== 'destroy') {
    if (!await page.getByText('Current report', {exact: true}).isVisible()) await page.getByRole('button', {name: 'Conversation files (1 file)', exact: true}).click();
    const current = page.getByRole('button', {name: 'Open', exact: true});
    await current.dispatchEvent('click');
    await expect(current).toBeDisabled();
  }
  await page.evaluate(() => window.artifactActionFixture.releases.old!({ok: false, error: 'Stale artifact failure'}));
  await expect(page.getByText('Stale artifact failure', {exact: true})).toHaveCount(0);
  if (transition === 'destroy') {
    await expect(page.getByRole('button', {name: 'Open', exact: true})).toHaveCount(0);
  } else {
    const current = page.getByRole('button', {name: 'Open', exact: true});
    await expect(page.getByText('Current report', {exact: true})).toBeVisible();
    await expect(current).toBeDisabled();
    await page.evaluate(() => window.artifactActionFixture.releases.open!({ok: true}));
    await expect(current).toBeEnabled();
    expect(await page.evaluate(() => window.artifactActionFixture.events.map(event => event.target.owner.id))).toEqual(['chat-a', transition === 'owner' ? 'chat-b' : 'chat-a']);
  }
});

test('native action and copy controllers retain their own pending state through shared snapshots', async ({page}) => {
  const copy = page.locator('article [data-file-action="copy-path"]');
  const open = page.getByRole('button', {name: 'Open', exact: true});
  await copy.dispatchEvent('click'); await expect(copy).toBeDisabled();
  await open.dispatchEvent('click'); await expect(open).toBeDisabled();
  await page.evaluate(() => {
    const fixture = window.artifactActionFixture;
    fixture.app.files.updateArtifacts({...fixture.state, disabled: false});
  });
  await expect(copy).toBeDisabled();
  await expect(copy).toHaveAttribute('aria-busy', 'true');
  await expect(open).toBeDisabled();
  await expect(open).toHaveAttribute('aria-busy', 'true');
  await page.evaluate(() => window.artifactActionFixture.releases.open!({ok: true}));
  await expect(open).toBeEnabled();
  await expect(copy).toBeDisabled();
  await expect(copy).toHaveAttribute('aria-busy', 'true');
  await copy.dispatchEvent('click');
  expect(await page.evaluate(() => window.artifactActionFixture.events.map(event => event.action))).toEqual(['copy-path', 'open']);
  await page.evaluate(() => {
    const fixture = window.artifactActionFixture;
    fixture.state = {...fixture.state, disabled: true};
    fixture.app.files.updateArtifacts(fixture.state);
    fixture.releases['copy-path']!({ok: true});
  });
  await expect(copy).toHaveText('Copied');
  await expect(copy).toBeDisabled(); await expect(open).toBeDisabled();
  await expect(copy).toHaveText('Copy path');
  await expect(copy).toHaveAttribute('aria-busy', 'false');
  await expect(copy).toBeDisabled();
  await page.evaluate(() => {
    const fixture = window.artifactActionFixture;
    fixture.app.files.updateArtifacts({...fixture.state, disabled: false});
  });
  await expect(copy).toBeEnabled(); await expect(open).toBeEnabled();
});
