import {Lifetime} from '../core.js';
import {setAppearance, type Appearance} from '../theme.js';

declare const partBrand: unique symbol;
/** An opaque, library-owned part. Composition transfers its lifetime to its parent. */
export interface Part {readonly [partBrand]: true; destroy(): void}
export interface MountPartsOptions {appearance?: Appearance}
export interface MountedParts {setAppearance(appearance: Appearance): void; readAppearance(): Appearance; destroy(): void}

interface OwnedPart {
  node: Element;
  children: Part[];
  owner?: Part | MountedParts;
  life: Lifetime;
  disposed: boolean;
  releaseMount?: () => void;
  destroyListeners?: Set<() => void>;
}
const parts = new WeakMap<Part, OwnedPart>();
const mounts = new WeakMap<HTMLElement, MountedParts>();

function owned(part: Part): OwnedPart {
  const record = part && typeof part === 'object' ? parts.get(part) : undefined;
  if (!record) throw new TypeError('Expected a Pith UI part.');
  return record;
}
function live(part: Part): OwnedPart {
  const record = owned(part);
  if (record.disposed) throw new Error('A destroyed part cannot be reused.');
  return record;
}
/** Internal implementation port, intentionally absent from the parts entry. */
export function nodeOf(part: Part): Element {return live(part).node;}
/** Internal only: a native control may acquire its shared presentation wrapper.
 * The presenter has already performed the move; ownership follows that same
 * root without adding another wrapper or changing the public part identity. */
export function retargetPart(part: Part, node: Element): void {live(part).node = node;}
export function isPartAlive(part: Part): boolean {return !!parts.get(part) && !parts.get(part)!.disposed;}
/** Internal preflight for constructors with several owned slots. Validate the
 * combined snapshot before transferring any caller-supplied child. */
export function assertUnownedParts(children: readonly Part[]): void {
  if (!Array.isArray(children)) throw new TypeError('Part children must be an array of Pith UI parts.');
  const unique = new Set<Part>();
  for (const child of children) {
    const record = live(child);
    if (unique.has(child)) throw new Error('A part may appear only once in a parent.');
    if (record.owner) throw new Error('A part already belongs to another parent or mount.');
    unique.add(child);
  }
}
/** Internal borrowed-part lifecycle; consumers receive no DOM or event port. */
export function onPartDestroy(part: Part, callback: () => void): () => void {
  const record = live(part);
  const listeners = record.destroyListeners ??= new Set(); listeners.add(callback);
  return () => {listeners.delete(callback);};
}

