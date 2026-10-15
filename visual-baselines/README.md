# Maintained visual regression baselines

These PNGs are maintained source artifacts for visual comparison and review. They are the intentional exception to the rule excluding ad hoc screenshots and temporary reports from commits. Recording a baseline does not record human acceptance.

The matrix is five real showroom pages × light/dark × `900×600`, `1280×800`, `1440×900`: 30 full-page screenshots. They include the gallery controls and actual measurements. A requested canvas width remains constrained by the gallery's available space; the browser viewport and rendered component width are separate values.

```sh
node scripts/visual.ts          # strict comparison; missing or changed snapshots fail
node scripts/visual.ts --update # explicitly create/replace candidate PNGs for review
```

The launcher verifies `darwin-arm64` and the exact environment in `darwin-arm64/environment.json`: macOS version/build, Playwright version, bundled Chromium revision/version, DPR 1, locale, timezone, motion preference and viewports. It fixes the page clock and waits for fonts and the initial measurement frame. The per-pixel YIQ color threshold is `0.02` to tolerate observed 1–7-level RGB rounding at antialiased edges; the allowed count of pixels beyond that threshold is zero. No region is masked, and check mode never creates or updates baselines.

The separate `playwright.visual.config.ts` and `visual-tests/` directory keep these checks out of ordinary Chromium/WebKit behavior tests and Linux CI, whose system fonts differ. Raw Playwright invocations can bypass the launcher's platform check, so use the documented launcher for baseline work. Review platform/browser upgrades and any intentional visual change before running `--update`; commit the resulting PNG diff with its relevant source change. Failure output and traces are temporary files in ignored `visual-results/`.
