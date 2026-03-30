# Changelog

## [1.0.0] - 2026-03-30

Initial release.

### Features
- Bookmark trade searches into named folders with icons, archiving, and drag-and-drop reordering
- Folder export and import compatible with the original Better Trading backup format (v1, v2, v3)
- Automatic search history tracking with timestamps and quick-jump links
- Live enhancers on trade result pages: stat filter highlighting, socket warnings, chaos-equivalent pricing via poe.ninja, and result regrouping
- Pinned items to keep individual results visible while browsing
- Collapsible in-page side panel with dock button showing pinned and result counts
- Popup for managing bookmarks, history, settings, and legacy imports
- Full settings page with per-enhancer toggles

### Infrastructure
- Firefox-only MV3 with WXT and Preact
- CI pipeline: typecheck, unit tests, production build, web-ext lint, headless Selenium smoke test
- Release workflow: zips and attaches artifact to GitHub Release on semver tags
- 51 unit tests across all core modules
