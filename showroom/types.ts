export type ShowcaseLayer = 'foundations' | 'components' | 'blocks' | 'pages';
export type DemoState = 'normal' | 'loading' | 'error' | 'disabled' | 'empty' | 'long' | 'pending' | 'local-file-disabled' | 'copy-busy';
export type Outcome = 'success' | 'failure' | 'late' | 'invalid';
export interface DemoContext {
  host: HTMLElement;
  state: DemoState;
  intent: 'neutral' | 'primary' | 'danger';
  outcome: Outcome;
  log(message: string): void;
  /** A deterministic fake write; the gallery labels all data as demonstration data. */
  action(): Promise<{ ok: true } | { ok: false; error: string }>;
}
export interface MountedDemo {
  element: HTMLElement;
  destroy(): void;
  replay?(): void;
}
export interface ShowcaseCase {
  /** The exact formal factories demonstrated by the executable example. */
  factories?: readonly string[];
  id: string;
  title: string;
  layer: ShowcaseLayer;
  category: string;
  description: string;
  states?: readonly DemoState[];
  controls?: readonly ('outcome')[];
  related?: readonly string[];
  code: string;
  mount(context: DemoContext): MountedDemo;
}
