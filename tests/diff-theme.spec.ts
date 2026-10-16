import {test,expect} from '@playwright/test';
test('diff palette follows each local theme including nested comparisons and system dark',async({page})=>{
  await page.emulateMedia({colorScheme:'dark'});await page.goto('/tests/fixture.html');
  const colors=await page.evaluate(async()=>{
    const previewPath='/src/content/paged-preview.ts',themePath='/src/theme.ts';
    const [{createPagedPreview},{setAppearance}]=await Promise.all([import(previewPath),import(themePath)]);
    setAppearance(document.body,'dark');
    return ['light','dark','system'].map(theme=>{
      const root=document.createElement('div');setAppearance(root,theme);document.body.append(root);
      const preview=createPagedPreview({text:'-old\n+new',kind:'diff'});root.append(preview.element);
      const add=getComputedStyle(root.querySelector('.pui-diff-add')!),remove=getComputedStyle(root.querySelector('.pui-diff-remove')!);
      const colors=[add.color,add.backgroundColor,remove.color,remove.backgroundColor];preview.destroy();root.remove();return colors;
    });
  });
  expect(colors).toEqual([
    ['rgb(22, 101, 52)','rgb(220, 252, 231)','rgb(153, 27, 27)','rgb(254, 226, 226)'],
    ['rgb(187, 247, 208)','rgb(22, 53, 38)','rgb(254, 202, 202)','rgb(68, 35, 41)'],
    ['rgb(187, 247, 208)','rgb(22, 53, 38)','rgb(254, 202, 202)','rgb(68, 35, 41)'],
  ]);
});

test('palette generation preserves explicit, inherited and live system appearance', async ({page}) => {
  await page.emulateMedia({colorScheme:'dark'}); await page.goto('/tests/fixture.html');
  const read = () => page.evaluate(() => {
    const tokens = ['bg-main','bg-sidebar','surface','surface-subtle','surface-hover','surface-selected','surface-input','surface-code','user-message-bg','user-message-border','text','muted','muted-tonal','border','border-strong','scrollbar','accent','accent-hover','accent-foreground','focus-ring','warning-text','warning-strong','warning-surface','warning-hover','warning-border','warning-code','warning-action','warning-action-hover','warning-foreground','error-text','error-surface','error-border','diff-add','diff-add-bg','diff-remove','diff-remove-bg','overlay','shadow','modal-shadow'];
    return Object.fromEntries([...document.querySelectorAll<HTMLElement>('[data-theme-test]')].map(root => [root.dataset.themeTest!, {
      tokens: Object.fromEntries(tokens.map(token => [token,getComputedStyle(root).getPropertyValue(`--pui-${token}`).trim()])),
      scheme:getComputedStyle(root).colorScheme, background:getComputedStyle(root).backgroundColor, color:getComputedStyle(root).color,
    }]));
  });
  await page.evaluate(async () => {
    const path='/src/theme.ts'; const {setAppearance}=await import(path); setAppearance(document.body,'dark');
    for (const appearance of ['light','dark','system','missing','invalid']) {
      const root=document.createElement('div'); root.dataset.themeTest=appearance; root.className='pui';
      if (appearance !== 'missing') root.dataset.appearance=appearance; document.body.append(root);
    }
  });
  const dark = await read();
  for (const mode of ['system','missing','invalid']) expect(dark[mode]).toEqual(dark.dark);
  expect(dark.light).toMatchObject({scheme:'light',background:'rgb(247, 248, 251)',color:'rgb(31, 37, 48)',tokens:{accent:'#4A62C8','surface-selected':'#E0E5EE',shadow:'0 12px 35px #1F25300D'}});
  expect(dark.dark).toMatchObject({scheme:'dark',background:'rgb(23, 25, 28)',color:'rgb(240, 241, 243)',tokens:{accent:'#86B6F2','surface-selected':'#2D323A',shadow:'0 12px 35px #00000015'}});
  await page.emulateMedia({colorScheme:'light'}); const light = await read();
  for (const mode of ['system','missing','invalid']) expect(light[mode]).toEqual(light.light);
  expect(light.light).toEqual(dark.light); expect(light.dark).toEqual(dark.dark);
});
