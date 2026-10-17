import {createButtonPart, createTextPart, createActionsPart, createStackPart, createDialogPart, createInputPart, mountParts} from '../src/parts/index.js';
import {createListPart, createListRowPart} from '../src/parts/collection.js';
import {createMenuPart, createPopoverPart} from '../src/parts/floating.js';
import type {ActionResult} from '../src/core.js';

const calls: string[] = [];
let finish: ((result: ActionResult) => void) | undefined;
const edit = createButtonPart({label: 'Edit Alpha', variant: 'secondary', onAction() {calls.push('edit');}});
const alpha = createListRowPart({title: 'Alpha', description: 'First entry', meta: 'One', icon: 'file', actions: createActionsPart({children: [edit]})});
const beta = createListRowPart({title: 'Beta', selected: true});
const list = createListPart({label: 'Saved entries', entries: [{key: 'alpha', content: alpha}, {key: 'beta', content: beta}]});
const outside = createButtonPart({label: 'Outside'});
const items = () => [
  {key: 'first', label: 'First action', onAction() {calls.push('first');}},
  {key: 'blocked', label: 'Blocked action', disabled: true, onAction() {calls.push('blocked');}},
  {key: 'last', label: 'Last action', intent: 'danger' as const, checked: true, onAction() {calls.push('last'); return new Promise<ActionResult>(resolve => {finish = resolve;});}},
];
const menu = createMenuPart({label: 'Entry actions', items: items(), onError(message) {calls.push(message);}});
const source = createButtonPart({label: 'Open actions', onAction() {menu.open(source);}});
const inner = createMenuPart({label: 'Nested actions', items: [{key: 'nested', label: 'Nested choice', onAction() {calls.push('nested');}}]});
const innerSource = createButtonPart({label: 'Nested menu', onAction() {inner.open(innerSource);}});
const relatedDialog = createDialogPart({title: 'Related modal', children: [createInputPart({label: 'Modal input'})]});
const popover = createPopoverPart({label: 'Nested surface', relatedDialogs: [relatedDialog], content: createStackPart({children: [createTextPart({text: 'Popover content'}), innerSource, inner]})});
const popoverSource = createButtonPart({label: 'Open popover', onAction() {popover.open(popoverSource);}});
const root = createStackPart({children: [outside, list, source, menu, popoverSource, popover, relatedDialog]});
const mounted = mountParts(document.getElementById('collections-mount')!, root);
let staleSource: ReturnType<typeof createButtonPart> | undefined;
let staleMount: ReturnType<typeof mountParts> | undefined;

export const collectionsFixture = {
  calls, list, alpha, beta, edit, menu, source, inner, popover, root, mounted,
  reorder() {list.replace([{key: 'beta', content: beta}, {key: 'alpha', content: alpha}]);},
  removeAlpha() {list.replace([{key: 'beta', content: beta}]);},
  invalidListUpdates() {
    const reject = (action: () => void) => {try {action(); return false;} catch {return true;}};
    return [
      reject(() => list.replace([{key: 'alpha', content: alpha}, {key: 'alpha', content: beta}])),
      reject(() => list.replace([{key: 'alpha', content: alpha}, {key: 'duplicate', content: alpha}])),
      reject(() => list.replace([{key: 'foreign', content: document.body as never}])),
    ];
  },
  updatePending() {menu.update({label: 'Entry actions', items: items()});},
  finish(result: ActionResult) {finish?.(result);},
  makeStaleSource() {
    const host = document.createElement('div'); host.id = 'stale-source'; document.body.append(host);
    staleSource = createButtonPart({label: 'Temporary source', onAction() {menu.open(staleSource!);}});
    staleMount = mountParts(host, staleSource);
  },
  destroyStaleSource() {staleMount!.destroy();},
  makeModal() {relatedDialog.open();},
};
declare global {interface Window {collectionsFixture: typeof collectionsFixture}}
window.collectionsFixture = collectionsFixture;
