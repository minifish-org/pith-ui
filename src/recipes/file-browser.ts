import {createButtonPart,createFeedbackPart,createMenuPart,createRailHeadingPart,createSearchFieldPart,createStackPart,createTextPart,createTreeBranchPart,createTreeItemPart,createTreePart,type ButtonPart,type Part,type TreeBranchPart,type TreeItemPart} from '../parts/index.js';
import {nodeOf,onPartDestroy} from '../parts/ownership.js';
import type {RecipeResult} from './types.js';

export interface BrowserEntry {readonly name: string;readonly path: string;readonly directory: boolean}
export interface BrowserDirectory {readonly path: string;readonly expanded: boolean;readonly entries: readonly BrowserEntry[];readonly loading?: boolean;readonly error?: string;readonly truncated?: boolean}
export interface FileBrowserState {
  readonly workspaceId: string;readonly location: string;readonly query: string;
  readonly directories: readonly BrowserDirectory[];
  readonly search?: {readonly entries: readonly BrowserEntry[];readonly loading?: boolean;readonly error?: string;readonly truncated?: boolean};
  readonly disabled?: boolean;readonly referenceDisabled?: boolean;
  readonly capabilities?: {readonly native?: boolean;readonly copyFile?: boolean;readonly copyPathLabel?: string};
}
export interface BrowserTarget {readonly workspaceId: string;readonly path: string}
export type BrowserAction = 'preview'|'download'|'copy-path'|'reference'|'open'|'reveal'|'copy';
export interface FileBrowserCallbacks {
  onSearch?(query: string): void;onRefresh?(): void;
  onToggle?(target: BrowserTarget,expanded: boolean): void;
  onAction?(action: BrowserAction,target: BrowserTarget): void|RecipeResult|Promise<void|RecipeResult>;
  onError?(message: string): void;
}
export interface FileBrowserComposition {readonly part: Part;update(state: Readonly<FileBrowserState>): void;closeMenu(): void;destroy(): void}

/** Lazy file tree presentation. Directory IO, search bounds, original targets
 * and draft persistence belong to the application. Rows and search input keep
 * their identity across metadata and sibling-directory updates. */
