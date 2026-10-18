# Release

Complete implementation, current browser regressions, generated docs and the
actual tarball consumer check before publication. Review staged and remaining
paths, commit, then push main. Wait for Validate on that exact commit. A matching
`vVERSION` tag publishes the successful CI artifact using npm Trusted Publishing
and the protected npm environment; the tag does not start a second validation.

Confirm workflow success, registry version/latest tag, archive integrity and an
independent install of the registry artifact. Existing immutable versions must
have identical archive content; never overwrite or accept a different package.

Only then install the exact formal version in Desk and commit its registry lock.
Remove local copies, validate business mapping and existing data, and provide an
isolated local preview. Desk desktop publication follows user acceptance and is
separate from publishing this library.
