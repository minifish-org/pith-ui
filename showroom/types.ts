export type ShowcaseLayer = 'foundations' | 'components' | 'blocks' | 'pages';
export type DemoState = 'normal' | 'loading' | 'error' | 'disabled' | 'empty' | 'long' | 'pending';
export type Outcome = 'success' | 'failure' | 'late' | 'invalid';
export interface DemoContext {
  host: HTMLElement;
  state: DemoState;
  density: 'normal' | 'compact';
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
  id: string;
  title: string;
  layer: ShowcaseLayer;
  category: string;
  description: string;
  states?: readonly DemoState[];
  controls?: readonly ('density' | 'intent' | 'outcome')[];
  related?: readonly string[];
  code: string;
  mount(context: DemoContext): MountedDemo;
}
