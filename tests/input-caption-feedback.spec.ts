import {test,expect} from '@playwright/test';
// composer.ts puts its validation feedback before attachments and the draft;
// .pui-form-error supplies a 16px top margin inside the input shell.
test('an input surface owns the source caption error spacing and clears it when empty',async({page})=>{
 await page.goto('/tests/fixture.html');
 await page.evaluate(async()=>{const u=await import('../src/index.js');const feedback=Reflect.get(u,'createNotice')({presentation:'caption',tone:'error',message:'Send rejected. Draft retained.'});u.mount(document.body,u.createContentColumn({purpose:'input',content:u.createSurface({content:u.createStack({context:'flow',children:[u.createSlot({content:feedback}),u.createPromptInput({label:'Message',value:'Draft'})]})})}));Reflect.set(window,'captionFeedback',feedback);});
 const feedback=page.getByRole('alert');await expect(feedback).toHaveCSS('font-size','12px');await expect(feedback).toHaveCSS('line-height','18px');await expect(feedback).toHaveCSS('border-top-width','0px');await expect(feedback).toHaveCSS('padding','0px');await expect(feedback.locator('..')).toHaveCSS('margin-top','16px');
 await expect(page.getByRole('textbox',{name:'Message',exact:true})).toHaveValue('Draft');
 await page.evaluate(()=>Reflect.get(window,'captionFeedback').update({message:'',tone:'error'}));await expect(feedback).toBeHidden();await expect(page.locator('.pui-input-surface .pui-slot').first()).toHaveCSS('margin-top','0px');
});
