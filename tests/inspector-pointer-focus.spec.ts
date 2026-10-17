import {test,expect} from '@playwright/test';

for(const purpose of ['ordinary','inspector'] as const){
  test(`${purpose} popover keeps an internal pointer activation through Safari's transient body focus`,async({page})=>{
    await page.goto('/tests/fixture.html');
    await page.evaluate(async purpose=>{
      const ui=await import('../src/index.js'),calls:string[]=[];
      const row=ui.createListRow({context:'resource',title:'Before.txt',description:'output/result.txt',actions:ui.createButton({label:'Open file',onAction(){calls.push('open');}})});
      const popover=ui.createPopover({label:'Files',purpose:purpose==='inspector'?'inspector':undefined,content:row});
      ui.mount(document.body,ui.createStack({children:[popover,ui.createButton({label:'Outside action'})]}));
      Object.assign(window,{pointerFixture:{popover,row,calls}});
    },purpose);
    await page.getByRole('button',{name:'Files',exact:true}).click();
    const open=page.getByRole('button',{name:'Open file',exact:true});await open.focus();
    await page.getByText('output/result.txt',{exact:true}).evaluate(node=>{
      const range=document.createRange();range.setStart(node.firstChild!,2);range.setEnd(node.firstChild!,8);
      getSelection()!.removeAllRanges();getSelection()!.addRange(range);
    });
    await page.evaluate(()=>Reflect.get(window,'pointerFixture').row.update({context:'resource',title:'After.txt',description:'output/result.txt'}));
    await expect(open).toBeFocused();expect(await page.evaluate(()=>getSelection()!.toString())).toBe('tput/r');
    await open.click();
    expect(await page.evaluate(()=>Reflect.get(window,'pointerFixture').calls)).toEqual(['open']);
    await expect(page.getByRole('button',{name:'Files',exact:true})).toHaveAttribute('aria-expanded','true');
    await open.focus();await open.evaluate((node:HTMLButtonElement)=>node.blur());
    await expect(page.getByRole('button',{name:'Files',exact:true})).toHaveAttribute('aria-expanded','false');
  });

  test(`${purpose} popover still dismisses real focus departure, outside activation, Escape and destroyed listeners`,async({page})=>{
    await page.goto('/tests/fixture.html');
    await page.evaluate(async purpose=>{
      const ui=await import('../src/index.js');
      const popover=ui.createPopover({label:'Files',purpose:purpose==='inspector'?'inspector':undefined,content:ui.createButton({label:'Inside action'})});
      ui.mount(document.body,ui.createStack({children:[popover,ui.createButton({label:'Outside action'})]}));
      Object.assign(window,{pointerFixture:{popover}});
    },purpose);
    const trigger=page.getByRole('button',{name:'Files',exact:true}),inside=page.getByRole('button',{name:'Inside action',exact:true}),outside=page.getByRole('button',{name:'Outside action',exact:true});
    await trigger.click();await inside.focus();await inside.evaluate((node:HTMLButtonElement)=>node.blur());
    await expect(trigger).toHaveAttribute('aria-expanded','false');
    await trigger.click();await inside.focus();await outside.focus();
    await expect(trigger).toHaveAttribute('aria-expanded','false');
    await trigger.click();await outside.click();await expect(trigger).toHaveAttribute('aria-expanded','false');
    await trigger.click();await inside.press('Escape');await expect(trigger).toHaveAttribute('aria-expanded','false');await expect(trigger).toBeFocused();
    await trigger.click();await inside.dispatchEvent('pointerdown');
    await page.evaluate(()=>{const f=Reflect.get(window,'pointerFixture');f.popover.close();f.popover.open();});
    await inside.focus();await inside.evaluate((node:HTMLButtonElement)=>node.blur());await expect(trigger).toHaveAttribute('aria-expanded','false');
    await trigger.click();await inside.dispatchEvent('pointerdown');await page.evaluate(()=>Reflect.get(window,'pointerFixture').popover.destroy());
    await outside.focus();await outside.press('Escape');await expect(trigger).toHaveCount(0);await expect(outside).toBeFocused();
  });
}
