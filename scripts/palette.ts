/** Build-only palette source shared by the showroom and package stylesheet.
 * The output is ordinary custom properties and media queries: no runtime code,
 * CSS color functions, or additional browser capability is required.
 */
type PaletteProperty = `--pui-${string}` | 'color-scheme';
const palette = {
  '--pui-bg-main': ['#F7F8FB', '#17191C'],
  '--pui-bg-sidebar': ['#ECEFF5', '#111316'],
  '--pui-surface': ['#FFFFFF', '#22252A'],
  '--pui-surface-subtle': ['#F0F2F6', '#1D2025'],
  '--pui-surface-hover': ['#E4E8EE', '#2B2F35'],
  '--pui-surface-selected': ['#E0E5EE', '#2D323A'],
  '--pui-surface-input': ['#F7F8FB', '#17191C'],
  '--pui-surface-code': ['#F0F2F6', '#14171B'],
  '--pui-user-message-bg': ['var(--pui-surface-subtle)', '#303030'],
  '--pui-user-message-border': ['var(--pui-border)', 'transparent'],
  '--pui-text': ['#1F2530', '#F0F1F3'],
  '--pui-muted': ['#667085', '#9EA5AF'],
  '--pui-muted-tonal': ['#5D677A', '#9EA5AF'],
  '--pui-border': ['#D9DFE8', '#343941'],
  '--pui-border-strong': ['#B9C2D0', '#505863'],
  '--pui-scrollbar': ['#B9C2D0', '#505863'],
  '--pui-accent': ['#4A62C8', '#86B6F2'],
  '--pui-accent-hover': ['#3F54B0', '#A2C8F7'],
  '--pui-accent-foreground': ['#FFFFFF', '#172435'],
  '--pui-focus-ring': ['#4A62C826', '#86B6F22E'],
  '--pui-warning-text': ['#8A570A', '#E9C37B'],
  '--pui-warning-strong': ['#774905', '#F4D59A'],
  '--pui-warning-surface': ['#FFF4DD', '#32291D'],
  '--pui-warning-hover': ['#F8E7C3', '#443725'],
  '--pui-warning-border': ['#D8B470', '#725B37'],
  '--pui-warning-code': ['#FFECCB', '#271F17'],
  '--pui-warning-action': ['#96611D', '#E9C37B'],
  '--pui-warning-action-hover': ['#7B4D12', '#F4D59A'],
  '--pui-warning-foreground': ['#FFFFFF', '#20180D'],
  '--pui-error-text': ['#B42318', '#FFADA4'],
  '--pui-error-surface': ['#FEF0ED', '#352221'],
  '--pui-error-border': ['#E6ABA5', '#79504B'],
  '--pui-diff-add': ['#166534', '#bbf7d0'],
  '--pui-diff-add-bg': ['#dcfce7', '#163526'],
  '--pui-diff-remove': ['#991b1b', '#fecaca'],
  '--pui-diff-remove-bg': ['#fee2e2', '#442329'],
  '--pui-overlay': ['#1F253066', '#00000088'],
  '--pui-shadow': ['0 12px 35px #1F25300D', '0 12px 35px #00000015'],
  '--pui-modal-shadow': ['0 30px 100px #1F253026', '0 30px 100px #00000080'],
  'color-scheme': ['light', 'dark'],
} as const satisfies Record<PaletteProperty, readonly [string, string]>;

const declarations = (appearance: 0 | 1, indent: string): string =>
  Object.entries(palette).map(([property, values]) => `${indent}${property}: ${values[appearance]};`).join('\n');

/** Only theme-dependent declarations belong here; layout and focus geometry
 * remain authored in src/styles.css. Both dark selectors use the same table.
 */
export function themeStyles(): string {
  return `/* C light is the fallback. Explicit appearance always wins over the OS. */
.pui {
${declarations(0, '  ')}
}

.pui[data-appearance="dark"] {
${declarations(1, '  ')}
}

/* System also covers a missing or invalid preference before JS initializes. */
@media (prefers-color-scheme: dark) {
  .pui:not([data-appearance="light"]):not([data-appearance="dark"]) {
${declarations(1, '    ')}
  }
}
`;
}
