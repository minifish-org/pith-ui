import {expect,test} from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.goto('/tests/fixture.html');
  // A lower-priority platform rule models Linux WebKit's taller native select.
  // Library-owned dimensions must win without removing its intrinsic width.
  await page.addStyleTag({content:'@layer platform-select { select.pui-select-backing { height: 44px; } }'});
});

test('native selector height cannot enlarge the visible control or validation anchor',async ({page}) => {
  const samples = await page.evaluate(async () => {
    const {createSelect} = await import('../src/internal-components.js');
    const rect = (node:HTMLElement) => {const value=node.getBoundingClientRect(); return {x:value.x,y:value.y,width:value.width,height:value.height};};
    return (['normal','compact'] as const).map(density => {
      const select=createSelect({label:'Choice',density,value:'short',options:[{value:'short',label:'A'},{value:'long',label:'The longest available native option'}]});
      select.element.style.width='max-content'; document.body.append(select.element);
      const trigger=select.element.querySelector<HTMLElement>('.pui-select-trigger')!,wrapper=select.control.parentElement!;
      const native=select.element.cloneNode(true) as HTMLElement,reference=native.querySelector('select')!;
      reference.classList.remove('pui-select-backing'); reference.removeAttribute('aria-hidden'); reference.removeAttribute('tabindex');
      native.querySelector('.pui-select')!.replaceWith(reference); document.body.append(native);
      const before=rect(trigger); select.reset('long');
      const result={density,expected:density==='normal'?40:30,trigger:rect(trigger),backing:rect(select.control),wrapper:rect(wrapper),shortWidth:before.width,nativeWidth:rect(reference).width};
      select.destroy(); native.remove(); return result;
    });
  });
  for (const sample of samples) {
    for (const part of ['trigger','backing','wrapper'] as const) expect.soft(sample[part].height,sample.density+' '+part+' height').toBe(sample.expected);
    expect.soft(sample.backing,sample.density+' native validation anchor').toEqual(sample.trigger);
    expect.soft(sample.trigger.width,sample.density+' widest-option width').toBeCloseTo(sample.nativeWidth,3);
    expect.soft(sample.trigger.width,sample.density+' width after changing caption').toBe(sample.shortWidth);
  }
});

