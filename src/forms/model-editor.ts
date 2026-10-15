import type { UIBlock } from '../core.js';
import { escape, uniqueId } from '../dom.js';
import { modelEditorMarkup } from './panels.js';
export interface ModelProviderOption {id: string; name: string; model?: string; thinkingLevel?: string}
export interface ModelOption {id: string; name: string; provider: string; thinkingLevels?: readonly string[] | null; supportsImages: boolean; contextWindow: number; maxTokens: number}
export interface ModelEditorState {providers: readonly ModelProviderOption[] | null; models: readonly ModelOption[] | null; selection: ModelSelection}
export interface ModelSelection {provider: string; model: string; thinkingLevel: string}
export function thinkingLabel(level: string): string { return level === 'off' ? 'Thinking off' : `Thinking: ${level === 'xhigh' ? 'extra high' : level}`; }
export function createModelEditor(initial: ModelEditorState, options: {prefix?: string; element?: HTMLElement; onChange?: (selection: ModelSelection) => void} = {}): UIBlock<ModelEditorState> & {read(): ModelSelection} {
 const prefix = options.prefix || uniqueId('pui-model');
 const element = options.element || document.createElement('div');
 if (!options.element) {element.className = 'pui-model-editor'; element.innerHTML = modelEditorMarkup(prefix);}
 const $ = <T extends HTMLElement = HTMLElement>(id: string) => {const field = Array.from(element.querySelectorAll<HTMLElement>('[id]')).find((node) => node.getAttribute('id') === id); if (!field) throw new Error(`Unknown model field: ${id}`); return field as T;};
 let binding = new AbortController(); let destroyed = false; let signature = '';
 const read = (): ModelSelection => ({provider: $<HTMLSelectElement>(`${prefix}-provider`).value, model: $<HTMLSelectElement>(`${prefix}-model`).value, thinkingLevel: $<HTMLSelectElement>(`${prefix}-thinking`).value});
 const update = (state: Readonly<ModelEditorState>) => {
  if (destroyed) return;
  const next = JSON.stringify(state); if (next === signature) return; signature = next;
  binding.abort(); binding = new AbortController();
  const catalog = state; const selection = state.selection;
        const providers = catalog.providers || [];
        const providerSelect = $<HTMLSelectElement>(`${prefix}-provider`);
        const modelSelect = $<HTMLSelectElement>(`${prefix}-model`);
        const search = $<HTMLInputElement>(`${prefix}-search`);
        const effort = $<HTMLSelectElement>(`${prefix}-thinking`);
        providerSelect.innerHTML = providers.map((entry) => `<option value="${escape(entry.id)}">${escape(entry.name)}</option>`).join('');
        providerSelect.disabled = providers.length === 0;
        providerSelect.value = providers.some((entry) => entry.id === selection.provider) ? selection.provider! : providers[0]?.id || '';
        let selected = '';
        const capabilities = () => {
            selected = modelSelect.value;
            const model = (catalog.models || []).find((entry) => entry.provider === providerSelect.value && entry.id === selected);
            const previous = effort.value;
            const levels = model?.thinkingLevels || ['off'];
            effort.innerHTML = levels.map((level) => `<option value="${escape(level)}">${escape(thinkingLabel(level))}</option>`).join('');
            effort.value = levels.includes(previous) ? previous : levels.includes('high') ? 'high' : levels.includes('medium') ? 'medium' : levels[0];
            effort.disabled = levels.length < 2;
            effort.hidden = levels.length < 2;
            $(`${prefix}-thinking-label`).hidden = levels.length < 2;
            $(`${prefix}-capabilities`).textContent = model ? `${model.supportsImages ? 'Text + images' : 'Text only'} · ${new Intl.NumberFormat('en').format(model.contextWindow)} context tokens · ${new Intl.NumberFormat('en').format(model.maxTokens)} max output tokens` : 'No matching models.';
        };
        const renderModels = () => {
            const query = search.value.trim().toLowerCase();
            const models = (catalog.models || []).filter((entry) => entry.provider === providerSelect.value && (entry.id === selected || `${entry.name} ${entry.id}`.toLowerCase().includes(query)));
            modelSelect.innerHTML = models.map((entry) => `<option value="${escape(entry.id)}">${escape(entry.name)} — ${escape(entry.id)}</option>`).join('');
            modelSelect.disabled = models.length === 0;
            modelSelect.value = models.some((entry) => entry.id === selected) ? selected : models[0]?.id || '';
            capabilities();
        };
        const chooseProvider = () => {
            const provider = providers.find((entry) => entry.id === providerSelect.value);
            if (!provider)
                return;
            search.value = '';
            selected = provider.model || (provider.id === selection.provider ? selection.model : '');
            effort.innerHTML = `<option value="${escape(provider.thinkingLevel || selection.thinkingLevel || 'high')}"></option>`;
            renderModels();
        };
        providerSelect.addEventListener('change', chooseProvider, {signal: binding.signal});
        modelSelect.addEventListener('change', capabilities, {signal: binding.signal});
        search.addEventListener('input', renderModels, {signal: binding.signal});
        chooseProvider();

  if (options.onChange) element.addEventListener('change', () => options.onChange!(read()), {signal: binding.signal});
 };
 update(initial);
 return {element, update, read, destroy() {if (destroyed) return; destroyed = true; binding.abort(); if (!options.element) element.remove();}};
}
