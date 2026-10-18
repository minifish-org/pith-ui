/** Showroom chrome uses the same public controls as the exhibits. */
import {createButtonPart,createInputPart,createSelectPart,mountParts,type ButtonPartOptions,type InputOptions,type ChoiceOptions,type Part,type MountedParts,type MountPartsOptions} from 'pith-ui';
let appearance: NonNullable<MountPartsOptions['appearance']>='system';
const mounted=new Set<MountedParts>();
export function setControlAppearance(next: NonNullable<MountPartsOptions['appearance']>) {appearance=next;for(const tree of mounted)tree.setAppearance(next);}
function attach<T extends Part>(part: T) {
  const mount=document.createElement('div'),tree=mountParts(mount,part,{appearance});mounted.add(tree);
  return {...part,element:mount,destroy() {mounted.delete(tree);tree.destroy();}};
}
export function createButton(options: ButtonPartOptions) {
  const control=attach(createButtonPart(options));
  return {...control,element:control.element.firstElementChild as HTMLButtonElement};
}
export function createSearchInput(options: InputOptions) {
  const control=attach(createInputPart({...options,kind:'search'}));return {...control,getValue:control.read};
}
export function createSelect(options: ChoiceOptions) {return attach(createSelectPart(options));}
