import {
  createButtonPart, createDrawerPart, createFramePart, createMainPart,
  createSideRailPart, type ButtonPart, type FramePart, type MainPart, type SideRailPart,
} from '../src/parts/index.js';
import type {FrameContent,FrameCallbacks,FrameComposition,SidebarWidths} from '../src/recipes/index.js';

// Compiled consumer boundary. Each rejected program must remain rejected by the
// same formal entry used by executable assembly recipes.
export function framePartContract(frame: FramePart,rail: SideRailPart,main: MainPart,trigger: ButtonPart): void {
  const tabbed: FrameContent = {tools: {label:'Tools',layout:'tabs',children:[],close:trigger}};
  // @ts-expect-error A tabbed rail borrows an explicit owned close button.
  const missingClose: FrameContent = {tools: {label:'Tools',layout:'tabs',children:[]}};
  // @ts-expect-error A data object cannot impersonate a genuine close control.
  const fakeClose: FrameContent = {tools: {label:'Tools',layout:'tabs',children:[],close:{}}};
  void [tabbed,missingClose,fakeClose];
  createButtonPart({variant: 'navigation',icon: 'settings',label: 'Settings'});
  createButtonPart({variant: 'quiet-icon',icon: 'more',label: 'Actions',menuExpanded: false});
  // @ts-expect-error Navigation actions always have a closed library icon.
  createButtonPart({variant: 'navigation',label: 'Missing icon'});
  // @ts-expect-error Prompt presentation does not accept navigation variants.
  createButtonPart({purpose: 'prompt',variant: 'navigation',icon: 'settings',label: 'Invalid'});
  // @ts-expect-error Explicit menu state belongs only to quiet menu triggers.
  createButtonPart({variant: 'toolbar-action',icon: 'compress',label: 'Compact',menuExpanded: true});
  // @ts-expect-error Content cannot inject arbitrary styles.
  createButtonPart({variant: 'drawer-trigger',icon: 'menu',label: 'Open',style: {width: 32}});
  createDrawerPart({scope: frame,panel: rail,content: main,trigger});
  createFramePart({children: [],titlebar: 'overlay'});
  // @ts-expect-error Window chrome is a finite native overlay mode, never custom presentation.
  createFramePart({children: [],titlebar: 'custom'});
  // @ts-expect-error A main region cannot impersonate a branded side rail.
  createDrawerPart({scope: frame,panel: main,content: main,trigger});
  // @ts-expect-error A side rail cannot impersonate a branded viewport frame.
  createDrawerPart({scope: rail,panel: rail,content: main,trigger});
  // @ts-expect-error Layout content is opaque Part handles, never raw DOM.
  createFramePart({children: [document.createElement('div')]});
  // @ts-expect-error Viewport dimensions belong to the library.
  createFramePart({children: [],width: 900});
  // @ts-expect-error Disposal is a lifecycle callback, never an arbitrary value.
  createFramePart({children: [],onDispose: 'invalid'});
  // @ts-expect-error There are no arbitrary slot names or visual classes.
  createSideRailPart({children: [],className: 'custom'});
  // @ts-expect-error Main layout cannot be parameterized with CSS dimensions.
  createMainPart({children: [],padding: 20});
  // @ts-expect-error Opaque frame handles expose no DOM root.
  void frame.element;
}

export function sidebarSizingContract(frame:FrameComposition): void {
  const widths:SidebarWidths={navigation:300,tools:420};
  const content:FrameContent={sidebarWidths:widths};
  const callbacks:FrameCallbacks={onSidebarResize(value) {const navigation:number=value.navigation;void navigation;
    // @ts-expect-error Published preferences are immutable callback values.
    value.tools=300;
  }};
  frame.setSidebarWidths({tools:500});void [content,callbacks];
  // @ts-expect-error Widths are semantic numeric preferences, never CSS expressions.
  frame.setSidebarWidths({navigation:'20vw'});
}
