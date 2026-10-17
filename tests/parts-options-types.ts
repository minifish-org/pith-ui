import {createButtonPart,createOptionActionPart,createOptionGroupPart,createSeparatedGroupPart} from '../src/parts/index.js';

/** Compile-time consumer boundary, using the same entry as local recipes. */
export function optionPartsContract(): void {
  const option = createOptionActionPart({label: 'Project',description: '/project',icon: 'folder'});
  createOptionGroupPart({children: [option]});
  createButtonPart({variant: 'picker',label: 'Choose a folder…',icon: 'folder'});
  // @ts-expect-error Picker actions require a closed library icon.
  createButtonPart({variant: 'picker',label: 'Choose'});
  // @ts-expect-error Picker presentation is not a prompt variant.
  createButtonPart({purpose: 'prompt',variant: 'picker',label: 'Choose',icon: 'folder'});
  // @ts-expect-error Option groups cannot own an arbitrary ordinary button.
  createOptionGroupPart({children: [createButtonPart({label: 'Other'})]});
  // @ts-expect-error Icon resources are a closed set.
  createOptionActionPart({label: 'Project',description: '/project',icon: 'custom'});
  // @ts-expect-error Layout separation is fixed by the library.
  createSeparatedGroupPart({children: [],gap: 20});
  // @ts-expect-error Options expose no DOM root.
  void option.element;
}
