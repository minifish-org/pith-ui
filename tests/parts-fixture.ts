import {
  createActionsPart, createButtonPart, createIconPart, createStackPart,
  createTextPart, createToolbarPart, mountParts,
} from '../src/parts/index.js';
import type {ActionResult} from '../src/core.js';

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

const ownershipChecks = (): Record<string, boolean> => {
  const rejected = (action: () => unknown) => {try {action(); return false;} catch {return true;}};
  const child = createTextPart({text: 'Owned'});
  const parent = createStackPart({children: [child]});
  const other = createStackPart({children: []});
  const dead = createTextPart({text: 'Destroyed'}); dead.destroy();
  const result = {
    doubleParent: rejected(() => other.replace([child])),
    cycle: rejected(() => parent.replace([parent])),
    ancestor: rejected(() => {parent.replace([other]); other.replace([parent]);}),
    destroyed: rejected(() => other.replace([dead])),
    foreign: rejected(() => other.replace([document.createElement('div') as never])),
    fake: rejected(() => other.replace([{destroy() {}} as never])),
    duplicate: rejected(() => createStackPart({children: [dead, dead]})),
    reusedMount: rejected(() => mountParts(mount, createTextPart({text: 'Other'}))),
    mountedRoot: rejected(() => mountParts(document.createElement('div'), root)),
    invalidMount: rejected(() => mountParts(document.createElement('button'), createTextPart({text: 'Invalid mount'}))),
    unknownOption: rejected(() => createButtonPart({label: 'Unsafe', style: {padding: 123}} as never)),
    invalidVariant: rejected(() => createButtonPart({label: 'Unsafe', variant: 'invented'} as never)),
    invalidIcon: rejected(() => createIconPart({name: '<svg>'} as never)),
  };
  parent.destroy(); other.destroy();
  return result;
};

export const fixture = {
  calls, save, caption, actions, toolbar, root, mounted, ownershipChecks,
  finish(result: ActionResult) {finish?.(result);},
  update() {save.update({label: 'Saved label', variant: 'primary', icon: 'check'}); caption.update({text: 'Updated safely'});},
  reorder() {root.replace([toolbar, caption, actions]);},
  inspect() {return {
    handles: [save, caption, icon, actions, toolbar, root, mounted].map(handle => Object.keys(handle)),
    outer: mount.firstElementChild?.outerHTML,
  };},
};
declare global {interface Window {partsFixture: typeof fixture}}
window.partsFixture = fixture;
