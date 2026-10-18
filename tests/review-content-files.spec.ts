import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.goto('/tests/fixture.html');});

test('reader public methods are inert after destruction, including stale direct calls', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {installConversationReader} = await import('../src/content/conversation-reader.js');
    const root = document.createElement('div'); root.innerHTML = '<button data-outside>Outside</button><div data-find hidden><input><span data-find-count></span><button data-find-previous></button><button data-find-next></button><button data-find-close></button></div><div data-scroll tabindex="0" style="height:80px;overflow:auto"><div data-messages><article data-reading-id="a" style="height:1000px">a+b</article></div></div><button data-latest></button>'; document.body.append(root);
    const scroll = root.querySelector<HTMLElement>('[data-scroll]')!, bar = root.querySelector<HTMLElement>('[data-find]')!, input = bar.querySelector('input')!, outside = root.querySelector<HTMLButtonElement>('[data-outside]')!;
    const reader = installConversationReader(scroll, root.querySelector('[data-messages]')!, bar, root.querySelector('[data-latest]')!); reader.beforeRender('chat'); reader.afterRender(); reader.destroy(); reader.destroy();
    outside.focus(); reader.openFind(); const open = {hidden:bar.hidden, focus:document.activeElement === outside};
    bar.hidden = false; input.focus(); reader.closeFind(); const close = {visible:!bar.hidden, focus:document.activeElement === input};
    scroll.scrollTop = 40; reader.followLatest(); const top = scroll.scrollTop; reader.beforeRender('stale'); reader.afterRender(); reader.prune([]);
    return {open, close, top};
  });
  expect(result).toEqual({open:{hidden:true, focus:true}, close:{visible:true, focus:true}, top:40});
});