/** Reject presentation escapes even for callers using plain JavaScript. */
export function assertOptions(value: unknown, allowed: readonly string[], name: string): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} requires an options object.`);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowed.includes(key)) throw new TypeError(`Unsupported ${name} option: ${String(key)}`);
  }
}

function destroyPart(part: Part): void {
  const record = owned(part);
  if (record.disposed) return;
  record.disposed = true;
  const failures: unknown[] = [];
  for (const callback of [...record.destroyListeners ?? []]) {
    try {callback();} catch (error) {failures.push(error);}
  }
  record.destroyListeners?.clear();
  for (const child of [...record.children]) {
    try {destroyPart(child);} catch (error) {failures.push(error);}
  }
  record.children = [];
  try {record.life.destroy();} catch (error) {failures.push(error);}
  record.node.remove();
  if (record.owner && parts.has(record.owner as Part)) {
    const parent = owned(record.owner as Part);
    parent.children = parent.children.filter(child => child !== part);
  }
  record.owner = undefined;
  try {record.releaseMount?.();} catch (error) {failures.push(error);}
  record.releaseMount = undefined;
  if (failures.length) throw failures[0];
}

/** Internal constructor. No node, selector, class or style port escapes on its handle. */
export function createOwnedPart<Handle extends object>(node: Element, methods: Handle, options: {
  children?: readonly Part[];
  dispose?: () => void;
} = {}): Handle & Part {
  const handle = Object.freeze({...methods, destroy() {destroyPart(handle);}}) as Handle & Part;
  const life = new Lifetime();
  if (options.dispose) life.add(options.dispose);
  parts.set(handle, {node, children: [], life, disposed: false});
  try {if (options.children) replacePartChildren(handle, options.children);}
  catch (error) {parts.delete(handle); life.destroy(); throw error;}
  return handle;
}

/** Atomic ownership check before any retained node moves or removed part is disposed. */
export function replacePartChildren(parent: Part, children: readonly Part[]): void {
  const record = live(parent);
  if (!Array.isArray(children)) throw new TypeError('Part children must be an array of Pith UI parts.');
  const unique = new Set<Part>();
  for (const child of children) {
    const next = live(child);
    if (unique.has(child)) throw new Error('A part may appear only once in a parent.');
    unique.add(child);
    for (let ancestor: Part | undefined = parent; ancestor;) {
      if (ancestor === child) throw new Error('A part cannot contain itself or an ancestor.');
      const owner: Part | MountedParts | undefined = owned(ancestor).owner;
      ancestor = owner && parts.has(owner as Part) ? owner as Part : undefined;
    }
    if (next.owner && next.owner !== parent) throw new Error('A part already belongs to another parent or mount.');
  }
  for (const child of [...record.children]) if (!unique.has(child)) destroyPart(child);
  record.children = [...children];
  for (const child of children) owned(child).owner = parent;
  const active = record.node.ownerDocument.activeElement;
  const pivot = active ? children.findIndex(child => owned(child).node.contains(active)) : -1;
  if (pivot >= 0) {
    // Keep the active subtree attached. Moving siblings around it preserves
    // native focus, composition and selection without blur/change callbacks.
    let anchor = owned(children[pivot]!).node;
    for (let index = pivot - 1; index >= 0; index--) {
      const node = owned(children[index]!).node;
      if (node.nextElementSibling !== anchor) record.node.insertBefore(node, anchor);
      anchor = node;
    }
    anchor = owned(children[pivot]!).node;
    for (let index = pivot + 1; index < children.length; index++) {
      const node = owned(children[index]!).node;
      if (anchor.nextElementSibling !== node) record.node.insertBefore(node, anchor.nextSibling);
      anchor = node;
    }
  } else {
    children.forEach((child, index) => {
      const node = owned(child).node;
      if (record.node.children[index] !== node) record.node.insertBefore(node, record.node.children[index] ?? null);
    });
  }
}

/** The only public DOM input. One live tree owns a checked, ordinary container. */
export function mountParts(mount: HTMLElement, root: Part, options: MountPartsOptions = {}): MountedParts {
  assertOptions(options, ['appearance'], 'mount');
  const validateAppearance = (value: unknown): void => {
    if (!['light', 'dark', 'system'].includes(value as string)) throw new TypeError('Unknown appearance.');
  };
  let appearance = options.appearance ?? 'system'; validateAppearance(appearance);
  if (!(mount instanceof HTMLElement) || !['DIV', 'MAIN', 'SECTION', 'ARTICLE'].includes(mount.tagName)) {
    throw new TypeError('A parts mount must be an ordinary HTML container.');
  }
  if (mounts.has(mount)) throw new Error('This mount already owns a part tree.');
  const record = live(root);
  if (record.owner) throw new Error('A part already belongs to another parent or mount.');
  if (record.node === mount || record.node.contains(mount)) throw new Error('A part cannot be mounted inside itself.');
  const originalScope = mount.classList.contains('pui'), originalAppearance = mount.getAttribute('data-appearance');
  let released = false;
  const release = () => {
    if (released) return;
    released = true; mounts.delete(mount);
    if (!originalScope) mount.classList.remove('pui');
    if (originalAppearance === null) mount.removeAttribute('data-appearance'); else mount.setAttribute('data-appearance', originalAppearance);
  };
  const mounted = Object.freeze({
    setAppearance(next: Appearance) {validateAppearance(next); if (!released) {appearance = next; setAppearance(mount, next);}},
    readAppearance: () => appearance,
    destroy() {if (!released) {try {destroyPart(root);} finally {release();}}},
  });
  record.owner = mounted;
  record.releaseMount = release;
  mounts.set(mount, mounted);
  setAppearance(mount, appearance);
  mount.replaceChildren(record.node);
  return mounted;
}
