# Component validation and human acceptance

Validation has three independent layers: the block's contract, its real application integration, and a human's visual/interaction assessment. A passing unit test or screenshot does not imply human acceptance or a published release.

## Local checks

```sh
npm ci
npm run check
npm run build
npm test
node scripts/catalog.ts
node scripts/api-docs.ts --check
npx --no-install playwright install chromium webkit
npm run test:browser
npm run showroom:build
```

`npm run check` includes source, case mounts, tests, scripts and the public examples in `docs/examples.ts`. The catalog checker covers documented public factories, duplicate literal case IDs, actual documentation links, snippet syntax and the example type graph. The API reference checker emits declarations in memory from current source and rejects a stale bundled `API.md`; `node scripts/api-docs.ts` explicitly regenerates it. Snippets that refer to host-owned `messages`, `save`, or state are integration fragments; complete examples name and type those dependencies explicitly.

Playwright runs the actual components in Chromium and WebKit. These are browser-engine checks, not a claim that every native application or physical device has been tested. Keep browser errors, failed requests and trace evidence when investigating failures.

Theme colors have one build-only source in `scripts/palette.ts`; Vite and the package builder generate the same ordinary CSS rules. Theme tests cover explicit and nested appearances, missing/invalid preferences and live system changes. Multi-row select checks measure actual option bounds and native selection, since WebKit ignores option-padding declarations; a tall empty control is not evidence of readable row spacing.

Design checks verify the two automatic font roles, only 12/14/16 CSS px text, 400/600 weights, a 1.5 line-height ratio and five spacing values (4/8/12/16/24 CSS px). The showroom tests also reject a free gap editor or a general density chooser, preserve old URL handling and exercise theme, state, width and actual measurements. Native list row metrics and application-supplied graphics/branding are reported separately from ordinary text geometry.

Focus checks verify the absence of focus outlines, glows and border-color highlights under pointer and keyboard interaction, without adding a replacement background. Assert the actual focused element and preserve typing, caret/text selection, native validation, keyboard activation and focus restoration. Compare existing hover, surface shadows, drag feedback and selected/error/permission states separately so removing focus decoration cannot erase those states. The showroom-only focus observer helps inspect traversal; it is not an application focus cue or a claim of visible-keyboard-focus accessibility.

Maintained visual comparison is separate: `node scripts/visual.ts` checks 30 PNGs across five complete pages, two themes and three viewports. It requires the recorded macOS/Apple Silicon environment; Linux CI does not compare Mac system-font pixels. Only explicit `node scripts/visual.ts --update` records candidate baseline changes. See `visual-baselines/README.md`. No image update implies human acceptance.

## Shared behavior matrix

| Area | Essential scenarios |
|---|---|
| Inputs | Initial value, typing/composition, selection, feedback update, explicit reset, long text, disabled/read-only |
| Focus presentation | No focus outline/glow/border highlight; real pointer/Tab focus, activation and restoration remain; existing hover and business-state styles are preserved |
| Async actions | Immediate pending, duplicate prevention, failure retains data, close/reopen, target changed, late result, destroy |
| Forms | Auxiliary buttons do not submit, native validation, local error ownership, secret visibility, multiline select height |
| Floating UI | Initial focus, Tab order, keyboard navigation, Escape, backdrop policy, source-focus restoration |
| Messages | Stable keyed nodes, explicit action availability, tool folding, error semantics, code scrolling, image retention |
| Reader | Literal search, multilingual offsets, match navigation, streaming, image growth, resize, manual anchors, latest intent |
| Files | UTF-8 boundaries, all-page reconstruction, Markdown fallback, safe links, MIME ownership, preview cancellation |
| Lists/system | Empty/loading/error, stable row identity, selected/focused actions, expanded rate details, disabled merge |
| Ownership | Remove listeners/observers/frames/timers and ignore late UI results after disposal |

Pith Desk's existing controller and end-to-end tests remain consumer tests. In particular, keep draft scope/revisions, write-success versus refresh-failure, message/queue target validation, credential semantics, native cancellation, approval target identity, fees lazy-loading, update polling and read acknowledgements in that repository.

## Human showroom review

Start with a full block or page, then inspect its base components and design foundations as needed.

1. Inspect normal light and dark appearance at `900×600`, `1280×800` and `1440×900`; use a narrow container for reachability and wrapping.
2. Exercise the case's legal loading, empty, error, disabled, pending and long-content states. Parameters are enabled only where the real API supports them.
3. Compare themes and container widths side by side. Inspect the three text sizes, two weights, five spacing values, actual measurements and optional rulers. The dimensions exhibit contains fixed standard/compact compatibility samples rather than a general density chooser.
4. Use the keyboard, retain text selection, scroll long output, perform repeated actions and close/reopen surfaces.
5. Replay motion at normal and slow speed; interrupt it and enable reduced motion. Do not infer temporal correctness from a still image.
6. Share the exact URL and explain any issue in a chat or code review. There is no showroom approval button or stored acceptance state.

The showroom labels simulated data and actions. It does not log credentials or send real application commands. CSS-pixel measurements and device pixel ratio are separate facts; browser zoom and actual glyph-font selection are not guessed.

## Product comparison and resource budget

For a new consumer extraction, preserve the prior correct version as a reproducible baseline. Use the same fixtures, themes, viewport and timing on both sides. A useful screenshot pair should compare the same UI state rather than unrelated screens.

For Pith Desk's initial extraction, the maintainer explicitly revised production JS+CSS growth from 15% to at most 25% on 2026-10-16 after reviewing the measured tradeoff. Median warmed CPU/retained JS-heap growth remains at most 20% for input and streaming across five paired runs. Report native process memory separately and state how shared pages are counted. The library CI cannot measure the consumer's native host by itself.

Do not lower a regression assertion or change a budget to make a migration pass. Record the cause, correct it and rerun the affected check. Keep temporary screenshots, benchmark data, browser profiles and tarballs outside source commits.

## Real package acceptance

```sh
npm run build
node scripts/release.ts pack
node scripts/release.ts verify
```

The verifier checks the artifact checksum, public files, exact runtime dependency pins, export boundaries, declarations, CSS and an isolated consumer's type-check and Vite production build. It installs the tarball it was given; it does not silently consume a sibling source checkout.

After npm publication, download that exact version again and repeat consumer validation. Report local validation, npm publication, Pages deployment and native application acceptance separately.
