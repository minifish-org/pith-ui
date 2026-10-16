import {createApplication} from '../src/app/index.js';

// Compiled with the public examples. These rejected programs are part of the
// consumer contract, rather than documentation that merely asks callers to
// avoid capabilities the type system still exposes.
export function applicationContract(mount: HTMLElement): void {
  const app = createApplication(mount, {
    appearance: 'system',
    brand: {name: 'Pith', qualifier: 'Desk', mark: {src: '/brand.svg', alt: 'Pith'}},
    host: {copyText: async (text) => {void text; return {ok: true};}},
  });
  app.workspace.resetDraft('中文 draft');
  app.workspace.updateConversation({id: 'conversation', working: false, messages: [{id: 'message', role: 'assistant', text: 'Safe Markdown'}]});
  app.settings.openSettings({baseUrl: 'https://example.test/v1', hasApiKey: true, ready: true}, {
    onSubmit: async (draft) => {void draft.apiKey; return {ok: true};},
  });
  // @ts-expect-error Application consumers cannot reach the internal root.
  void app.element;
  // @ts-expect-error Internal selectors are not an application interface.
  app.workspace.part('messages');
  // @ts-expect-error Input is controlled through semantic draft methods.
  void app.workspace.input;
  // @ts-expect-error No visual options on the application factory.
  createApplication(mount, {className: 'custom-layout'});
  // @ts-expect-error No arbitrary style overrides.
  createApplication(mount, {style: {padding: '20px'}});
  // @ts-expect-error Compact presentation is library-owned.
  createApplication(mount, {density: 'compact'});
  // @ts-expect-error A brand is controlled data, not HTML or an arbitrary node.
  createApplication(mount, {brand: document.createElement('span')});
  // @ts-expect-error The factory does not accept a rendering callback.
  createApplication(mount, {renderHeader: () => document.createElement('header')});
  // @ts-expect-error Status uses a closed semantic type rather than a Node.
  app.workspace.updateNavigation({groups: [{id: 'workspace', name: 'Work', path: '/work', expanded: true, selected: true, children: [{id: 'conversation', active: true, status: document.createElement('span')}]}], empty: null});
  const settings = app.settings.openSettings({baseUrl: '', hasApiKey: false}, {});
  // @ts-expect-error Even type-only consumers cannot get a DOM field adapter.
  settings.field('api-key');
  // @ts-expect-error Credentials cannot accept free DOM action slots.
  settings.setCredential({status: '', hidden: false, required: false, placeholder: '', removeVisible: false, actions: document.createElement('button')});
  app.destroy();
}
