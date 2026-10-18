/** Outcome returned by a host business action. */
import type {ActionResult} from '../core.js';
export type RecipeResult = ActionResult;
export type ResourceKind = 'instructions' | 'skill' | 'template';
export interface ResourceTarget {readonly workspaceId: string; readonly kind: ResourceKind; readonly name: string; readonly path: string}
