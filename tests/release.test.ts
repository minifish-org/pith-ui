import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { isIdenticalPublishedPackage } from '../scripts/published-package.ts';

const bytes = new TextEncoder().encode('exact tested tarball');
const integrity = 'sha512-' + createHash('sha512').update(bytes).digest('base64');
const metadata = (hash = integrity) => Response.json({ name: 'pith-ui', version: '0.1.0', dist: { tarball: 'https://registry.npmjs.org/pith-ui/-/pith-ui-0.1.0.tgz', integrity: hash } });
function registry(responses: Response[]): typeof fetch {
  return async () => { const next = responses.shift(); assert.ok(next, 'Unexpected extra registry request'); return next; };
}
test('only a metadata 404 permits publication', async () => {
  assert.equal(await isIdenticalPublishedPackage('pith-ui', '0.1.0', bytes, registry([new Response('', { status: 404 })])), false);
  await assert.rejects(isIdenticalPublishedPackage('pith-ui', '0.1.0', bytes, registry([new Response('', { status: 500 })])), /metadata lookup failed: HTTP 500/);
});
test('an existing version skips publication only after downloaded SHA-512 identity', async () => {
  assert.equal(await isIdenticalPublishedPackage('pith-ui', '0.1.0', bytes, registry([metadata(), new Response(bytes)])), true);
  await assert.rejects(isIdenticalPublishedPackage('pith-ui', '0.1.0', bytes, registry([metadata(), new Response('different artifact')])), /different tarball/);
});
test('registry integrity metadata and tarball HTTP errors cannot be treated as an absent version', async () => {
  await assert.rejects(isIdenticalPublishedPackage('pith-ui', '0.1.0', bytes, registry([metadata('sha512-invalid'), new Response(bytes)])), /integrity metadata differs/);
  await assert.rejects(isIdenticalPublishedPackage('pith-ui', '0.1.0', bytes, registry([metadata(), new Response('', { status: 404 })])), /tarball download failed: HTTP 404/);
});
test('network failures propagate and registry metadata cannot select a foreign tarball', async () => {
  await assert.rejects(isIdenticalPublishedPackage('pith-ui', '0.1.0', bytes, async () => { throw new Error('network unavailable'); }), /network unavailable/);
  const foreign = Response.json({ name: 'pith-ui', version: '0.1.0', dist: { tarball: 'https://example.com/package.tgz', integrity } });
  await assert.rejects(isIdenticalPublishedPackage('pith-ui', '0.1.0', bytes, registry([foreign])), /expected npm registry/);
});
