/** Minimal formal-parts consumer examples. Large blueprints are in examples/assemblies. */
import {createInputPart,createSelectPart,createButtonPart,createFormPart,createStackPart,mountParts} from '../src/parts/index.js';

export function mountPreferences(host: HTMLElement,onSave: (value: {name: string;provider: string}) => Promise<{ok: true}|{ok: false;error: string}>) {
  const name = createInputPart({label: 'Name',value: 'Example'});
  const provider = createSelectPart({label: 'Provider',options: [{value: 'example',label: 'Example'}],value: 'example'});
  const save = createButtonPart({label: 'Save',variant: 'primary',type: 'submit'});
  const form = createFormPart({children: [name,provider,save],onSubmit: () => onSave({name: name.read(),provider: provider.read()}),onPending(pending) {save.update({label: 'Save',variant: 'primary',pending});}});
  return mountParts(host,createStackPart({children: [form]}));
}
