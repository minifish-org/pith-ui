import {expect,test} from '@playwright/test';

test('showroom exposes formal parts and shared regions without an application template',async ({page}) => {
  await page.goto('/?item=button-parts');
  await expect(page.getByRole('heading',{name: '按钮零件',exact: true})).toBeVisible();
  await expect(page.getByRole('button',{name: '完整界面',exact: true})).toHaveCount(0);
  await expect(page.getByRole('button',{name: '组合积木',exact: true})).toHaveCount(0);
  await expect(page.locator('.gallery-code')).toContainText("from 'pith-ui'");
  await expect(page.locator('.gallery-code')).not.toContainText('pith-ui/app');
  await expect(page.getByRole('button',{name: 'Save',exact: true})).toBeVisible();
  await page.getByRole('button',{name: 'Save',exact: true}).click();
  await page.getByText('交互事件（临时）',{exact: true}).click();
  await expect(page.getByRole('list',{name: '交互事件',exact: true})).toContainText('Save');
});

test('every public part exhibit constructs and releases each advertised state',async ({page}) => {
  await page.goto('/?item=button-parts');
  const failures = await page.evaluate(async () => {
    const path = '/showroom/catalog.ts',{catalog} = await import(path),failures:string[] = [];
    for (const item of catalog) for (const state of item.states ?? ['normal']) {
      const host = document.body.appendChild(document.createElement('div'));let demo: {element:HTMLElement;destroy():void}|undefined;
      try {demo = item.mount({host,state,intent:'primary',outcome:'success',log() {},async action() {return {ok:true};}});host.append(demo!.element);if (!demo!.element.firstElementChild) failures.push(item.id+': '+state+' has no native root');}
      catch (error) {failures.push(item.id+': '+state+': '+String(error));}
      finally {demo?.destroy();host.remove();}
    }
    return failures;
  });expect(failures).toEqual([]);
});
