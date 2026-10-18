import {test,expect} from '@playwright/test';

test.beforeEach(async ({page})=>{await page.goto('/tests/fixture.html');});

test('native validity, explicit reset and first invalid focus survive select enhancement',async({page})=>{
  const result=await page.evaluate(async()=>{
    const path='/tests/recipes-fixture.ts',{parts:p}=await import(path);
    const first=p.createSelectPart({label:'First required',required:true,value:'',options:[{value:'',label:'Choose'},{value:'valid',label:'Valid'}]});
    const second=p.createSelectPart({label:'Second required',required:true,value:'',options:[{value:'',label:'Choose'}]});
    const other=p.createInputPart({label:'Other field'}),form=p.createFormPart({children:[other,first,second]}),mount=document.body.appendChild(document.createElement('div')),tree=p.mountParts(mount,form);
    other.focus();const controls=[...mount.querySelectorAll<HTMLSelectElement>('select')];controls[0]!.checkValidity();const checkKeptFocus=document.activeElement===mount.querySelector('input');
    mount.querySelector('form')!.reportValidity();const focus=mount.querySelector('[role=combobox]')===document.activeElement;
    const trigger=mount.querySelector('[role=combobox]')!,invalid=trigger.getAttribute('aria-invalid');first.reset('valid');
    const result={checkKeptFocus,focus,invalid,valid:controls[0]!.validity.valid,cleared:trigger.getAttribute('aria-invalid')!=='true'};tree.destroy();return result;
  });expect(result).toEqual({checkKeptFocus:true,focus:true,invalid:'true',valid:true,cleared:true});
});

test('native option visibility and shared adoption release their last observer and restore the control',async({page})=>{
  const value=await page.evaluate(async()=>{
    const path='/src/foundations.ts',{adoptNativeControl}=await import(path),select=document.createElement('select');select.tabIndex=3;
    select.setAttribute('aria-label','Shared choice');select.innerHTML='<option value="one">One</option><option value="secret" hidden>Secret</option><optgroup label="Hidden" hidden><option>Group</option></optgroup><option value="two">Two</option>';document.body.append(select);
    const first=adoptNativeControl(select),second=adoptNativeControl(select);first.destroy();const retained=!!document.querySelector('[role=combobox]');second.destroy();
    const restored=select.parentElement===document.body&&!select.hasAttribute('aria-hidden')&&select.tabIndex===3;
    select.disabled=true;await new Promise(resolve=>setTimeout(resolve,0));return {retained,restored,popups:document.querySelectorAll('.pui-select-popup').length,triggers:document.querySelectorAll('[role=combobox]').length};
  });expect(value).toEqual({retained:true,restored:true,popups:0,triggers:0});
});

for(const appearance of ['light','dark'] as const) test(`${appearance} current controls retain focus, draft and ordinary paint`,async({page})=>{
  await page.evaluate(async appearance=>{
    const path='/tests/recipes-fixture.ts',{parts:p}=await import(path),mount=document.body.appendChild(document.createElement('div'));
    const parts=[p.createInputPart({label:'Text',value:'中文 draft'}),p.createTextareaPart({label:'Multiline',value:'中文 draft'}),p.createInputPart({label:'Secret',kind:'password',value:'demo'}),p.createCheckboxPart({label:'Enabled',checked:true}),p.createSelectPart({label:'Choice',options:[{value:'one',label:'One'}]}),p.createButtonPart({label:'Action'})];p.mountParts(mount,p.createStackPart({children:parts}),{appearance});
  },appearance);
  for(const control of [page.getByRole('textbox',{name:'Text',exact:true}),page.getByRole('textbox',{name:'Multiline',exact:true}),page.getByLabel('Secret',{exact:true}),page.getByRole('checkbox'),page.getByRole('combobox'),page.getByRole('button',{name:'Action',exact:true})]){
    const before=await control.evaluate(node=>{const css=getComputedStyle(node);return [css.border,css.backgroundColor,css.color];});await control.focus();
    expect(await control.evaluate(node=>{const css=getComputedStyle(node);return {focused:node===document.activeElement,outline:css.outlineStyle,shadow:css.boxShadow,paint:[css.border,css.backgroundColor,css.color]};})).toEqual({focused:true,outline:'none',shadow:'none',paint:before});
  }
  await expect(page.getByRole('textbox',{name:'Text',exact:true})).toHaveValue('中文 draft');await expect(page.getByRole('textbox',{name:'Multiline',exact:true})).toHaveValue('中文 draft');
});

test('focus suppression stays inside the library scope, including forced colors',async({page,browserName})=>{
  if(browserName==='webkit')test.skip();await page.emulateMedia({forcedColors:'active'});
  await page.evaluate(async()=>{const path='/tests/recipes-fixture.ts',{parts:p}=await import(path),mount=document.body.appendChild(document.createElement('div'));p.mountParts(mount,p.createStackPart({children:[p.createInputPart({label:'Invalid endpoint',kind:'url',required:true,value:'invalid'}),p.createFeedbackPart({tone:'error',message:'Connection failed'})]}));const outside=document.body.appendChild(document.createElement('button'));outside.textContent='Outside';outside.style.outline='3px solid red';});
  const input=page.getByRole('textbox',{name:'Invalid endpoint',exact:true});await input.focus();await expect(input).toHaveCSS('outline-style','none');expect(await input.evaluate((node:HTMLInputElement)=>node.validity.valid)).toBe(false);await expect(page.getByRole('alert')).toHaveText('Connection failed');await expect(page.getByRole('button',{name:'Outside'})).toHaveCSS('outline-width','3px');
});
