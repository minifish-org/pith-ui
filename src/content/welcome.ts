import { escape, icon } from '../dom.js';
import type { UIBlock } from '../core.js';

export interface WelcomeState {
  workspace?: { name: string; path: string };
  hasApiKey: boolean;
  hasConnections: boolean;
  modelName: string;
}
export interface WelcomeOptions {
  container?: HTMLElement;
  logo?: Node;
  onAction?: (action: 'model' | 'settings' | 'workspace') => void;
  onPrompt?: (text: string) => void;
}

export function createWelcomeView(options: WelcomeOptions = {}): UIBlock<WelcomeState> {
  const element = options.container || document.createElement('div');
  let destroyed = false; let signature = '';
  const click = (event: Event) => {
    const action = (event.target as Element).closest<HTMLElement>('[data-welcome-action], [data-prompt]');
    if (!action || !element.contains(action) || (action instanceof HTMLButtonElement && action.disabled)) return;
    if (action.dataset.prompt && options.onPrompt) {event.stopPropagation(); options.onPrompt(action.dataset.prompt);}
    else if (action.dataset.welcomeAction && options.onAction) {event.stopPropagation(); options.onAction(action.dataset.welcomeAction as 'model' | 'settings' | 'workspace');}
  };
  element.addEventListener('click', click);
  return {
    element,
    update(state): void {
      if (destroyed) return;
      const next = JSON.stringify(state); if (next === signature) return; signature = next;
      const workspace = state.workspace;
      const ready = !!workspace && state.hasApiKey;
      element.innerHTML = `<div class="pui-welcome-mark"></div>
        <p class="pui-eyebrow">YOUR LOCAL WORK COMPANION</p>
        <h1>${ready ? 'What are we working on?' : 'Your work. A little more possible.'}</h1>
        <p class="pui-welcome-description">An agent that works alongside you, with your files<br class="pui-desktop-break"> and the tools you choose.</p>
        ${!ready ? `<div class="pui-setup-card">
          <div class="pui-setup-card-heading">Make yourself at home <span>Two quick steps</span></div>
          <button type="button" class="pui-setup-step" data-welcome-action="${state.hasConnections ? 'model' : 'settings'}"><span class="pui-step-number ${state.hasApiKey ? 'pui-complete' : ''}">${state.hasApiKey ? icon('check') : '1'}</span><span><strong>${state.hasApiKey ? 'Model selected' : state.hasConnections ? 'Choose a model' : 'Connect a provider'}</strong><small>${state.hasApiKey ? escape(state.modelName) : state.hasConnections ? 'Your provider connection is ready' : 'Bring your provider API key'}</small></span>${icon('chevron')}</button>
          <button type="button" class="pui-setup-step" data-welcome-action="workspace"><span class="pui-step-number ${workspace ? 'pui-complete' : ''}">${workspace ? icon('check') : '2'}</span><span><strong>${workspace ? escape(workspace.name) : 'Choose a workspace'}</strong><small>${workspace ? escape(workspace.path) : 'A folder Pith can help you work in'}</small></span>${icon('chevron')}</button>
        </div>` : `<div class="pui-welcome-workspace">${icon('folder')}<span>Working in <strong>${escape(workspace.name)}</strong></span><button class="pui-secondary-button" type="button" data-welcome-action="workspace">Change</button></div>
        <div class="pui-suggestions"><button type="button" data-prompt="Explore this workspace and give me a concise overview of its files.">${icon('file')}Explore my workspace</button><button type="button" data-prompt="Help me plan a task. Start by asking what I want to accomplish.">${icon('chat')}Think through a task</button><button type="button" data-prompt="I'd like help creating a document in this workspace. Ask me what it should cover.">${icon('plus')}Create something</button></div>`}
        <div class="pui-welcome-footnote">${icon('shield')}Local workspace. Your choice of model.</div>`;
      if (options.logo) element.querySelector('.pui-welcome-mark')!.append(options.logo.cloneNode(true));
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      element.removeEventListener('click', click);
      element.replaceChildren();
    },
  };
}
