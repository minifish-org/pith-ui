/** Usage example: the implementation is imported from the published package. */
import {mountParts, type MountPartsOptions} from "pith-ui";
import {composeTextEditor, type TextEditorState, type TextEditorInput, type TextEditorResult, type TextEditorCallbacks, type TextEditorAssembly, type TextEditorComposition} from "pith-ui/recipes";
export {composeTextEditor};
export type {TextEditorState, TextEditorInput, TextEditorResult, TextEditorCallbacks, TextEditorAssembly, TextEditorComposition};
export function mountTextEditor(mount: HTMLElement, initial: Readonly<TextEditorState> & {value: string}, callbacks: TextEditorCallbacks = {}, appearance: MountPartsOptions = {}): TextEditorAssembly {
  const editor = composeTextEditor(initial,callbacks);
  try {mountParts(mount,editor.part,appearance);editor.open({value: initial.value});return editor;}
  catch (error) {editor.destroy();throw error;}
}
