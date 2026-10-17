# Release procedure

Finish all documented template assemblies and permanent regressions before changing the public entry. Converge the showroom to formal parts only. The root and stylesheet are the only package exports; documentation sources are not exported scene APIs.

Choose an unused npm version from the live registry. Update package metadata and lockfile, generate API/catalog documentation, clean the build output and verify that no old app entry remains. Compile all shipped recipes from an isolated installation of the actual tarball, preserve corruption/declaration-negative checks and compare the archive checksum.

Run the required local checks in `docs/validation.md`. Inspect staged and remaining paths; commit only implementation, permanent tests and documentation. Merge the completed refactor into main, push main, then push a matching `vVERSION` tag. Existing GitHub Actions validate, pack, independently verify and publish that tested artifact using npm Trusted Publishing. The publish workflow requires the protected `npm` environment and an exact tag/package version match.

Publication does not follow from pushing a tag. Confirm CI and publish completion, registry version/dist-tag, tarball integrity and independently installed exports/types/CSS/assembly examples. An immutable already-published version must have identical archive content; never overwrite or silently accept a different package.

Only then migrate Desk to the exact registry version, commit its lockfile, move the documented assembly and projection code into Desk, verify all regions, merge main and compile the local application. Report exact version/commit, package proof and build result separately from human acceptance.
