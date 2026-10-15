import { pathToFileURL } from 'node:url';

interface PublisherEnvironment {
  ACTIONS_ID_TOKEN_REQUEST_URL?: string;
  ACTIONS_ID_TOKEN_REQUEST_TOKEN?: string;
}
export interface PublisherVerification {
  success: boolean;
  package: 'pith-ui';
  expires: string | null;
}

/** Verify exchange identity only. Neither token is returned, persisted or used to publish. */
export async function verifyPublisher(
  environment: PublisherEnvironment = process.env, fetcher: typeof fetch = fetch,
): Promise<PublisherVerification> {
  const failure: PublisherVerification = { success: false, package: 'pith-ui', expires: null };
  try {
    if (!environment.ACTIONS_ID_TOKEN_REQUEST_URL || !environment.ACTIONS_ID_TOKEN_REQUEST_TOKEN) return failure;
    const identityURL = new URL(environment.ACTIONS_ID_TOKEN_REQUEST_URL);
    if (identityURL.protocol !== 'https:' || identityURL.username || identityURL.password) return failure;
    identityURL.searchParams.set('audience', 'npm:registry.npmjs.org');
    const identityResponse = await fetcher(identityURL, {
      headers: { authorization: `Bearer ${environment.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` },
      redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15_000),
    });
    if (identityResponse.status !== 200) return failure;
    const identity = await identityResponse.json() as { value?: unknown } | null;
    if (typeof identity?.value !== 'string' || !identity.value.trim()) return failure;
    const exchangeResponse = await fetcher('https://registry.npmjs.org/-/npm/v1/oidc/token/exchange/package/pith-ui', {
      method: 'POST', headers: { authorization: `Bearer ${identity.value}` },
      redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15_000),
    });
    if (exchangeResponse.status !== 201) return failure;
    const exchange = await exchangeResponse.json() as { token?: unknown; expires?: unknown } | null;
    if (typeof exchange?.token !== 'string' || !exchange.token.trim() || typeof exchange.expires !== 'string') return failure;
    const expiry = Date.parse(exchange.expires);
    if (!Number.isFinite(expiry) || expiry <= Date.now()) return failure;
    return { success: true, package: 'pith-ui', expires: new Date(expiry).toISOString() };
  } catch {
    // Fetch and JSON errors can contain credentials or response fragments. Never log them.
    return failure;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await verifyPublisher();
  console.log(JSON.stringify(result));
  if (!result.success) process.exitCode = 1;
}
