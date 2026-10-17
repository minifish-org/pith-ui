import { element } from './dom.js';
import * as primitive from './primitives.js';
import { createPagedPreview } from './content/paged-preview.js';
import { createCopyFeedback } from './files/systems.js';
import { controlDisabled } from './core.js';
import { createOperation } from './operation.js';
import { createImageViewer } from './content/image-viewer.js';
import { installConversationReader } from './content/conversation-reader.js';
import { ownControl, controlEntry, controlNodes, checkOptions, createList } from './controls.js';
import type { Control, ActionResult, InputState, Input } from './controls.js';
export interface PromptState {
    readonly label: string;
    readonly placeholder?: string;
    readonly disabled?: boolean;
    readonly readOnly?: boolean;
    readonly error?: string;
}
export interface PromptOptions extends PromptState {
    readonly value?: string;
    readonly onInput?: (value: string) => void;
    readonly onBlur?: (value: string) => void;
    readonly onImages?: (files: readonly File[]) => void;
    readonly onSubmit?: (value: string) => void | ActionResult | Promise<void | ActionResult>;
    readonly onError?: (message: string) => void;
}
export interface PromptInput extends Control<PromptState> {
    read(): string;
    reset(value: string): void;
    insert(text: string, options?: {
        readonly separate?: boolean;
    }): void;
    focus(): void;
}
export function createPromptInput(options: PromptOptions): PromptInput {
    checkOptions(options, ['label', 'placeholder', 'disabled', 'readOnly', 'error', 'value', 'onInput', 'onBlur', 'onImages', 'onSubmit', 'onError']);
    const field = primitive.createTextArea({ ...options, onInput: undefined });
    field.element.classList.add('pui-prompt');
    const input = field.control as HTMLTextAreaElement;
    input.rows = 1;
    const abort = new AbortController(), signal = abort.signal;
    let state: PromptState = options, destroyed = false, pending = false, width = 0;
    let measuredValue:string|undefined;
    const resize = (force=false) => {
        if (destroyed) return;
        const append=!force&&measuredValue!==undefined&&input.value.startsWith(measuredValue);
        measuredValue=input.value;
        if(!append)input.style.height='auto';
        const border=input.offsetHeight-input.clientHeight;
        const height=Math.min(180,Math.max(40,input.scrollHeight+border))+'px';
        if(input.style.height!==height)input.style.height=height;
    };
    const update = (next: Readonly<PromptState>) => { checkOptions(next, ['label', 'placeholder', 'disabled', 'readOnly', 'error']); state = next; field.update({ ...next, disabled: !!next.disabled }); input.setAttribute('aria-busy', String(pending)); };
    const operation = createOperation({ unavailable: () => destroyed || !!(state.disabled || state.readOnly), onPending(value) { pending = value; update(state); }, onError(message) { update({ ...state, error: message }); options.onError?.(message); } });
    const changed = () => { resize(); options.onInput?.(input.value); };
    input.addEventListener('input', changed, { signal });
    input.addEventListener('blur', () => options.onBlur?.(input.value), { signal });
    input.addEventListener('keydown', event => {
        if (event.key !== 'Enter' || event.shiftKey || event.isComposing || !options.onSubmit || state.disabled || state.readOnly)
            return;
        event.preventDefault();
        operation.run(() => options.onSubmit!(input.value), result => {
            if (result && !result.ok)
                update({ ...state, error: result.error });
        });
    }, { signal });
    input.addEventListener('paste', event => {
        const files = [...event.clipboardData?.items ?? []].filter(item => item.type.startsWith('image/')).map(item => item.getAsFile()).filter((file): file is File => !!file);
        if (!state.disabled && !state.readOnly && files.length && options.onImages) {
            event.preventDefault();
            options.onImages(files);
        }
    }, { signal });
    const observer = new ResizeObserver(() => {
        if (width !== input.clientWidth) {
            width = input.clientWidth;
            resize(true);
        }
    });
    observer.observe(input);
    const frame = requestAnimationFrame(()=>resize(true));
    update({ label: options.label, placeholder: options.placeholder, disabled: options.disabled, readOnly: options.readOnly, error: options.error });
    return ownControl<PromptState, Pick<PromptInput, 'read' | 'reset' | 'insert' | 'focus'>>({ element: field.element, update, destroy() { destroyed = true; operation.destroy(); abort.abort(); observer.disconnect(); cancelAnimationFrame(frame); field.destroy(); } }, [], { read: () => input.value, reset(value) {
            if (destroyed)
                return;
            operation.invalidate();
            input.value = value;
            update({ ...state, error: '' });
            resize(true);
        }, insert(text, options) {
            if (destroyed || state.disabled || state.readOnly)
                return;
            if (options)
                checkOptions(options, ['separate']);
            const before = input.value.slice(0, input.selectionStart), after = input.value.slice(input.selectionEnd);
            const value = options?.separate ? (before && !/\s$/.test(before) ? ' ' : '') + text + (after && !/^\s/.test(after) ? ' ' : '') : text;
            input.setRangeText(value, input.selectionStart, input.selectionEnd, 'end');
            changed();
            input.focus();
        }, focus() {
            if (!destroyed)
                input.focus();
        } }, operation.invalidate);
}
export interface ImageState {
    readonly label: string;
    readonly source: string;
    readonly removeDisabled?: boolean;
}
export interface ImageOptions extends ImageState {
    readonly purpose?: 'content' | 'attachment' | 'brand';
    readonly onRemove?: () => void | ActionResult | Promise<void | ActionResult>;
    readonly onError?: (message: string) => void;
}
export interface ImageControl extends Control<ImageState> {
    open(): void;
    close(): void;
}
export function createImage(options: ImageOptions): ImageControl {
    checkOptions(options, ['label', 'source', 'removeDisabled', 'purpose', 'onRemove', 'onError']);
    if (options.purpose && !['content', 'attachment', 'brand'].includes(options.purpose))
        throw new Error('Unknown image purpose.');
    if (options.onRemove && options.purpose !== 'attachment')
        throw new Error('Only attachment images have a remove action.');
    const node = element('div', 'pui-image pui-image-' + (options.purpose ?? 'content')), image = element('img'), brand = options.purpose === 'brand';
    const openButton = brand ? undefined : element('button', 'pui-image-open');
    if (openButton) {
        openButton.type = 'button';
        openButton.append(image);
        node.append(openButton);
    }
    else
        node.append(image);
    let viewer: ReturnType<typeof createImageViewer> | undefined;
    let state: ImageState = { label: options.label, source: '', removeDisabled: options.removeDisabled }, destroyed = false;
    const remove = options.onRemove ? primitive.createIconButton({ label: 'Remove ' + options.label, icon: 'close', onAction: options.onRemove, onError: options.onError }) : undefined;
    if (remove) {
        remove.element.classList.add('pui-image-remove');
        node.append(remove.element);
    }
    const open = () => { if (!destroyed && state.source && node.isConnected && !brand) {
        if (!viewer) {
            viewer = createImageViewer();
            node.append(viewer.element);
        }
        viewer.open({ src: state.source, alt: state.label, returnFocus: openButton });
    } };
    const close = () => viewer?.close();
    openButton?.addEventListener('click', open);
    const validate = (source: string) => {
        if (!source)
            return;
        const url = new URL(source, document.baseURI);
        if (!['http:', 'https:', 'blob:'].includes(url.protocol) && !/^data:image\/(?:png|jpeg|gif|webp|svg\+xml)[;,]/i.test(source))
            throw new Error('Unsupported image source.');
    };
    const update = (next: Readonly<ImageState>) => {
        checkOptions(next, ['label', 'source', 'removeDisabled']);
        validate(next.source);
        if (next.source !== state.source) {
            close();
            if (next.source)
                image.src = next.source;
            else
                image.removeAttribute('src');
        }
        state = next;
        image.alt = next.label;
        if (openButton) {
            openButton.setAttribute('aria-label', 'Open ' + next.label);
            openButton.disabled = !next.source;
        }
        remove?.update({ label: 'Remove ' + next.label, icon: 'close', disabled: next.removeDisabled });
    };
    update(options.source ? { label: options.label, source: options.source, removeDisabled: options.removeDisabled } : { label: options.label, source: '' });
    return ownControl<ImageState, Pick<ImageControl, 'open' | 'close'>>({ element: node, update, destroy() { destroyed = true; openButton?.removeEventListener('click', open); viewer?.destroy(); remove?.destroy(); image.removeAttribute('src'); } }, [], { open, close });
}
export interface MessageState {
    readonly role: 'user' | 'assistant' | 'system' | 'tool';
    readonly time?: string;
    readonly status?: string;
}
export function createMessage(options: MessageState & {
    readonly content: Control;
    readonly actions?: Control;
}): Control<MessageState> {
    checkOptions(options, ['role', 'time', 'status', 'content', 'actions']);
    const children = [options.content, ...(options.actions ? [options.actions] : [])];
    controlNodes(children);
    const meta = element('div', 'pui-message-frame-meta'), body = element('div', 'pui-message-frame-body', controlEntry(options.content).node), node = element('article', 'pui-message-frame', body, meta);
    if (options.actions)
        node.append(element('div', 'pui-message-frame-actions', controlEntry(options.actions).node));
    const update = (state: Readonly<MessageState>) => {
        checkOptions(state, ['role', 'time', 'status']);
        if (!['user', 'assistant', 'system', 'tool'].includes(state.role))
            throw new Error('Unknown message role.');
        node.dataset.role = state.role;
        meta.textContent = [state.time, state.status].filter(Boolean).join(' · ');
        meta.hidden = !meta.textContent;
    };
    update({ role: options.role, time: options.time, status: options.status });
    return ownControl({ element: node, update, destroy() { } }, children);
}
export interface ReadingItem {
    readonly key: string;
    readonly revision: string;
    readonly content: Control;
}
export interface ReadingAreaState {
    readonly label: string;
    readonly identity: string;
    readonly items: readonly ReadingItem[];
    readonly viewport?: 'bounded' | 'fill';
}
export interface ReadingArea extends Control<ReadingAreaState> {
    find(): void;
    closeFind(): void;
    followLatest(): void;
    prune(identities: readonly string[]): void;
}
export interface ReadingAreaOptions extends ReadingAreaState {
    readonly empty?: Control;
}
export function createReadingArea(options: ReadingAreaOptions): ReadingArea {
    checkOptions(options, ['label', 'identity', 'items', 'viewport', 'empty']);
    controlNodes([...options.items.map(item => item.content), ...(options.empty ? [options.empty] : [])]);
    const list = createList({ items: options.items.map(({ key, content }) => ({ key, content })) }), messages = controlEntry(list).node;
    const field = primitive.createSearchInput({ label: 'Find in this conversation', placeholder: 'Find in this conversation' }), count = element('span');
    count.dataset.findCount = '';
    count.setAttribute('role', 'status');
    count.setAttribute('aria-live', 'polite');
    const previous = primitive.createIconButton({ label: 'Previous match', icon: 'down' }), next = primitive.createIconButton({ label: 'Next match', icon: 'down' }), cancel = primitive.createIconButton({ label: 'Close search', icon: 'close' }), latest = primitive.createButton({ label: 'Back to latest', icon: 'down' });
    previous.element.dataset.findPrevious = '';
    next.element.dataset.findNext = '';
    cancel.element.dataset.findClose = '';
    latest.element.classList.add('pui-back-to-latest');
    latest.element.hidden = true;
    const bar = element('div', 'pui-conversation-find pui-reader-find', field.element, count, previous.element, next.element, cancel.element);
    bar.hidden = true;
    const empty = options.empty ? element('div', 'pui-reader-empty', controlEntry(options.empty).node) : undefined;
    const scroll = element('section', 'pui-chat-scroll pui-reader-scroll', ...(empty ? [empty] : []), messages);
    scroll.tabIndex = -1;
    const node = element('section', 'pui-reading-area', bar, scroll, latest.element);
    const reader = installConversationReader(scroll, messages, bar, latest.element, { keyboardTarget: node });
    const update = (state: Readonly<ReadingAreaState>) => {
        checkOptions(state, ['label', 'identity', 'items', 'viewport']);
        if (state.viewport && !['bounded', 'fill'].includes(state.viewport))
            throw new Error('Unknown reading viewport.');
        for (const item of state.items)
            checkOptions(item, ['key', 'revision', 'content']);
        reader.beforeRender(state.identity);
        list.update({ items: state.items.map(({ key, content }) => ({ key, content })) });
        for (const item of state.items) {
            const element = controlEntry(item.content).node;
            if(element.dataset.readingId!==item.key)element.dataset.readingId = item.key;
            if(element.dataset.renderVersion!==item.revision)element.dataset.renderVersion = item.revision;
        }
        if (empty)
            empty.hidden = state.items.length > 0;
        messages.hidden = state.items.length === 0;
        scroll.setAttribute('aria-label', state.label);
        node.classList.toggle('pui-reading-fill', state.viewport === 'fill');
        reader.afterRender();
    };
    update({ label: options.label, identity: options.identity, items: options.items, viewport: options.viewport });
    return ownControl<ReadingAreaState, Pick<ReadingArea, 'find' | 'closeFind' | 'followLatest' | 'prune'>>({ element: node, update, destroy() { reader.destroy(); field.destroy(); previous.destroy(); next.destroy(); cancel.destroy(); latest.destroy(); } }, [list, ...(options.empty ? [options.empty] : [])], { find: reader.openFind, closeFind: reader.closeFind, followLatest: reader.followLatest, prune: ids => reader.prune([...ids]) });
}
export interface DropInput {
    readonly paths: readonly string[];
    readonly files: readonly File[];
    readonly uris: string;
    readonly hasUnidentifiedFiles: boolean;
}
export interface DropAreaState {
    readonly disabled?: boolean;
}
export interface DropArea extends Control<DropAreaState> {
    receiveNativeDrop(input: {
        readonly paths: readonly string[];
        readonly x: number;
        readonly y: number;
    }): void;
    clear(): void;
}
export function createDropArea(options: DropAreaState & {
    readonly content: Control;
    readonly onDrop: (input: DropInput) => void;
    readonly onError?: (message: string) => void;
}): DropArea {
    checkOptions(options, ['disabled', 'content', 'onDrop', 'onError']);
    const [child] = controlNodes([options.content]), node = element('div', 'pui-drop-area', child), abort = new AbortController(), signal = abort.signal;
    let disabled = !!options.disabled, destroyed = false;
    const clear = () => node.classList.remove('pui-drop-active');
    const deliver = (value: DropInput) => {
        if (disabled || destroyed)
            return;
        try {
            Promise.resolve(options.onDrop(value)).catch(error => {
                if (!destroyed)
                    options.onError?.(error instanceof Error ? error.message : String(error));
            });
        }
        catch (error) {
            options.onError?.(error instanceof Error ? error.message : String(error));
        }
    };
    node.addEventListener('dragover', event => {
        if (disabled)
            return;
        event.preventDefault();
        node.classList.add('pui-drop-active');
    }, { signal });
    node.addEventListener('dragleave', event => {
        if (!(event.relatedTarget instanceof Node) || !node.contains(event.relatedTarget))
            clear();
    }, { signal });
    node.addEventListener('drop', event => {
        event.preventDefault();
        clear();
        if (disabled)
            return;
        const files = [...event.dataTransfer?.files ?? []], uris = event.dataTransfer?.getData('text/uri-list') ?? '';
        deliver({ paths: [], files, uris, hasUnidentifiedFiles: files.some(file => !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type) && !(!file.type && /\.(png|jpe?g|gif|webp)$/i.test(file.name))) });
    }, { signal });
    return ownControl<DropAreaState, Pick<DropArea, 'receiveNativeDrop' | 'clear'>>({ element: node, update(state) {
            checkOptions(state, ['disabled']);
            disabled = !!state.disabled;
            if (disabled)
                clear();
        }, destroy() { destroyed = true; abort.abort(); clear(); } }, [options.content], { clear, receiveNativeDrop(input) {
            if (disabled || destroyed || !Number.isFinite(input.x) || !Number.isFinite(input.y) || !node.contains(document.elementFromPoint(input.x, input.y)))
                return;
            clear();
            deliver({ paths: [...input.paths], files: [], uris: '', hasUnidentifiedFiles: false });
        } });
}
export interface DocumentState {
    readonly text: string;
    readonly format: 'text' | 'markdown' | 'diff';
    readonly disabled?: boolean;
}
export interface DocumentOptions extends DocumentState {
    readonly onCopy?: (text: string) => ActionResult | Promise<ActionResult>;
    readonly onError?: (message: string) => void;
}
export function createDocument(options: DocumentOptions): Control<DocumentState> {
    checkOptions(options, ['text', 'format', 'disabled', 'onCopy', 'onError']);
    let state: DocumentState = options, destroyed = false;
    const node = element('div', 'pui-document'), status = element('span', 'pui-sr-only');
    status.setAttribute('role', 'status');
    const error = (value: unknown) => {
        if (!destroyed)
            options.onError?.(value instanceof Error ? value.message : String(value));
    };
    const makeFeedback = () => createCopyFeedback({ status, isDisabled: () => !!state.disabled || destroyed, onError: error });
    let feedback = makeFeedback();
    const page = createPagedPreview({ container: node, text: options.text, kind: options.format, onCopyCode: (text, button) => {
            if (!options.onCopy || state.disabled)
                return;
            void feedback.copy(button, async () => {
                const result = await options.onCopy!(text);
                if (!result.ok)
                    throw new Error(result.error);
            }, 'Code copied.');
        } });
    const sync = () => {
        for (const button of node.querySelectorAll<HTMLButtonElement>('[data-copy-code]')) {
            button.hidden = !options.onCopy;
            button.disabled = controlDisabled(button, !!state.disabled);
        }
    };
    const clicked = () => sync();
    node.addEventListener('click', clicked);
    const update = (next: Readonly<DocumentState>) => {
        checkOptions(next, ['text', 'format', 'disabled']);
        if (!['text', 'markdown', 'diff'].includes(next.format))
            throw new Error('Unknown document format.');
        if (next.text !== state.text || next.format !== state.format) {
            feedback.destroy();
            feedback = makeFeedback();
        }
        state = next;
        page.update({ text: next.text, kind: next.format });
        node.append(status);
        sync();
    };
    update({ text: options.text, format: options.format, disabled: options.disabled });
    return ownControl({ element: node, update, destroy() { destroyed = true; feedback.destroy(); page.destroy(); node.removeEventListener('click', clicked); } });
}
export function createSecretTextArea(options: import('./controls.js').InputOptions): import('./controls.js').Input {
    checkOptions(options, ['label', 'description', 'error', 'required', 'disabled', 'placeholder', 'readOnly', 'value', 'autocomplete', 'onInput', 'onChange']);
    const field = primitive.createTextArea(options), input = field.control as HTMLTextAreaElement;
    field.element.classList.add('pui-secret-area');
    let shown = false, destroyed = false;
    const toggle = primitive.createTextAction({ label: 'Show', onAction: () => { shown = !shown; render(); } });
    field.element.append(toggle.element);
    toggle.element.setAttribute('aria-controls', input.id);
    const render = () => { field.element.classList.toggle('pui-revealed', shown); toggle.update({ label: shown ? 'Hide' : 'Show', disabled: input.disabled }); toggle.element.setAttribute('aria-pressed', String(shown)); };
    render();
    return ownControl<InputState, Pick<Input, 'read' | 'reset' | 'focus'>>({ element: field.element, update(state: Readonly<import('./controls.js').InputState>) { checkOptions(state, ['label', 'description', 'error', 'required', 'disabled', 'placeholder', 'readOnly']); field.update(state); render(); }, destroy() { field.reset(''); destroyed = true; field.destroy(); toggle.destroy(); } }, [], { read: field.getValue, reset(value: string) { if (destroyed)
            return; field.reset(value); shown = false; render(); }, focus: field.focus });
}