export function composeFileBrowser(initial: Readonly<FileBrowserState>,callbacks: FileBrowserCallbacks = {}): FileBrowserComposition {
  let state = initial,alive = true,owner = initial.workspaceId,searching = !!initial.query.trim();
  type Row = {part: TreeBranchPart|TreeItemPart;directory: boolean;entry: BrowserEntry;more?: ButtonPart};
  const rows = new Map<string,Row>(),notes = new Map<string,ReturnType<typeof createTextPart>>();
  let target: BrowserTarget|undefined;
  const fail = (message: string) => {if (alive) {feedback.update({message,tone: 'error',hidden: !message});callbacks.onError?.(message);}};
  const location = createTextPart({role: 'path-paragraph',text: state.location});
  const refresh = createButtonPart({variant: 'quiet-icon',icon: 'refresh',label: 'Refresh workspace files',title: 'Refresh workspace files',onAction() {if (alive && !state.disabled) callbacks.onRefresh?.();}});
  const heading = createRailHeadingPart({label: 'Files',actions: [refresh]});
  const search = createSearchFieldPart({label: 'Find workspace files',placeholder: 'Find by file name',value: state.query,onInput(query) {if (alive && !state.disabled) callbacks.onSearch?.(query);}});
  const feedback = createFeedbackPart({message: '',tone: 'error',hidden: true});
  const tree = createTreePart({label: 'Workspace files',children: []});
  const menu = createMenuPart({label: 'Workspace file actions',items: [],onToggle(open) {if (!open) target = undefined;},onError: fail});
  const part = createStackPart({children: [location,heading,search,feedback,tree,menu]});
  nodeOf(part).classList.add('pui-file-browser');
  function closeMenu(): void {menu.close();target = undefined;}
  function items() {
    const original = target;
    const entries: Array<[BrowserAction,string]> = [['preview','Preview'],['download','Download'],['copy-path',state.capabilities?.copyPathLabel ?? 'Copy path'],['reference','Insert reference']];
    if (state.capabilities?.native) entries.push(['open','Open'],['reveal','Reveal']);
    if (state.capabilities?.copyFile) entries.push(['copy','Copy file']);
    return entries.map(([action,label]) => ({key: action,label,disabled: !!state.disabled || action === 'reference' && !!state.referenceDisabled,
      async onAction() {closeMenu();if (!alive || !original || original.workspaceId !== state.workspaceId || state.disabled || action === 'reference' && state.referenceDisabled) return;return callbacks.onAction?.(action,original);}}));
  }
  function rowFor(entry: BrowserEntry): Row {
    let row = rows.get(entry.path);
    if (row && row.directory !== entry.directory) {row.part.destroy();rows.delete(entry.path);row = undefined;}
    const workspaceId = state.workspaceId,path = entry.path;
    if (!row) {
      const current = () => alive && workspaceId === state.workspaceId && rows.get(path) === row && !state.disabled;
      if (entry.directory) {
        row = {directory: true,entry,part: createTreeBranchPart({label: entry.name,path,actions: [],children: [],onToggle(expanded) {if (current()) callbacks.onToggle?.({workspaceId,path},expanded);}})};
      } else {
        const more = createButtonPart({variant: 'quiet-icon',icon: 'more',label: 'Actions for '+path,title: 'File actions',onAction() {
          if (!current()) return;
          if (menu.isOpen() && target?.path === path) {closeMenu();return;}
          closeMenu();target = Object.freeze({workspaceId,path});menu.update({label: 'Workspace file actions',items: items()});menu.open(more);
        }});
        row = {directory: false,entry,more,part: createTreeItemPart({label: entry.name,actions: [more],onSelect() {
          if (!current()) return;closeMenu();
          void Promise.resolve().then(() => {if (current()) return callbacks.onAction?.('preview',Object.freeze({workspaceId,path}));}).then(result => {if (current() && result && !result.ok) fail(result.error);}).catch(error => {if (current()) fail(error instanceof Error ? error.message : String(error));});
        }})};
      }
      rows.set(path,row);
    }
    row.entry = entry;
    return row;
  }
  function render(): void {
    if (!alive) return;
    const nextSearch = !!state.query.trim();
    if (owner !== state.workspaceId || searching !== nextSearch) {
      closeMenu();tree.replace([]);rows.clear();notes.clear();feedback.update({message: '',tone: 'error',hidden: true});
      if (owner !== state.workspaceId) search.reset(state.query);
      owner = state.workspaceId;searching = nextSearch;
    }
    location.update({text: state.location});refresh.update({variant: 'quiet-icon',icon: 'refresh',label: 'Refresh workspace files',title: 'Refresh workspace files',disabled: !!state.disabled || !state.workspaceId});
    search.update({label: 'Find workspace files',placeholder: 'Find by file name',disabled: !!state.disabled || !state.workspaceId});
    const directories = new Map(state.directories.map(directory => [directory.path,directory])),wanted = new Set<string>(),wantedNotes = new Set<string>();
    const note = (key: string,text: string): Part => {wantedNotes.add(key);let part = notes.get(key);if (!part) {part = createTextPart({role: 'paragraph',text});notes.set(key,part);}else part.update({text});return part;};
    const content = (path: string,listing?: {entries: readonly BrowserEntry[];loading?: boolean;error?: string;truncated?: boolean}): Part[] => {
      if (!listing) return [note(path,'Expand to load files.')];
      const children: Part[] = [];
      for (const entry of listing.entries) {
        wanted.add(entry.path);const row = rowFor(entry),label = searching ? entry.path : entry.name;
        if (row.directory) {
          const branch = row.part as TreeBranchPart,directory = directories.get(entry.path);
          branch.update({label,path: entry.path});branch.setExpanded(directory?.expanded ?? false);
          branch.replace(directory ? content(entry.path,directory) : [note(entry.path,'Expand to load files.')]);
        } else {
          (row.part as TreeItemPart).update({label,disabled: !!state.disabled});
          row.more?.update({variant: 'quiet-icon',icon: 'more',label: 'Actions for '+entry.path,title: 'File actions',disabled: !!state.disabled});
        }
        children.push(row.part);
      }
      if (listing.loading) children.push(note(path+':loading','Loading files…'));
      else if (listing.error) children.push(note(path+':error',listing.error));
      else if (!children.length) children.push(note(path+':empty',searching ? 'No matching files.' : 'This folder is empty.'));
      if (listing.truncated) children.push(note(path+':limit','Results limited. Narrow the file name or browse a subfolder.'));
      return children;
    };
    tree.replace(state.workspaceId ? content('',searching ? state.search : directories.get('')) : [note(':workspace','Choose a workspace to browse files.')]);
    for (const [path,row] of rows) if (!wanted.has(path)) {row.part.destroy();rows.delete(path);}
    for (const [key,part] of notes) if (!wantedNotes.has(key)) {part.destroy();notes.delete(key);}
    if (target) {if (!wanted.has(target.path)) closeMenu();else menu.update({label: 'Workspace file actions',items: items()});}
  }
  onPartDestroy(part,() => {alive = false;target = undefined;rows.clear();notes.clear();});
  render();
  return {part,update(next) {if (alive) {state = next;render();}},closeMenu,destroy: part.destroy};
}
