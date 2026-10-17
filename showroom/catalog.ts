import { primitiveCases } from './primitive-cases.js';
import { contentCases } from './content-cases.js';
import { filesCases } from './files-cases.js';
import { formsCases } from './forms-cases.js';
import { navigationCases } from './navigation-cases.js';
import { foundationCases } from './foundation-cases.js';
import { pageCases } from './page-cases.js';
import { composerCases } from './composer-cases.js';
import { applicationCases } from './application-cases.js';
import { controlPageCases } from './control-page-cases.js';
import type { ShowcaseCase } from './types.js';

export const catalog: readonly ShowcaseCase[] = [
  ...foundationCases, ...primitiveCases, ...contentCases, ...filesCases,
  ...formsCases, ...navigationCases, ...composerCases, ...controlPageCases, ...pageCases, ...applicationCases,
].map(item => ({ ...item, entry: item.entry ?? (primitiveCases.includes(item) || ['context-menu','copy-feedback'].includes(item.id) ? 'pith-ui' as const : applicationCases.includes(item) ? 'pith-ui/app' as const : 'internal' as const), controls: item.controls ?? [
  ...(['text-edit-dialog', 'confirmation', 'menu', 'button', 'workspace-picker', 'rename-conversation', 'approval-panel'].includes(item.id) ? ['outcome' as const] : []),
] }));
const ids = new Set<string>();
for (const item of catalog) {
  if (ids.has(item.id)) throw new Error(`Duplicate showcase id: ${item.id}`);
  ids.add(item.id);
}
