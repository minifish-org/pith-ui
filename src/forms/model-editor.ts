import type { UIBlock } from '../core.js';
import { escape, uniqueId } from '../dom.js';
import {adoptProductParts,reconcileSelectOptions as optionsInto} from '../foundations.js';
export interface ModelProviderOption {
    id: string;
    name: string;
    model?: string;
    thinkingLevel?: string;
}
export interface ModelOption {
    id: string;
    name: string;
    provider: string;
    thinkingLevels?: readonly string[] | null;
    supportsImages: boolean;
    contextWindow: number;
    maxTokens: number;
}
export interface ModelEditorState {
    providers: readonly ModelProviderOption[] | null;
    models: readonly ModelOption[] | null;
    selection: ModelSelection;
    disabled?: boolean;
}
export interface ModelSelection {
    provider: string;
    model: string;
    thinkingLevel: string;
}
export interface ModelEditorBlock extends UIBlock<ModelEditorState> {
    read(): ModelSelection;
    reset(selection: ModelSelection): void;
    focus(): void;
}
export function thinkingLabel(level: string): string { return level === 'off' ? 'Thinking off' : `Thinking: ${level === 'xhigh' ? 'extra high' : level}`; }
export function modelEditorMarkup(prefix: string): string { prefix = escape(prefix); return `<label class="pui-field-label" for="${prefix}-provider">Provider</label><select class="pui-feature-select" id="${prefix}-provider" required disabled><option value="">Loading providers…</option></select><label class="pui-field-label" for="${prefix}-search">Model</label><input id="${prefix}-search" type="search" placeholder="Search by model name or ID" autocomplete="off" /><label class="pui-sr-only" for="${prefix}-model">Choose model</label><select id="${prefix}-model" class="pui-model-list" size="6" required disabled></select><p id="${prefix}-capabilities" class="pui-field-hint" aria-live="polite"></p><label class="pui-field-label" id="${prefix}-thinking-label" for="${prefix}-thinking">Thinking effort</label><select id="${prefix}-thinking" class="pui-feature-select" aria-describedby="${prefix}-capabilities" required></select><p class="pui-field-hint">Built-in models come from the Pith SDK catalog. Custom models use your saved definitions. Availability depends on your endpoint and account.</p>`; }
export function createModelEditor(initial: ModelEditorState, options: {
    prefix?: string;
    element?: HTMLElement;
    onChange?: (selection: ModelSelection) => void;
} = {}): ModelEditorBlock {
    const prefix = options.prefix || uniqueId('pui-model');
    const element = options.element || document.createElement('div');
    if (!options.element) {
        element.className = 'pui-model-editor';
        element.innerHTML = modelEditorMarkup(prefix);
    }
    const field = <T extends HTMLElement = HTMLElement>(id: string) => { const result = Array.from(element.querySelectorAll<HTMLElement>('[id]')).find(node => node.id === prefix + '-' + id); if (!result)
        throw new Error(`Unknown model field: ${id}`); return result as T; };
    const provider = field<HTMLSelectElement>('provider'), model = field<HTMLSelectElement>('model'), search = field<HTMLInputElement>('search'), effort = field<HTMLSelectElement>('thinking');
    const parts = adoptProductParts(element), abort = new AbortController();
    let destroyed = false, initialized = false, signature = '', selected = '';
    let state: Readonly<ModelEditorState> = initial;
    const read = (): ModelSelection => ({ provider: parts.control(provider).getValue(), model: parts.control(model).getValue(), thinkingLevel: parts.control(effort).getValue() });
    const disabled = () => { parts.control(provider).update({ disabled: !!state.disabled || !state.providers?.length }); parts.control(model).update({ disabled: !!state.disabled || !model.options.length }); parts.control(effort).update({ disabled: !!state.disabled || effort.options.length < 2 }); parts.control(search).update({disabled:!!state.disabled}); };
    const capabilities = (preferred = effort.value) => {
        selected = model.value;
        const entry = (state.models || []).find(entry => entry.provider === provider.value && entry.id === selected);
        const levels = entry?.thinkingLevels?.length ? entry.thinkingLevels : ['off'];
        optionsInto(effort, levels.map(level => ({ value: level, label: thinkingLabel(level) })));
        parts.control(effort).reset(levels.includes(preferred) ? preferred : levels.includes('high') ? 'high' : levels.includes('medium') ? 'medium' : levels[0]);
        effort.hidden = levels.length < 2;
        field('thinking-label').hidden = effort.hidden;
        field('capabilities').textContent = entry ? `${entry.supportsImages ? 'Text + images' : 'Text only'} · ${new Intl.NumberFormat('en').format(entry.contextWindow)} context tokens · ${new Intl.NumberFormat('en').format(entry.maxTokens)} max output tokens` : 'No matching models.';
        disabled();
    };
    const renderModels = (preferred = effort.value) => {
        const query = search.value.trim().toLowerCase();
        const entries = (state.models || []).filter(entry => entry.provider === provider.value && (entry.id === selected || `${entry.name} ${entry.id}`.toLowerCase().includes(query)));
        optionsInto(model, entries.map(entry => ({ value: entry.id, label: `${entry.name} — ${entry.id}` })));
        parts.control(model).reset(entries.some(entry => entry.id === selected) ? selected : entries[0]?.id || '');
        capabilities(preferred);
    };
    const chooseProvider = (selection?: ModelSelection) => {
        const entry = state.providers?.find(entry => entry.id === provider.value);
        search.value = '';
        selected = selection && selection.provider === provider.value ? selection.model : entry?.model || '';
        renderModels(selection && selection.provider === provider.value ? selection.thinkingLevel : entry?.thinkingLevel || 'high');
    };
    const reset = (selection: ModelSelection) => { if (destroyed)
        return; parts.control(provider).reset(state.providers?.some(entry => entry.id === selection.provider) ? selection.provider : state.providers?.[0]?.id || ''); chooseProvider(selection); };
    const update = (next: Readonly<ModelEditorState>) => {
        if (destroyed)
            return;
        const draft = read();
        state = next;
        const nextSignature = JSON.stringify([next.providers, next.models]);
        if (nextSignature !== signature) {
            signature = nextSignature;
            optionsInto(provider, (state.providers || []).map(entry => ({ value: entry.id, label: entry.name })));
            if (!initialized || !draft.provider)
                reset(next.selection);
            else {
                parts.control(provider).reset(state.providers?.some(entry => entry.id === draft.provider) ? draft.provider : state.providers?.[0]?.id || '');
                selected = draft.model;
                renderModels(draft.thinkingLevel);
            }
            initialized = true;
        }
        disabled();
    };
    provider.addEventListener('change', () => chooseProvider(), { signal: abort.signal });
    model.addEventListener('change', () => capabilities(), { signal: abort.signal });
    search.addEventListener('input', () => renderModels(), { signal: abort.signal });
    element.addEventListener('change', () => options.onChange?.(read()), { signal: abort.signal });
    update(initial);
    return { element, update, read, reset, focus() { parts.control(search).focus(); }, destroy() { if (destroyed)
            return; destroyed = true; abort.abort(); parts.destroy(); if (!options.element)
            element.remove(); } };
}
