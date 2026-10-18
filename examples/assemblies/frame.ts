/** Usage example: the implementation is imported from the published package. */
import {mountParts, type MountPartsOptions} from "pith-ui";
import {composeFrame, type FrameConversation, type FrameWorkspace, type FrameState, type FrameCallbacks, type FrameContent, type FrameAssembly, type FrameComposition} from "pith-ui/recipes";
export {composeFrame};
export type {FrameConversation, FrameWorkspace, FrameState, FrameCallbacks, FrameContent, FrameAssembly, FrameComposition};
export function mountFrame(mount: HTMLElement, state: Readonly<FrameState>, callbacks: FrameCallbacks = {}, appearance: MountPartsOptions = {}, content: FrameContent = {}): FrameAssembly {
  const frame = composeFrame(state, callbacks, content);
  try {const mounted = mountParts(mount, frame.part, appearance); return {...frame, setAppearance: mounted.setAppearance};}
  catch (error) {frame.destroy(); throw error;}
}
