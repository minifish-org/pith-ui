import {test,expect} from '@playwright/test';
// Measured from the accepted0.3.1 createWelcomeView with its exact published CSS
// in Chromium and WebKit; source styles442–462,754–761 own these values.
for(const width of [1280,560]){
 test(`a small setup panel preserves source heading and step groups at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:800});await page.goto('/tests/fixture.html');
  await page.evaluate(async()=>{const u=await import('../src/index.js');u.mount(document.body,u.createContentColumn({purpose:'intro',content:u.createStack({children:[u.createText({role:'heading',text:'Your work. A little more possible.'}),u.createSlot({content:u.createSurface({purpose:'panel',content:u.createStack({context:'flow',children:[u.createToolbar({label:'Setup progress',leading:u.createText({role:'caption',text:'Make yourself at home'}),trailing:u.createText({role:'caption',text:'Two quick steps'})}),u.createStep({number:1,title:'Connect a provider',description:'Bring your provider API key',onAction(){}}),u.createStep({number:2,title:'Choose a workspace',description:'A folder Pith can help you work in',onAction(){}})]})})})]})}));});
  const heading=page.getByRole('toolbar',{name:'Setup progress',exact:true});await expect(heading).toHaveCSS('padding-bottom','12px');await expect(heading).toHaveCSS('border-bottom-width','1px');expect((await heading.boundingBox())!.height).toBe(31);await expect(heading.getByText('Make yourself at home',{exact:true})).toHaveCSS('color','rgb(31, 37, 48)');
  const first=page.getByRole('button',{name:/Connect a provider/}),second=page.getByRole('button',{name:/Choose a workspace/});await expect(first).toHaveCSS('padding','16px 0px');await expect(second).toHaveCSS('border-top-width','1px');expect((await first.boundingBox())!.height).toBe(width===1280?79:76);expect((await second.boundingBox())!.height).toBe(width===1280?80:77);await expect(first.locator('strong')).toHaveCSS('margin-bottom','8px');await expect(first.locator('strong')).toHaveCSS('font-size',width===1280?'14px':'12px');
 });
 test(`suggestion controls preserve source padding and glyph size at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:800});await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');u.mount(document.body,u.createContentColumn({purpose:'intro',content:u.createStack({children:[u.createText({role:'heading',text:'What are we working on?'}),u.createActions({align:'center',children:[u.createButton({context:'suggestion',icon:'file',label:'Explore my workspace'})]})]})}));});
  const button=page.getByRole('button',{name:'Explore my workspace',exact:true});await expect(button).toHaveCSS('font-size','12px');await expect(button).toHaveCSS('padding',width===1280?'12px':'8px');expect((await button.boundingBox())!.height).toBe(width===1280?44:36);await expect(button.locator('svg')).toHaveCSS('width','14px');
 });
}
