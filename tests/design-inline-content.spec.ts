import {expect,test} from '@playwright/test';

test('inline code stays within adjacent prose lines when a narrow message wraps',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const lines = await page.evaluate(async () => {
    const {createConversationView} = await import('../src/index.js'); const view = createConversationView();
    view.element.style.width = '280px';
    view.update({id:'inline-code',working:false,messages:[{id:'answer',role:'assistant',text:'Read `AGENTS.md` before editing. 中文说明和 `src/example.ts` 路径需要在窄窗口中换行，同时保持相邻行的正文清晰可读。Read `README.md` after editing.'}]});
    document.body.append(view.element);
    return [...view.element.querySelectorAll<HTMLElement>('.pui-markdown p code')].flatMap(code=>[...code.getClientRects()].map(rect=>({text:code.textContent,height:rect.height,line:parseFloat(getComputedStyle(code.parentElement!).lineHeight)})));
  });
  expect(lines.length).toBeGreaterThanOrEqual(3);
  for (const line of lines) expect.soft(line.height,line.text+' painted inline box').toBeLessThanOrEqual(line.line);
});
