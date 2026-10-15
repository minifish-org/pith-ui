import test from 'node:test';
import assert from 'node:assert/strict';
import { Generation, Lifetime } from '../src/core.ts';
import { escapeHTML, icon, dialogHeading } from '../src/dom.ts';

test('an earlier async response is invalidated by a new operation and disposal', () => {
  const guard = new Generation();
  const first = guard.next();
  assert.equal(guard.current(first), true);
  const next = guard.next();
  assert.equal(guard.current(first), false);
  assert.equal(guard.current(next), true);
  guard.invalidate();
  assert.equal(guard.current(next), false);
  const last = guard.next();
  guard.destroy();
  assert.equal(guard.current(last), false);
  assert.equal(guard.current(guard.next()), false);
});

test('instance lifetime releases listeners and late registered resources exactly once', () => {
  const life = new Lifetime(); const target = new EventTarget(); let calls = 0; const cleanup: string[] = [];
  life.listen(target, 'change', () => { calls++; });
  life.add(() => cleanup.push('first')); life.add(() => cleanup.push('second'));
  target.dispatchEvent(new Event('change')); assert.equal(calls, 1);
  life.destroy(); life.destroy();
  target.dispatchEvent(new Event('change')); assert.equal(calls, 1);
  life.add(() => cleanup.push('late'));
  assert.deepEqual(cleanup, ['second', 'first', 'late']);
});

test('text and compatibility attribute values cannot inject markup', () => {
  assert.equal(escapeHTML('<img src=x onerror="x"> & \'x\''), '&lt;img src=x onerror=&quot;x&quot;&gt; &amp; &#39;x&#39;');
  assert.equal(escapeHTML(null), '');
  const heading = dialogHeading('<b>Title</b>', 'id" onfocus="evil', 'dialog" onclick="evil');
  assert.ok(heading.includes('&lt;b&gt;Title&lt;/b&gt;'));
  assert.ok(!heading.includes('id="id" onfocus='));
  assert.ok(!icon('missing', '" onload="evil').includes('class="pui-icon pui-icon " onload='));
});
