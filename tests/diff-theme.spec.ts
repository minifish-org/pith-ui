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
