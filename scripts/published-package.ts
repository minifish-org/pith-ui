import { createHash } from 'node:crypto';

/** A registry metadata 404 is the only condition that permits a new publication. */
export async function isIdenticalPublishedPackage(
  name: string, version: string, testedTarball: Uint8Array, fetcher: typeof fetch = fetch,
): Promise<boolean> {
  const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => { if (!condition) throw new Error(message); };
  const response = await fetcher(`https://registry.npmjs.org/${encodeURIComponent(name)}/${encodeURIComponent(version)}`, { headers: { 'cache-control': 'no-cache' } });
  if (response.status === 404) return false;
  assert(response.ok, `npm registry metadata lookup failed: HTTP ${response.status}`);
  const published = await response.json() as { name?: string; version?: string; dist?: { tarball?: string; integrity?: string } };
  assert(published.name === name && published.version === version, 'npm registry returned a different package version');
  assert(published.dist?.tarball && published.dist.integrity, 'Published package lacks tarball or integrity metadata');
  const url = new URL(published.dist.tarball);
  assert(url.protocol === 'https:' && url.hostname === 'registry.npmjs.org', 'Published tarball is not served by the expected npm registry');
  const download = await fetcher(url);
  assert(download.ok, `Published tarball download failed: HTTP ${download.status}`);
  const downloaded = new Uint8Array(await download.arrayBuffer());
  const integrity = (bytes: Uint8Array) => 'sha512-' + createHash('sha512').update(bytes).digest('base64');
  const expected = integrity(testedTarball);
  assert(integrity(downloaded) === expected, 'This immutable npm version already contains a different tarball; publication was refused');
  assert(published.dist.integrity.split(/\s+/).includes(expected), 'Published npm integrity metadata differs from the tested tarball');
  return true;
}
