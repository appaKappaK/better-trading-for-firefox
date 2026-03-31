# Better Trading for Firefox
``` ⚠️ POLISHING UI/USER-SPECIFIC NON-BREAKING BUGS BUT IT IS USABLE ⚠️ ```
---
A Firefox-only MV3 extension that enhances the Path of Exile trade site with bookmarks, search history, live trade enhancers, and seamless migration from the original Better Trading add-on.

- **Bookmark trade searches** into named folders, mark trades complete, and update saved locations as leagues change
- **Track search history** automatically as you browse trade pages
- **Live enhancers** on trade result pages: equivalent chaos/divine pricing, stat filter highlighting, socket warnings, and grouped duplicate listings
- **Import from the original add-on**: paste a folder export string or a full backup file and your data carries over

The in-page panel handles live trade work. The popup manages bookmarks, history, settings, and imports.

## Requirements

- Node.js 22+
- npm 10+
- Firefox (any release channel)

## Install

Install from [AMO](https://addons.mozilla.org) *(listing coming soon)*, or load it manually:

```bash
npm install
npm run build
# Load .output/firefox-mv3/ as a temporary add-on in about:debugging
```

## Developer Commands

| Command | What it does |
|---|---|
| `npm run dev` | Hot-reload dev build targeting Firefox MV3 |
| `npm run build` | Production build |
| `npm run zip` | Package a signed-ready `.zip` for AMO upload |
| `npm run compile` | TypeScript type-check (no emit) |
| `npm test` | Unit tests via Vitest |
| `npm run lint:firefox` | `web-ext lint`, auto-builds if output is missing |
| `npm run smoke:firefox` | End-to-end Selenium smoke test against a real Firefox binary |

### Smoke test

`npm run smoke:firefox` packages the extension, installs it into a headless Firefox with Selenium, navigates to a trade page, and verifies the panel mounts. It saves a screenshot to `.output/smoke/firefox-smoke.png`.

The script auto-detects Firefox on Windows, Linux/Fedora, and macOS. Override with:

```bash
FIREFOX_BINARY=/path/to/firefox npm run smoke:firefox
```

## CI

The GitHub Actions pipeline runs on every push and pull request:

1. `npm run compile` - TypeScript
2. `npm test` - unit tests
3. `npm run build` - production build
4. `npm run lint:firefox` - web-ext lint (0 warnings required)
5. `npm run smoke:firefox` - headless Firefox smoke test

A release workflow triggers on semver tags (`v*.*.*`), runs the same gates, then zips and attaches the artifact to a GitHub Release.

## Legacy Migration

To import data from the original Better Trading add-on:

1. Open the extension popup and go to the **Import** tab
2. Paste a folder export string (`3:eyJ...`) or the full backup text from the original add-on
3. Or click **Backup file** to load a `.txt` backup file directly
4. Preview the folder and trade counts, then click **Import legacy data**

All v1, v2, and v3 export formats are supported. Your old extension data is never auto-deleted.

To export your current data: go to the **Bookmarks** tab in the popup and use **Download backup** or **Copy full backup**.

## Background

This extension is a Firefox-native rebuild of [Better Trading](https://github.com/exile-center/better-trading) by exile-center.

The original add-on is Chrome-first. The author has been open about deprioritizing Firefox, citing the stricter review process and smaller user base. The last Firefox release was v1.3.2, which predates Manifest V3 and has fallen increasingly out of step with both Firefox and the trade site itself.

This rebuild starts from scratch with a Firefox-only MV3 architecture, using WXT and Preact instead of the original Ember-based stack. The bookmark export format is kept fully compatible with the original so existing data carries over without any loss.

## Notes

- Firefox is the only supported browser, no Chrome, no cross-browser shims.
- The build aliases `react`/`react-dom` to `preact/compat` to minimize bundle size.
- `npm run lint:firefox` suppresses framework-generated `innerHTML` warnings from bundled output only. Any authored `innerHTML` in `src/` or `entrypoints/` will surface immediately.
