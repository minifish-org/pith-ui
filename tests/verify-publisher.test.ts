import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { verifyPublisher, type PublisherVerification } from '../scripts/verify-publisher.ts';

const environment = {
  ACTIONS_ID_TOKEN_REQUEST_URL: 'https://actions.example.test/token?api-version=2.0&audience=old',
  ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'request-secret-canary',
};
const idToken = 'oidc-secret-canary';
const npmToken = 'npm-secret-canary';
const expires = '2099-01-01T00:00:00.000Z';
const success = { success: true, package: 'pith-ui', expires, reason: 'verified', status: 201, tokenPresent: true, expiresType: 'string' };
function assertFailure(result: PublisherVerification, reason?: PublisherVerification['reason']): void {
  assert.equal(result.success, false); assert.equal(result.package, 'pith-ui'); assert.equal(result.expires, null);
  if (reason) assert.equal(result.reason, reason);
  assert.deepEqual(Object.keys(result).sort(), ['expires', 'expiresType', 'package', 'reason', 'status', 'success', 'tokenPresent']);
  assert.equal(typeof result.tokenPresent, 'boolean');
  for (const secret of [idToken, npmToken, environment.ACTIONS_ID_TOKEN_REQUEST_TOKEN]) assert.ok(!JSON.stringify(result).includes(secret));
}
function responses(values: Response[]): typeof fetch & { calls: number } {
  const fetcher = Object.assign(async () => {
    fetcher.calls++; const next = values.shift(); assert.ok(next, 'Unexpected extra token request'); return next;
  }, { calls: 0 });
  return fetcher;
}
const identity = () => Response.json({ value: idToken });
const exchange = () => Response.json({ token: npmToken, expires }, { status: 201 });

