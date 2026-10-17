import {expect,test} from '@playwright/test';

test('optional app accepts a small owned dialog and shares theme, modal guards and cleanup',async({page})=>{
  await page.goto('/tests/fixture.html');
  await page.evaluate(async()=>{
    const {createApplication}=await import('../src/app/index.js');const ui=await import('../src/index.js');
    const host=document.createElement('main');document.body.append(host);const app=createApplication(host,{appearance:'dark'});
    const dialog=ui.createConfirmDialog({title:'Small confirmation',message:'Only a small control',onConfirm:()=>({ok:true})});
    const attached=app.attachDialog(dialog);dialog.open();Object.assign(window,{controls:{app,dialog,attached}});
  });
  const dialog=page.getByRole('dialog',{name:'Small confirmation',exact:true});await expect(dialog).toBeVisible();
  expect(await page.evaluate(()=>Reflect.get(window,'controls').app.read().hasModal)).toBe(true);
  await expect(dialog).toHaveCSS('background-color','rgb(34, 37, 42)');
  await page.evaluate(()=>Reflect.get(window,'controls').app.setAppearance('light'));
  await expect(dialog).toHaveCSS('background-color','rgb(255, 255, 255)');
  await page.getByRole('button',{name:'Remove',exact:true}).click();await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(()=>Reflect.get(window,'controls').app.read().hasModal)).toBe(false);
  await page.evaluate(()=>{const x=Reflect.get(window,'controls');x.dialog.open();x.app.destroy();});
  await expect(dialog).toHaveCount(0);await expect(page.locator('main > *')).toHaveCount(0);
});

test('optional app rejects a non-dialog instead of allowing arbitrary UI insertion',async({page})=>{
  await page.goto('/tests/fixture.html');
  expect(await page.evaluate(async()=>{
    const {createApplication}=await import('../src/app/index.js');const ui=await import('../src/index.js');const app=createApplication(document.body);
    const button=ui.createButton({label:'Not a dialog'});let rejected=false;
    try{app.attachDialog(button as unknown as Parameters<typeof app.attachDialog>[0]);}catch(error){rejected=error instanceof Error&&error.message==='Expected a modal dialog control.';}
    app.destroy();button.destroy();return rejected;
  })).toBe(true);
});

test('small confirmations render finite emphasized text safely and retain its nodes on availability updates',async({page})=>{
  await page.goto('/tests/fixture.html');
  await page.evaluate(async()=>{
    const ui=await import('../src/index.js');const message={before:'Remove ',subject:'<img src=x onerror=alert(1)>',after:' from this workspace?'};
    const dialog=ui.createConfirmDialog({title:'Delete resource?',message,onConfirm:()=>({ok:false,error:'Failure'})});
    ui.mount(document.body,dialog);dialog.open();const strong=document.querySelector('dialog strong');dialog.update({title:'Delete resource?',message,disabled:true});
    Object.assign(window,{controls:{same:strong===document.querySelector('dialog strong')}});
  });
  const dialog=page.getByRole('dialog',{name:'Delete resource?',exact:true});
  await expect(dialog.locator('strong')).toHaveText('<img src=x onerror=alert(1)>');await expect(dialog.locator('img')).toHaveCount(0);
  await expect(dialog.getByRole('button',{name:'Remove',exact:true})).toBeDisabled();expect(await page.evaluate(()=>Reflect.get(window,'controls').same)).toBe(true);
});
