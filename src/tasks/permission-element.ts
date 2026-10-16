import {icon} from '../dom.js';

/** Internal retained-node template shared with the composer shell. */
export function permissionControlElement(): HTMLLabelElement {
  const element = document.createElement('label'); element.className = 'pui-permission-control';
  element.innerHTML = `${icon('shield')}<span class="pui-sr-only">Conversation permissions</span><select><option value="ask">Ask before changes</option><option value="workspace-write">Allow workspace changes</option><option value="full-access">Full access</option></select>${icon('down')}`;
  return element;
}
