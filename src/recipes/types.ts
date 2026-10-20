/** Outcome returned by a host business action. */
import type {ActionResult} from '../core.js';
export type RecipeResult = ActionResult;
/** File actions the host can present in this runtime; omitted actions remain visible. */
export interface FileActions {readonly open?: boolean;readonly reveal?: boolean;readonly openLabel?: string;readonly copyPathLabel?: string}
export type ResourceKind = 'instructions' | 'skill' | 'template';
export interface ResourceTarget {readonly workspaceId: string; readonly kind: ResourceKind; readonly name: string; readonly path: string}
