import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { isIdenticalPublishedPackage } from '../scripts/published-package.ts';

function tar(content = 'exact tested package\n'.repeat(100), mode = '0000644\0'): Buffer {
  const data = Buffer.from(content);
  const header = Buffer.alloc(512);
  header.write('package/example.txt', 0, 100, 'ascii');
  header.write(mode, 100, 8, 'ascii');
  header.write('0000000\0', 108, 8, 'ascii');
  header.write('0000000\0', 116, 8, 'ascii');
  header.write(data.length.toString(8).padStart(11, '0') + '\0', 124, 12, 'ascii');
  header.write('00000000000\0', 136, 12, 'ascii');
  header.fill(0x20, 148, 156);
  header.write('0', 156, 1, 'ascii');
  header.write('ustar\0', 257, 6, 'ascii');
  header.write('00', 263, 2, 'ascii');
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');
  return Buffer.concat([header, data, Buffer.alloc((512 - data.length % 512) % 512), Buffer.alloc(1024)]);
}
const payload = tar();
const bytes = gzipSync(payload, { level: 1 });
const integrityOf = (data: Uint8Array) => 'sha512-' + createHash('sha512').update(data).digest('base64');
const integrity = integrityOf(bytes);
const metadata = (hash = integrity) => Response.json({ name: 'pith-ui', version: '0.1.0', dist: { tarball: 'https://registry.npmjs.org/pith-ui/-/pith-ui-0.1.0.tgz', integrity: hash } });
function registry(responses: Response[]): typeof fetch {
  return async () => { const next = responses.shift(); assert.ok(next, 'Unexpected extra registry request'); return next; };
}
test('only a metadata 404 permits publication', async () => {
  assert.equal(await isIdenticalPublishedPackage('pith-ui', '0.1.0', bytes, registry([new Response('', { status: 404 })])), false);
  await assert.rejects(isIdenticalPublishedPackage('pith-ui', '0.1.0', bytes, registry([new Response('', { status: 500 })])), /metadata lookup failed: HTTP 500/);
});
test('an existing version with identical gzip bytes skips publication after registry SHA-512 verification', async () => {
  assert.equal(await isIdenticalPublishedPackage('pith-ui', '0.1.0', bytes, registry([metadata(), new Response(bytes)])), true);
});
test('different gzip encodings of the identical complete TAR payload skip publication', async () => {
  const encoded = gzipSync(payload, { level: 9 });
  assert.notDeepEqual(encoded, bytes, 'The fixture must exercise different compressed bytes');
  assert.equal(await isIdenticalPublishedPackage('pith-ui', '0.1.0', bytes, registry([metadata(integrityOf(encoded)), new Response(encoded)])), true);
});
test('different file contents or TAR metadata refuse immutable publication', async () => {
  for (const archive of [tar('different package contents'), tar(undefined, '0000600\0')]) {
    const encoded = gzipSync(archive);
    await assert.rejects(isIdenticalPublishedPackage('pith-ui', '0.1.0', bytes, registry([metadata(integrityOf(encoded)), new Response(encoded)])), /different archive payload/);
  }
});
test('corrupt gzip is refused even with matching integrity or identical compressed bytes', async () => {
  const corrupt = Buffer.from(bytes);
  corrupt[corrupt.length - 8] = corrupt[corrupt.length - 8]! ^ 0xff;
  for (const tested of [bytes, corrupt]) {
    await assert.rejects(isIdenticalPublishedPackage('pith-ui', '0.1.0', tested, registry([metadata(integrityOf(corrupt)), new Response(corrupt)])), /gzip archive is invalid/);
  }
  await assert.rejects(isIdenticalPublishedPackage('pith-ui', '0.1.0', corrupt, registry([metadata(), new Response(bytes)])), /gzip archive is invalid/);
});
test('gzip expansion beyond the fixed 32 MiB limit is refused', async () => {
  const oversized = gzipSync(Buffer.alloc(32 * 1024 * 1024 + 1));
  await assert.rejects(isIdenticalPublishedPackage('pith-ui', '0.1.0', bytes, registry([metadata(integrityOf(oversized)), new Response(oversized)])), /32 MiB decompressed size limit/);
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
