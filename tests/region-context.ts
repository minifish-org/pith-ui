/** Real region parents for interaction tests; no retired application or DOM clone. */
import {mountParts, createReadingViewportPart, type Part, type ReadingColumnPart, type DialogPart, type MountPartsOptions} from 'pith-ui';
import {composeFrame, composeComposer, composeConversationReader} from 'pith-ui/recipes';

export function mountRegion(mount: HTMLElement, part: Part, placement: 'panels'|'composer'|'reading'|'dialog'|'topbar'|'sibling' = 'panels', appearance: MountPartsOptions['appearance'] = 'light', siblings: Part[] = [], dialogs: DialogPart[] = []) {
  const composer = placement === 'composer' ? undefined : composeComposer({});
  const reader = placement === 'reading' ? undefined : composeConversationReader({id: '',messages: [],working: false});
  if (placement === 'panels') composer!.panels.replace([part]);
  const reading = placement === 'reading' ? createReadingViewportPart({reading: part as ReadingColumnPart,children: [part]}) : reader!.region;
  const frame = composeFrame({navigation: {groups: [],empty: 'workspaces'}}, {}, {
    main: [...(reader ? [reader.find] : []),reading,placement === 'composer' ? part : composer!.part],
    siblings: [...(reader ? [reader.announcement] : []),...siblings,...(placement === 'sibling' ? [part] : [])],
    dialogs: [...dialogs,...(placement === 'dialog' ? [part as DialogPart] : [])],
    topbarActions: placement === 'topbar' ? [part] : [],
  });
  return mountParts(mount,frame.part,{appearance});
}
