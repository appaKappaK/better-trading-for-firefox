# Phase 0 Findings

## Confirmed So Far

- The new sibling repo can use Node 22 independently of the legacy Ember repo's Node 18 setup.
- `wxt build -b firefox --mv3` succeeds on Windows.
- WXT's Firefox MV3 output currently emits `background.scripts` in the generated manifest.
- A content script can be scoped to Path of Exile trade pages with narrow host patterns.
- `web-ext lint` now runs reliably on Windows through the local wrapper script and passes without errors.
- The bundle now aliases `react` and `react-dom` to `preact/compat`, reducing framework-generated `web-ext` `innerHTML` warnings from four to two.
- The lint wrapper now suppresses only the remaining known framework-generated `innerHTML` warnings from bundled output, and only while authored source stays free of `innerHTML` and `dangerouslySetInnerHTML`.
- The popup now persists a fresh `btff-schema-v1` record or imports legacy bookmark payloads into it.
- The popup can now load a backup text file directly into the restore flow instead of requiring paste-only restore.
- The popup now exposes bookmark/history management backed by the stored schema, including archive/delete and portable backup/export actions.
- The popup now exposes a real settings surface for enhancer toggles and default panel collapse behavior.
- The popup now exposes build/about metadata and repo links for the current rebuild.
- The in-page Shadow DOM panel now reads the same schema and exposes bookmark/history tabs without losing the phase-0 scan + `poe.ninja` controls.
- The content script now respects saved enhancer preferences instead of applying every enhancer unconditionally.
- The Firefox smoke test is automated and passes end to end on this machine.
- The smoke test is more stable now that Selenium installs the packaged Firefox zip artifact instead of the unpacked build directory.
- Firefox binary auto-detection now includes common Fedora/Linux and macOS install paths, with `FIREFOX_BINARY` as an override.

## Phase-0 Proof Implemented

- fixed Shadow DOM panel mounted from a content script
- one DOM-only enhancer proof based on legacy maximum-sockets logic
- one background-mediated `poe.ninja` fetch proof
- popup-based migration bridge for legacy folder exports and backup text
- file-based restore affordance for legacy-compatible backup text
- popup tabs for bookmark folders and history entries
- popup archive/restore/delete flows plus full backup and single-folder export generation
- popup settings for live enhancer preferences
- in-page panel tabs for bookmark folders and history entries
- Firefox MV3 manifest with narrow permissions and host access

## Next High-Value Work

- add native file-based backup restore affordances and a cleaner about/release surface
- port the legacy storage audit into machine-readable fixtures and migrations
- decide whether staying on `preact/compat` is good enough long-term or whether the final public build should move to native Preact or another UI layer
