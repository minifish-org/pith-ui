# Releasing the package and showroom

The package is `pith-ui`, with runtime dependencies and build tools fixed by the checked-in lockfile. Initial version is `0.1.0`. Keep a consumer on an exact released version until its integration checks pass.

## Release pipeline

| Workflow | Trigger | Result |
|---|---|---|
| `ci.yml` | Main push, pull request, manual run, reusable call | Types, build, tests, catalog/examples, showroom build, isolated tarball verification; uploads the tested package and manifest |
| `pages.yml` | Main push, version tag or manual run | Static showroom deployment through GitHub Pages |
| `publish.yml` | A pushed `v*` tag | Runs the reusable validation workflow, verifies the tag/version and artifact checksum, then publishes that same tarball with npm OIDC |
| `publish.yml` | Manual run | Runs only the independent trusted-publisher identity check; does not build or publish a package |

Workflows pin GitHub actions to verified commits, Node to `22.18.0` and npm to `11.12.1`. Dependencies are installed with `npm ci`. Publishing has no package-manager cache and no long-lived npm token.

`scripts/release.ts` implements `verify-tag`, `pack`, `verify` and `publish`. Its manifest records the source commit and whether the tree was dirty; publish requires a clean committed source artifact. Only `publish` sends a package to npm. Before sending, it checks the exact public npm version: a metadata 404 permits publication. For an existing version, it verifies the downloaded gzip against registry SHA-512 and compares the complete decompressed TAR bytes, including file metadata, with the tested archive before skipping re-publication. Gzip encoding can differ across operating systems; archive payloads must match exactly. Invalid gzip, expansion beyond 32 MiB, a different payload, registry errors or download failure stop the job. A build or a successful `pack` is not publication.

Prereleases publish to the `next` dist-tag; stable versions publish to `latest`. A prerelease must not move consumers of `latest` to an unfinished application migration. The same isolated verifier checks both public ESM/type entries, portable CSS, the bundled application contract and API reference, the complete maintained application controller, small-control compositions and forbidden default-entry options. Strict declaration checking remains enabled, forbidden application UI surfaces must fail compilation, and both application and small-control consumers must produce real production JS and CSS.

## One-time remote setup

For GitHub Pages, choose **GitHub Actions** as the repository's publishing source. The workflow deploys `showroom-dist` with the `/pith-ui/` base path. Its target is https://minifish-org.github.io/pith-ui/. A configured workflow alone does not prove that the site is live.

For npm trusted publishing, configure this package's publisher with these exact identities:

| Field | Value |
|---|---|
| GitHub organization/user | `minifish-org` |
| Repository | `pith-ui` |
| Workflow filename | `publish.yml` |
| Environment | `npm` |
| Allowed action | Direct `npm publish` |

The publisher must match the job's GitHub environment and workflow filename. Keep `repository.url` aligned with this repository. The initial bootstrap package may require an authenticated maintainer publish before npm exposes package settings; that is separate from configuring the subsequent OIDC pipeline.

After saving the trusted publisher, manually run `publish.yml` to request a GitHub OIDC token with audience `npm:registry.npmjs.org` and exchange it through the [official npm OIDC endpoint](https://api-docs.npmjs.com/#tag/OIDC). The `verify-publisher` job uses the same workflow filename and `npm` environment. Following the [npm 11.12.1 exchange client](https://github.com/npm/cli/blob/v11.12.1/lib/utils/oidc.js), the standalone TypeScript script accepts successful 2xx responses with a nonempty npm token. Expiry is informational: recognized future ISO dates or numeric Unix seconds/milliseconds are normalized to ISO; missing or unsupported metadata is reported as `null` without fabricating a lifetime. Identity success depends on the successful HTTP exchange and nonempty token, as in the official client. Tokens remain local to the short-lived process and are neither persisted, returned nor used. Output contains only `success`, `package`, `expires` and safe diagnostics: a fixed `reason` enum, allowlisted integer HTTP `status` (otherwise `null`), boolean `tokenPresent` and fixed `expiresType` enum. Failures exit nonzero without response bodies, response key lists, URLs or arbitrary error messages. Requests reject redirects and have bounded timeouts.

A successful exchange verifies that npm accepted that GitHub OIDC identity. It does **not** prove an actual OIDC package publication, direct-publish permission or that npm's publisher page has changed from Pending validation. Check the UI separately and report any remaining pending state or expiry honestly. A tag run that merely confirms an already published immutable package also does not exercise OIDC publishing. Do not create another package version solely to validate identity.

Current npm guidance requires Node ≥22.14 and npm ≥11.5.1, GitHub-hosted runners and `id-token: write`. This workflow meets those floors; verify current registry guidance when changing the release path. Trusted publication from a public repository/package provides provenance automatically. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/), [GitHub's Node package publication guide](https://docs.github.com/en/actions/tutorials/publish-packages/publish-nodejs-packages) and [custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

No remote publisher, environment protection, branch rule or npm account setting is changed merely by adding these files.

## Prepare and verify a version

1. Keep the change and migration description scoped to its final behavior. Review both the library and its Pith Desk adapter.
2. Set the package version and lockfile together. Use a patch for compatible fixes and a minor version for breaking changes during `0.x`; document the migration explicitly.
3. Run the checks in `validation.md`, inspect the affected showroom cases and validate the real tarball in the consumer.
4. Review staged paths in both repositories. Commit source, documentation and permanent tests only.
5. Push the reviewed commit and create the matching `v<package version>` tag when publication is authorized. The release job rejects a mismatched tag.
6. Inspect the exact tagged workflow. Do not reissue publication after an ambiguous outcome without checking the registry first.
7. Download the exact npm version, compare its tarball checksum with the tested artifact, and repeat the consumer build/smoke check before locking Pith Desk to it.
8. Verify the deployed showroom and a shared component/state URL. Report what was actually observed.

For a first manual bootstrap, publish the verified artifact rather than rebuilding a different tree. The later matching tag can validate that same immutable npm artifact and skip a duplicate publish; it cannot overwrite a different artifact with the same version. Follow npm's interactive authentication/2FA flow as needed. Never copy tokens into source, workflow YAML or logs.

If an npm version is already public, treat it as immutable and prepare a new version for a correction. A new UI package does not automatically authorize publishing a Pith Desk desktop installer.
