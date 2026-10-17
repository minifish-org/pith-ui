import {expect, test} from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.goto('/examples/application/index.html');
  await expect(page.getByText('这是模拟参考应用：所有聊天、审批、连接和文件操作都只使用内存数据，不访问真实服务。', {exact: true})).toBeVisible();
});

test('the constrained reference sends and streams, edits a queued message and completes an approval', async ({page}) => {
  const composer = page.getByRole('textbox', {name: 'Message Pith', exact: true});
  await composer.fill('检查这个方案'); await page.getByRole('button', {name: 'Send message', exact: true}).click();
  await expect(page.getByText('检查这个方案', {exact: true})).toBeVisible();
  await expect(page.getByText(/模拟流式回复：/)).toBeVisible();
  await composer.fill('接下来检查错误'); await page.getByRole('button', {name: 'Queue message', exact: true}).click();
  const queue = page.getByRole('region', {name: 'Pending messages', exact: true});
  await expect(queue.getByText('接下来检查错误', {exact: true})).toBeVisible();
  await queue.getByRole('button', {name: 'Edit pending message', exact: true}).click();
  const editor = page.getByRole('dialog', {name: 'Edit pending message', exact: true});
  await editor.getByRole('textbox', {name: 'Pending message', exact: true}).fill('检查失败后保留草稿');
  await editor.getByRole('button', {name: 'Save message', exact: true}).click();
  await expect(editor).toHaveCount(0); await expect(queue.getByText('检查失败后保留草稿', {exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Allow this action', exact: true}).click();
  await expect(page.getByText('模拟任务已完成。', {exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Send message', exact: true})).toBeVisible();
});

test('settings exercise a failed connection test without losing the draft and save through callbacks', async ({page}) => {
  await page.getByRole('button', {name: 'Settings', exact: true}).click();
  const settings = page.getByRole('dialog', {name: 'Settings', exact: true});
  const key = settings.getByLabel('API key', {exact: false}); await key.fill('demo-secret-only');
  await settings.getByRole('button', {name: 'Test connection', exact: true}).click();
  await expect(settings.getByText('模拟连接失败；输入已保留。再次测试可成功。', {exact: true})).toBeVisible();
  await expect(key).toHaveValue('demo-secret-only');
  await settings.getByRole('button', {name: 'Test connection', exact: true}).click();
  await expect(settings.getByText('模拟连接测试成功。', {exact: true})).toBeVisible();
  await settings.getByRole('button', {name: 'Save settings', exact: true}).click();
  await expect(settings).toHaveCount(0); await expect(page.getByText('模拟设置已保存；凭证只保留在内存。', {exact: true})).toBeVisible();
});

test('model selection and the multi-step provider sign-in are real scene interactions', async ({page}) => {
  await page.getByRole('button', {name: 'Choose model', exact: true}).click();
  const models = page.getByRole('dialog', {name: 'Choose a model', exact: true});
  await models.getByRole('listbox', {name: 'Choose model', exact: true}).selectOption('demo-fast');
  await models.getByRole('button', {name: 'Use model', exact: true}).click();
  await expect(models).toHaveCount(0); await expect(page.getByRole('button', {name: 'Choose model', exact: true})).toHaveText('Fast Demo');
  await page.getByRole('button', {name: 'Settings', exact: true}).click();
  await page.getByRole('button', {name: 'Sign in with provider', exact: true}).click();
  const login = page.getByRole('dialog', {name: 'Provider sign-in', exact: true});
  await login.getByLabel('Verification code', {exact: true}).fill('wrong');
  await login.getByRole('button', {name: 'Continue', exact: true}).click();
  await expect(login.getByText('模拟验证码不正确。请使用 DEMO-1234。', {exact: true})).toBeVisible();
  await login.getByLabel('Verification code', {exact: true}).fill('DEMO-1234');
  await login.getByRole('button', {name: 'Continue', exact: true}).click();
  await expect(login.getByRole('combobox', {name: '选择模拟工作区', exact: true})).toBeVisible();
  await login.getByRole('button', {name: 'Continue', exact: true}).click();
  await expect(login.getByText('模拟登录已完成。没有访问外部账号。', {exact: true})).toBeVisible();
});

test('MCP connections can be added and edited without calling a real server', async ({page}) => {
  const requests: string[] = []; page.on('request', request => {if (request.url().startsWith('https://mcp.example.test')) requests.push(request.url());});
  await page.getByRole('button', {name: 'Connections', exact: true}).click();
  const connections = page.getByRole('dialog', {name: 'Connections', exact: true});
  await connections.getByLabel('Name', {exact: true}).fill('demo-tools');
  await connections.getByLabel('Server URL', {exact: true}).fill('https://mcp.example.test/tools');
  await connections.getByRole('button', {name: 'Save connection', exact: true}).click();
  await expect(connections.getByText('demo-tools', {exact: true})).toBeVisible();
  await connections.getByRole('button', {name: 'Edit', exact: true}).click();
  await expect(connections.getByLabel('Name', {exact: true})).toHaveValue('demo-tools');
  await connections.getByLabel('Server URL', {exact: true}).fill('https://mcp.example.test/updated');
  await connections.getByRole('button', {name: 'Save connection', exact: true}).click();
  await expect(connections.getByText('https://mcp.example.test/updated', {exact: true})).toBeVisible();
  expect(requests).toEqual([]);
});

test('resource editing shows failed saves with the draft intact and then persists the in-memory resource', async ({page}) => {
  await page.getByRole('button', {name: 'Workspace resources', exact: true}).click();
  const resources = page.getByRole('dialog', {name: 'Workspace resources', exact: true});
  const skill = resources.getByRole('article').filter({has: page.getByText('review', {exact: true})});
  await skill.getByRole('button', {name: 'View / edit', exact: true}).click();
  const editor = page.getByRole('dialog', {name: 'Edit workspace resource', exact: true});
  const body = editor.getByRole('textbox', {name: 'Markdown', exact: true});
  await body.fill('# fail\n\n保留这段草稿'); await editor.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(editor.getByText('模拟保存失败；去掉 fail 后可重试。', {exact: true})).toBeVisible();
  await expect(body).toHaveValue('# fail\n\n保留这段草稿');
  await body.fill('# Review\n\n已更新的模拟内容'); await editor.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(editor).toHaveCount(0);
  await skill.getByRole('button', {name: 'View / edit', exact: true}).click();
  await expect(page.getByRole('dialog', {name: 'Edit workspace resource', exact: true}).getByRole('textbox', {name: 'Markdown', exact: true})).toHaveValue('# Review\n\n已更新的模拟内容');
});

test('conversation files and branch history are complete semantic compositions', async ({page}) => {
  await page.getByRole('button', {name: /^Conversation files \(/}).click();
  const file = page.getByRole('article').filter({has: page.getByText('报告.md', {exact: true})});
  await file.getByRole('button', {name: 'Preview', exact: true}).click();
  const preview = page.getByRole('dialog', {name: '报告.md', exact: true});
  await expect(preview.getByRole('heading', {name: '模拟报告', exact: true})).toBeVisible();
  await preview.getByRole('button', {name: 'Copy code', exact: true}).click();
  await expect(preview.getByRole('button', {name: 'Code copied.', exact: true})).toHaveText('Copied');
  await preview.getByRole('button', {name: 'Close 报告.md', exact: true}).click();
  await page.getByRole('button', {name: 'Actions for 模拟会话', exact: true}).click();
  await page.getByRole('menuitem', {name: 'Conversation branches', exact: true}).click();
  const history = page.getByRole('dialog', {name: 'Conversation branches', exact: true});
  await expect(history.getByText('之前的模拟分支', {exact: true})).toBeVisible();
  await history.getByRole('button', {name: 'Continue here', exact: true}).first().click();
  await expect(history).toHaveCount(0); await expect(page.getByText('已从选中的模拟历史节点继续。', {exact: true})).toBeVisible();
});

test('the showroom exposes an embedded reference and a reproducible full-page link', async ({page}) => {
  await page.goto('/tests/legacy-showroom.html?item=application-reference&theme=dark&width=1280');
  await expect(page.getByRole('heading', {name: '受限入口参考应用 Application reference', exact: true})).toBeVisible();
  const link = page.getByRole('link', {name: '打开完整参考应用', exact: true});
  await expect(link).toHaveAttribute('href', /examples\/application\/index\.html\?theme=dark$/);
  const frame = page.frameLocator('iframe[title="受限入口参考应用 · 模拟数据"]');
  await expect(frame.getByRole('textbox', {name: 'Message Pith', exact: true})).toBeVisible();
  await expect(frame.locator('html')).toHaveAttribute('data-theme', 'dark');
});
