import { pathToFileURL } from 'node:url';

interface PublisherEnvironment {
  ACTIONS_ID_TOKEN_REQUEST_URL?: string;
  ACTIONS_ID_TOKEN_REQUEST_TOKEN?: string;
}
export interface PublisherVerification {
  success: boolean;
  package: 'pith-ui';
  expires: string | null;
  reason: 'verified' | 'missing-configuration' | 'identity-url' | 'identity-request' | 'identity-status' | 'identity-json' | 'identity-token' | 'exchange-request' | 'exchange-status' | 'exchange-json' | 'exchange-token' | 'exchange-expiry';
  status: number | null;
  tokenPresent: boolean;
  expiresType: 'unavailable' | 'missing' | 'null' | 'string' | 'number' | 'boolean' | 'other';
}

/** Verify exchange identity only. Neither token is returned, persisted or used to publish. */
export async function verifyPublisher(
  environment: PublisherEnvironment = process.env, fetcher: typeof fetch = fetch,
): Promise<PublisherVerification> {
  let reason: PublisherVerification['reason'] = 'missing-configuration';
  let status: number | null = null;
  let tokenPresent = false;
  let expiresType: PublisherVerification['expiresType'] = 'unavailable';
  const result = (expires: string | null = null): PublisherVerification => ({ success: reason === 'verified', package: 'pith-ui', expires, reason, status, tokenPresent, expiresType });
  const safeStatus = (value: number): number | null => [200, 201, 202, 204, 301, 302, 303, 307, 308, 400, 401, 403, 404, 408, 409, 422, 429, 500, 502, 503, 504].includes(value) ? value : null;
  try {
    if (!environment.ACTIONS_ID_TOKEN_REQUEST_URL || !environment.ACTIONS_ID_TOKEN_REQUEST_TOKEN) return result();
    reason = 'identity-url';
    const identityURL = new URL(environment.ACTIONS_ID_TOKEN_REQUEST_URL);
    if (identityURL.protocol !== 'https:' || identityURL.username || identityURL.password) return result();
    identityURL.searchParams.set('audience', 'npm:registry.npmjs.org');
    reason = 'identity-request';
    const identityResponse = await fetcher(identityURL, {
      headers: { authorization: `Bearer ${environment.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` },
      redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15_000),
    });
    status = safeStatus(identityResponse.status);
    reason = 'identity-status';
    if (identityResponse.status !== 200) return result();
    reason = 'identity-json';
    const identity = await identityResponse.json() as { value?: unknown } | null;
    reason = 'identity-token';
    if (typeof identity?.value !== 'string' || !identity.value.trim()) return result();
    reason = 'exchange-request'; status = null;
    const exchangeResponse = await fetcher('https://registry.npmjs.org/-/npm/v1/oidc/token/exchange/package/pith-ui', {
      method: 'POST', headers: { authorization: `Bearer ${identity.value}` },
      redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15_000),
    });
    status = safeStatus(exchangeResponse.status);
    reason = exchangeResponse.ok ? 'exchange-json' : 'exchange-status';
    const exchange = await exchangeResponse.json() as { token?: unknown; expires?: unknown } | null;
    tokenPresent = typeof exchange?.token === 'string' && !!exchange.token.trim();
    const expiry = exchange?.expires;
    expiresType = expiry === undefined ? 'missing' : expiry === null ? 'null' : typeof expiry === 'string' ? 'string' : typeof expiry === 'number' ? 'number' : typeof expiry === 'boolean' ? 'boolean' : 'other';
    if (!exchangeResponse.ok) return result();
    reason = 'exchange-token';
    if (!tokenPresent) return result();
    let expires: string | null = null;
    if (expiry !== undefined) {
      reason = 'exchange-expiry';
      if (typeof expiry !== 'string' || !Number.isFinite(Date.parse(expiry)) || Date.parse(expiry) <= Date.now()) return result();
      expires = new Date(expiry).toISOString();
    }
    reason = 'verified';
    return result(expires);
  } catch {
    // Fetch and JSON errors can contain credentials or response fragments. Never log them.
    return result();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await verifyPublisher();
  console.log(JSON.stringify(result));
  if (!result.success) process.exitCode = 1;
}