test('publisher verification requests the npm audience and exchanges identity without returning secrets', async () => {
  const calls: Array<{ url: string; options: RequestInit | undefined }> = [];
  const queue = [identity(), exchange()];
  const fetcher: typeof fetch = async (input, options) => {
    calls.push({ url: String(input), options }); const next = queue.shift(); assert.ok(next); return next;
  };
  const result = await verifyPublisher(environment, fetcher);
  assert.deepEqual(result, success);
  assert.equal(calls.length, 2);
  const url = new URL(calls[0]!.url);
  assert.equal(url.searchParams.get('audience'), 'npm:registry.npmjs.org');
  assert.equal(url.searchParams.get('api-version'), '2.0');
  assert.equal(url.searchParams.getAll('audience').length, 1);
  assert.equal(new Headers(calls[0]!.options?.headers).get('authorization'), `Bearer ${environment.ACTIONS_ID_TOKEN_REQUEST_TOKEN}`);
  assert.equal(calls[1]!.url, 'https://registry.npmjs.org/-/npm/v1/oidc/token/exchange/package/pith-ui');
  assert.equal(calls[1]!.options?.method, 'POST');
  assert.equal(new Headers(calls[1]!.options?.headers).get('authorization'), `Bearer ${idToken}`);
  for (const call of calls) {
    assert.equal(call.options?.redirect, 'error'); assert.equal(call.options?.cache, 'no-store');
    assert.ok(call.options?.signal instanceof AbortSignal); assert.equal(call.options?.body, undefined);
  }
  for (const secret of [environment.ACTIONS_ID_TOKEN_REQUEST_TOKEN, idToken, npmToken]) assert.ok(!JSON.stringify(result).includes(secret));
});
test('missing or unsafe Actions identity configuration fails without requesting credentials', async () => {
  const fetcher = responses([]);
  for (const env of [{}, { ...environment, ACTIONS_ID_TOKEN_REQUEST_TOKEN: '' }, { ...environment, ACTIONS_ID_TOKEN_REQUEST_URL: 'http://actions.example.test/token' }, { ...environment, ACTIONS_ID_TOKEN_REQUEST_URL: 'https://user:password@actions.example.test/token' }]) {
    assertFailure(await verifyPublisher(env, fetcher));
    assert.equal(fetcher.calls, 0, 'No token request should be sent');
  }
});
test('identity HTTP errors, malformed JSON and missing tokens cannot reach npm exchange', async () => {
  for (const response of [new Response(idToken, { status: 302 }), new Response(idToken, { status: 401 }), new Response(idToken), Response.json(null), Response.json({ value: '' })]) {
    const fetcher = responses([response]);
    assertFailure(await verifyPublisher(environment, fetcher));
    assert.equal(fetcher.calls, 1, 'A rejected identity must not be sent to npm');
  }
});
test('official npm client compatible 2xx exchange accepts a token with optional expiry', async () => {
  for (const status of [200, 201]) for (const payload of [{ token: npmToken, expires }, { token: npmToken }]) {
    assert.deepEqual(await verifyPublisher(environment, responses([identity(), Response.json(payload, { status })])), {
      success: true, package: 'pith-ui', expires: 'expires' in payload ? expires : null,
      reason: 'verified', status, tokenPresent: true, expiresType: 'expires' in payload ? 'string' : 'missing',
    });
  }
});
test('npm exchange requires a successful status, a nonempty token and valid expiry when present', async () => {
  for (const response of [
    new Response(npmToken, { status: 302 }), new Response(npmToken, { status: 401 }), new Response(npmToken, { status: 500 }),
    new Response(npmToken, { status: 201 }), Response.json(null, { status: 201 }),
    Response.json({ token: '', expires }, { status: 201 }), Response.json({ token: npmToken, expires: npmToken }, { status: 201 }),
    Response.json({ token: npmToken, expires: '2000-01-01T00:00:00.000Z' }, { status: 201 }),
  ]) {
    const fetcher = responses([identity(), response]);
    assertFailure(await verifyPublisher(environment, fetcher));
    assert.equal(fetcher.calls, 2, 'Exchange failures must not be retried');
  }
  assert.deepEqual(await verifyPublisher(environment, responses([identity(), Response.json({ token: npmToken, expires: 123 }, { status: 201 })])), {
    success: false, package: 'pith-ui', expires: null, reason: 'exchange-expiry', status: 201, tokenPresent: true, expiresType: 'number',
  });
});
test('network exceptions cannot expose credential-bearing messages or response bodies', async () => {
  const fail: typeof fetch = async () => { throw new Error(`${idToken} ${npmToken} ${environment.ACTIONS_ID_TOKEN_REQUEST_TOKEN}`); };
  assertFailure(await verifyPublisher(environment, fail), 'identity-request');
  let calls = 0;
  const failExchange: typeof fetch = async () => { if (++calls === 1) return identity(); return fail('https://registry.npmjs.org'); };
  assertFailure(await verifyPublisher(environment, failExchange), 'exchange-request');
  assert.equal(calls, 2);
});
test('successful token exchange, token-bearing response bodies and exceptions are never logged', async () => {
  const logs: unknown[][] = [];
  const originalLog = console.log; const originalError = console.error;
  try {
    console.log = (...args: unknown[]) => { logs.push(args); };
    console.error = (...args: unknown[]) => { logs.push(args); };
    assert.deepEqual(await verifyPublisher(environment, responses([identity(), exchange()])), success);
    assertFailure(await verifyPublisher(environment, responses([identity(), new Response(npmToken, { status: 401 })])), 'exchange-status');
    assertFailure(await verifyPublisher(environment, responses([identity(), new Response(npmToken, { status: 201 })])), 'exchange-json');
    assertFailure(await verifyPublisher(environment, responses([new Response(idToken)])), 'identity-json');
    const fetcher: typeof fetch = async () => { throw new Error(npmToken); };
    assertFailure(await verifyPublisher(environment, fetcher), 'identity-request');
  } finally { console.log = originalLog; console.error = originalError; }
  assert.deepEqual(logs, []);
});
test('CLI failure emits only the safe result fields, with no raw URL, token, stack or response body', () => {
  const extension = import.meta.url.endsWith('.ts') ? '.ts' : '.js';
  const script = fileURLToPath(new URL(`../scripts/verify-publisher${extension}`, import.meta.url));
  const processResult = spawnSync(process.execPath, [script], {
    encoding: 'utf8', env: { ...process.env, ...environment, ACTIONS_ID_TOKEN_REQUEST_URL: `invalid-url-${idToken}` },
  });
  assert.equal(processResult.status, 1);
  assertFailure(JSON.parse(processResult.stdout), 'identity-url');
  assert.equal(processResult.stderr, '');
  for (const secret of [idToken, npmToken, environment.ACTIONS_ID_TOKEN_REQUEST_TOKEN]) assert.ok(!`${processResult.stdout}${processResult.stderr}`.includes(secret));
});
