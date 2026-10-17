import {test,expect} from '@playwright/test';
// These icon sizes come from the accepted welcome.ts composition and its CSS.
test('intro composition retains bounded location, suggestion and footnote icon roles',async({page})=>{
 await page.goto('/tests/fixture.html');
 await page.evaluate(async()=>{const u=await import('../src/index.js');u.mount(document.body,u.createContentColumn({purpose:'intro',content:u.createStack({children:[u.createText({role:'heading',text:'Welcome'}),u.createSlot({content:u.createStack({context:'flow',children:[u.createActions({align:'center',children:[u.createIcon({name:'folder'}),u.createText({role:'caption',text:'Working in ',value:'Project'}),u.createButton({label:'Change'})]}),u.createActions({align:'center',children:[u.createButton({context:'suggestion',icon:'terminal',label:'Explain project'})]})]})}),u.createActions({align:'center',children:[u.createIcon({name:'shield'}),u.createText({role:'caption',text:'Your work stays local.'})]})]})}));});
 await expect(page.locator('[data-icon="folder"] svg')).toHaveCSS('width','16px');
 await expect(page.locator('[data-icon="terminal"] svg')).toHaveCSS('width','13px');
 await expect(page.locator('[data-icon="shield"] svg')).toHaveCSS('width','13px');
 await expect(page.getByRole('button',{name:'Change',exact:true})).toHaveCSS('height','40px');
 await expect(page.getByText('Project',{exact:true})).toHaveCSS('font-weight','600');
});
