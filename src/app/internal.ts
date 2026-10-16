import type {ActionResult} from '../core.js';
import type {WorkspaceDialogName} from '../workspace.js';

/** Private composition ports. None of these types is exported by pith-ui/app. */
export interface OwnedContent {readonly element: HTMLElement; destroy(): void}
export interface OwnedSurface {
  isOpen(): boolean;
  close(): void;
  destroy(): void;
  fail(message: string): void;
}
export type HostResult = void | ActionResult | Promise<void | ActionResult>;
export interface AppEnvironment {
  readonly idPrefix: string;
  readonly productName: string;
  brandMarkSource(): string;
  part<T extends HTMLElement = HTMLElement>(name: string): T;
  openDialog(name: WorkspaceDialogName, content: OwnedContent, onClose?: () => void): OwnedSurface;
  openFeature(title: string, content: OwnedContent, onClose?: () => void): OwnedSurface;
  openOAuth(title: string, content: OwnedContent, onClose?: () => void): OwnedSurface;
  copyText(text: string): Promise<ActionResult>;
  openExternal(url: string): Promise<ActionResult>;
  openImage(image: HTMLImageElement): void;
  closeImage(): void;
  hasModal(): boolean;
  changed(): void;
  notifyClose(callback?: () => void): void;
}
