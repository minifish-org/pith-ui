# Releasing the package and showroom

The package is `pith-ui`, with runtime dependencies and build tools fixed by the checked-in lockfile. Initial version is `0.1.0`. Keep a consumer on an exact released version until its integration checks pass.

## Release pipeline

| Workflow | Trigger | Result |
|---|---|---|
| `ci.yml` | Main push, pull request, manual run, reusable call | Types, build, tests, catalog/examples, showroom build, isolated tarball verification; uploads the tested package and manifest |
| `pages.yml` | Main push, version tag or manual run | Static showroom deployment through GitHub Pages |
| `publish.yml` | A pushed `v*` tag | Runs the reusable validation workflow, verifies the tag/version and artifact checksum, then publishes that same tarball with npm OIDC |

Workflows pin GitHub actions to verified commits, Node to `22.18.0` and npm to `11.12.1`. Dependencies are installed with `npm ci`. Publishing has no package-manager cache and no long-lived npm token.

`scripts/release.ts` implements `verify-tag`, `pack`, `verify` and `publish`. Its manifest records the source commit and whether the tree was dirty; publish requires a clean committed source artifact. Only `publish` sends a package to npm. Before sending, it checks the exact public npm version: a metadata 404 permits publication. For an existing version, it verifies the downloaded gzip against registry SHA-512 and compares the complete decompressed TAR bytes, including file metadata, with the tested archive before skipping re-publication. Gzip encoding can differ across operating systems; archive payloads must match exactly. Invalid gzip, expansion beyond 32 MiB, a different payload, registry errors or download failure stop the job. A build or a successful `pack` is not publication.

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
