import type { ActionResult, ConversationViewState, CustomConnectionDraft, CustomConnectionState } from '../src/index.js';
type PithUI = typeof import('../src/index.js');

/** Complete API usage; the application supplies only its save operation. */
export function mountTextEditor(ui: PithUI, host: HTMLElement, save: (text: string) => Promise<ActionResult>): () => void {
  ui.setAppearance(host, 'system');
  const dialog = ui.createTextEditDialog({ title: 'Edit message', dialog: document.createElement('dialog'), onSubmit: save });
  const open = ui.createButton({ label: 'Edit', onAction: () => dialog.open({ value: 'Original message' }) });
  host.append(open.element, dialog.element);
  return () => { dialog.destroy(); open.destroy(); open.element.remove(); };
}

/** Public forms retain editable values while the host owns write identity and errors. */
export function mountConnectionEditor(ui: PithUI, host: HTMLElement, initial: CustomConnectionState, save: (draft: CustomConnectionDraft) => Promise<ActionResult>): () => void {
  const editor = ui.createCustomConnectionEditor(initial);
  const life = new ui.Lifetime();
  const guard = new ui.Generation();
  let pending = false;
  life.listen(editor.form, 'submit', (event) => {
    event.preventDefault();
    if (pending || initial.disabled) return;
    pending = true;
    const generation = guard.next();
    editor.update({ ...initial, error: '', disabled: true });
    void save(editor.read()).catch((error: unknown): ActionResult => ({ ok: false, error: error instanceof Error ? error.message : String(error) })).then((result) => {
      if (!guard.current(generation)) return;
      pending = false;
      editor.update({ ...initial, error: result.ok ? '' : result.error, disabled: false });
    });
  });
  host.append(editor.element);
  return () => { guard.destroy(); life.destroy(); editor.destroy(); };
}

/** A composed shell shares the exact message renderer and reader used by the consumer. */
export function mountConversation(ui: PithUI, host: HTMLElement, initial: ConversationViewState) {
  ui.setAppearance(host, 'system');
  const brand = document.createElement('span'); brand.textContent = 'Example';
  const shell = ui.createWorkspaceShell({ brand });
  const view = ui.createConversationView({ container: shell.part('messages'), onAction: ({ action, messageId }) => { host.dispatchEvent(new CustomEvent('message-action', { detail: { action, messageId } })); } });
  const reader = ui.installConversationReader(shell.part('chat-scroll'), view.element, shell.part('conversation-find'), shell.part<HTMLButtonElement>('back-to-latest'), { keyboardTarget: shell.element, isKeyboardBlocked: () => !!shell.element.querySelector('dialog[open]') });
  host.append(shell.element);
  const update = (state: ConversationViewState): void => { reader.beforeRender(state.id); view.update(state); reader.afterRender(); };
  update(initial);
  return { update, destroy(): void { reader.destroy(); view.destroy(); shell.destroy(); } };
}
