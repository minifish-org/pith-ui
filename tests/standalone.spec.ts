import {test,expect} from '@playwright/test';
test('full forms own their dark input presentation outside a modal',async({page})=>{
  await page.goto('/tests/fixture.html');
  const result=await page.evaluate(async()=>{
    document.body.dataset.appearance='dark';
    const path='/src/forms/panels.ts';const{createSettingsPanel}=await import(path);
    const panel=createSettingsPanel({baseUrl:'https://example.com',hasApiKey:false});document.body.append(panel.element);
    const control=panel.field('base-url') as HTMLInputElement;
    const css=getComputedStyle(control);const result={background:css.backgroundColor,height:control.getBoundingClientRect().height,owned:control.classList.contains('pui-control')};panel.destroy();return result;
  });expect(result.owned).toBe(true);expect(result.height).toBeGreaterThanOrEqual(40);expect(result.background).toBe('rgb(23, 25, 28)');
});
