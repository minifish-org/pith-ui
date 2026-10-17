import {
  createActionsPart, createButtonPart, createIconPart, createStackPart,
  createTextPart, createToolbarPart, mountParts,
} from '../src/parts/index.js';
import type {ActionResult} from '../src/core.js';
import {createInputPart} from '../src/parts/fields.js';

const mount = document.getElementById('parts-mount')!;
const calls: string[] = [];
let finish: ((result: ActionResult) => void) | undefined;
const save = createButtonPart({label: 'Save', variant: 'primary', icon: 'check', onAction() {
  calls.push('save'); return new Promise<ActionResult>(resolve => {finish = resolve;});
}, onError(message) {calls.push(message);}});
const variants = [
  createButtonPart({label: 'Standard'}),
  createButtonPart({label: 'Secondary', variant: 'secondary'}),
  createButtonPart({label: 'Delete', variant: 'danger'}),
  createButtonPart({label: 'Close', variant: 'quiet-icon', icon: 'close'}),
];
const caption = createTextPart({text: '<Safe text>', role: 'paragraph'});
const icon = createIconPart({name: 'folder', label: 'Folder'});
const actions = createActionsPart({children: [save, ...variants]});
const toolbar = createToolbarPart({label: 'Document tools', children: [icon]});
const root = createStackPart({children: [caption, toolbar, actions]});
const mounted = mountParts(mount, root);

const constructorChecks = (): Record<string, boolean> => {
  const reusableAfterFailure = (build: (child: ReturnType<typeof createTextPart>) => unknown) => {
    const child = createTextPart({text: 'Reusable after rejected constructor'});
    let rejected = false;
    try {build(child);} catch {rejected = true;}
    const host = document.createElement('div');
    try {const tree = mountParts(host, child); tree.destroy(); return rejected;}
    catch {child.destroy(); return false;}
  };
  return {
    toolbar: reusableAfterFailure(child => createToolbarPart({label: 42 as never, children: [child]})),
    actions: reusableAfterFailure(child => createActionsPart({align: 'invented' as never, children: [child]})),
  };
};

function inputExample() {
  const host = document.createElement('div'); document.body.append(host);
  const field = createInputPart({label: 'Retained draft', value: 'Draft 中文 value'});
  const before = createTextPart({text: 'Before draft'});
  const row = createStackPart({children: [field]});
  const example = createStackPart({children: [before, row]});
  const tree = mountParts(host, example);
  return {
    reorder() {example.replace([row, before]); field.update({label: 'Retained draft', disabled: false});},
    remove() {example.replace([before]); field.focus();},
    destroy() {tree.destroy(); host.remove();},
  };
}
let input: ReturnType<typeof inputExample> | undefined;

function reentrantExample() {
  const host = document.createElement('div'); document.body.append(host);
  let errors = 0;
  const selfDestroy = createButtonPart({label: 'Remove self', onAction() {selfDestroy.destroy(); return {ok: false, error: 'Late self error'};}, onError() {errors++;}});
  const survivor = createTextPart({text: 'Surviving sibling'});
  const example = createStackPart({children: [selfDestroy, survivor]});
  const tree = mountParts(host, example);
  return {read: () => errors, destroy() {tree.destroy(); host.remove();}};
}
let reentrant: ReturnType<typeof reentrantExample> | undefined;

const ownershipChecks = (): Record<string, boolean> => {
  const rejected = (action: () => unknown) => {try {action(); return false;} catch {return true;}};
  const child = createTextPart({text: 'Owned'});
  const parent = createStackPart({children: [child]});
  const other = createStackPart({children: []});
  const dead = createTextPart({text: 'Destroyed'}); dead.destroy();
  const duplicate = createTextPart({text: 'Duplicate'});
  const result = {
    doubleParent: rejected(() => other.replace([child])),
    cycle: rejected(() => parent.replace([parent])),
    ancestor: rejected(() => {parent.replace([other]); other.replace([parent]);}),
    destroyed: rejected(() => other.replace([dead])),
    foreign: rejected(() => other.replace([document.createElement('div') as never])),
    fake: rejected(() => other.replace([{destroy() {}} as never])),
    duplicate: rejected(() => createStackPart({children: [duplicate, duplicate]})),
    reusedMount: rejected(() => mountParts(mount, createTextPart({text: 'Other'}))),
    mountedRoot: rejected(() => mountParts(document.createElement('div'), root)),
    invalidMount: rejected(() => mountParts(document.createElement('button'), createTextPart({text: 'Invalid mount'}))),
    unknownOption: rejected(() => createButtonPart({label: 'Unsafe', style: {padding: 123}} as never)),
    invalidVariant: rejected(() => createButtonPart({label: 'Unsafe', variant: 'invented'} as never)),
    invalidIcon: rejected(() => createIconPart({name: '<svg>'} as never)),
  };
  parent.destroy(); other.destroy(); duplicate.destroy();
  return result;
};

export const fixture = {
  calls, save, caption, actions, toolbar, root, mounted, ownershipChecks, constructorChecks,
  finish(result: ActionResult) {finish?.(result);},
  update() {save.update({label: 'Saved label', variant: 'primary', icon: 'check'}); caption.update({text: 'Updated safely'});},
  reorder() {root.replace([toolbar, caption, actions]);},
  focusReorder() {root.replace([actions, toolbar, caption]);},
  makeInputExample() {input = inputExample();},
  reorderInput() {input!.reorder();},
  removeInput() {input!.remove();},
  destroyInput() {input!.destroy();},
  makeReentrantExample() {reentrant = reentrantExample();},
  readReentrantErrors: () => reentrant!.read(),
  destroyReentrant() {reentrant!.destroy();},
  textExamples() {
    const roles = ['text', 'paragraph', 'muted', 'hint', 'description', 'eyebrow', 'heading', 'strong'] as const;
    const host = document.createElement('div'); document.body.append(host);
    const examples = createStackPart({children: roles.map(role => createTextPart({text: role, role}))});
    const owned = mountParts(host, examples);
    const markup = [...host.firstElementChild!.children].map(node => ({tag: node.tagName.toLowerCase(), className: node.className, text: node.textContent}));
    owned.destroy(); host.remove(); return markup;
  },
  inspect() {return {
    handles: [save, caption, icon, actions, toolbar, root, mounted].map(handle => Object.keys(handle)),
    outer: mount.firstElementChild?.outerHTML,
  };},
};
declare global {interface Window {partsFixture: typeof fixture}}
window.partsFixture = fixture;
