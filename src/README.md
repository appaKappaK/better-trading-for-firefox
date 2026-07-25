# Better Trading for Firefox: developer guide

This document covers the source layout, local workflow, testing, and releases. See the [project README](../README.md) for installation and user-facing features.

## Requirements

- Node.js 22.13 or newer; [`.nvmrc`](../.nvmrc) currently pins 22.22.2
- npm 10 or newer
- Firefox 142 or newer for manual and smoke testing

Install the pinned toolchain and dependencies from the repository root:

```bash
nvm install
nvm use
npm ci --legacy-peer-deps
```

`npm ci` uses the committed lockfile and replaces an existing `node_modules` directory. If npm reports an engine mismatch, run `nvm use` and repeat `npm ci --legacy-peer-deps` before investigating package warnings.

## Build and load in Firefox

Development and production builds use different output directories.

### Live development

```bash
npm run dev
```

WXT writes the live development extension to `.output/firefox-mv3-dev/`. If Firefox does not open it automatically, visit `about:debugging#/runtime/this-firefox`, select **Load Temporary Add-on**, and open:

```text
.output/firefox-mv3-dev/manifest.json
```

Keep the dev command running for rebuilds. Reload the temporary extension and the trade-page tab when a content-script change is not picked up automatically.

### Production build

```bash
npm run build
```

The production extension is written to `.output/firefox-mv3/`. To test exactly what will be packaged, temporarily load:

```text
.output/firefox-mv3/manifest.json
```

Do not leave the production directory loaded while expecting `npm run dev` changes: the two manifests belong to separate builds. Use `npm run zip` to create the Firefox extension and source archives in `.output/`.

## Source layout

| Path | Responsibility |
|------|----------------|
| [`../entrypoints/content.tsx`](../entrypoints/content.tsx) | Mounts the shadow-root interface, observes the trade page, coordinates storage, pins, history, panel state, and enhancers |
| [`../entrypoints/popup/`](../entrypoints/popup/) | Toolbar popup shell, page routing, import flow, feedback, and popup styling |
| [`../entrypoints/background.ts`](../entrypoints/background.ts) | Extension lifecycle handling and cached poe.ninja currency requests |
| [`content/`](content/) | In-page panel components, trade DOM parsing, pinned results, drag behavior, and page enhancers |
| [`popup/`](popup/) | Reusable popup views and helpers |
| [`components/`](components/) | Shared visual components such as folder icons and name-color controls |
| [`features/bookmarks/`](features/bookmarks/) | Bookmark-domain types |
| [`lib/storage/`](lib/storage/) | Persisted schema, normalization, mutations, imports, and browser storage adapters |
| [`lib/legacy/`](lib/legacy/) | Original Better Trading backup parsing and export compatibility |
| [`lib/trade/`](lib/trade/) | PoE 1 and PoE 2 trade-location parsing and comparison |
| [`lib/poeNinja/`](lib/poeNinja/) | Currency response parsing and cache helpers |
| [`lib/preferences/`](lib/preferences/) | Enhancer definitions and preference helpers |
| [`../tests/`](../tests/) | Vitest component, storage, parser, DOM-fixture, and configuration tests |
| [`../scripts/`](../scripts/) | Firefox lint wrapper, Selenium smoke test, and release validation |

WXT discovers the files under `entrypoints/` and generates the manifest and bundles. Source files use React-compatible imports, which [`wxt.config.ts`](../wxt.config.ts) and [`vitest.config.ts`](../vitest.config.ts) alias to `preact/compat`.

## Architecture notes

- The in-page interface renders inside a shadow root so its layout and styles remain isolated from the trade site. Host-page enhancements are deliberately applied outside that root.
- Trade-page DOM mutations feed a debounced refresh in the content entrypoint. Keep selectors and parsing in focused helpers under `src/content/` so they can be exercised with small DOM fixtures.
- Durable user data is stored in `browser.storage.local` under `btff-schema-v1`. The popup and content script listen for storage changes so each view follows the same schema.
- Storage changes should update schema types, empty defaults, migration/normalization behavior, and focused tests together. Preserve legacy import/export compatibility unless a format change is intentional.
- Pins can optionally persist within a trade tab's Firefox session. That tab-scoped state uses `sessionStorage`; it is separate from the durable bookmark and history schema.
- The background entrypoint fetches poe.ninja ratios rather than giving UI components direct network responsibilities. Cached ratio data expires after one hour.
- Avoid authored `innerHTML` and `dangerouslySetInnerHTML`. The Firefox lint wrapper only suppresses a narrowly recognized framework-generated warning in bundled output.

## Commands

Run commands from the repository root.

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start the Firefox MV3 development build in `.output/firefox-mv3-dev/` |
| `npm run build` | Create the production build in `.output/firefox-mv3/` |
| `npm run zip` | Build and package Firefox and source archives |
| `npm run compile` | Type-check with TypeScript without emitting files |
| `npm test` | Run the Vitest suite once |
| `npm run lint:firefox` | Build if needed and run the Firefox extension linter |
| `npm run smoke:firefox` | Package and exercise the extension in headless Firefox with Selenium |
| `npm run release:prepare -- --tag vX.Y.Z` | Validate release metadata and extract notes for an already packaged version |

For a focused test file, pass its path through npm:

```bash
npm test -- tests/pageTitle.test.ts
```

Before committing a functional change, run the relevant focused tests followed by the complete verification sequence:

```bash
npm run compile
npm test
npm run build
npm run lint:firefox
npm run smoke:firefox
```

### Firefox smoke test

The smoke script packages the production extension, installs it in a clean headless Firefox profile, opens a Path of Exile trade URL, and replaces the result area with a deterministic fixture. It checks the popup, in-page panel, pins, bookmarks, history, drag/sidebar behavior, and selected layout measurements.

Diagnostics and screenshots are written under `.output/smoke/`. The script locates Firefox on Windows, Linux/Fedora, and macOS. Override its defaults when necessary:

```bash
FIREFOX_BINARY=/path/to/firefox npm run smoke:firefox
BTFF_START_URL=https://www.pathofexile.com/trade/search/Standard/example npm run smoke:firefox
```

## CI and branches

Active work belongs on `dev`; `master` represents the latest released source. The [CI workflow](../.github/workflows/ci.yml) runs for pushes and pull requests targeting either branch and requires:

1. TypeScript compilation
2. Unit and component tests
3. A production build
4. Firefox extension linting
5. The headless Firefox smoke test

Avoid putting release-only commits directly on `master`. Prepare and verify them on `dev`, then merge the intended release state to `master`.

## Release process

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

1. Move the intended entries from `[Unreleased]` in [`CHANGELOG.md`](../CHANGELOG.md) into `## [X.Y.Z] - YYYY-MM-DD`, then leave a fresh `[Unreleased]` section above it.
2. Update the package and lockfile versions with `npm version X.Y.Z --no-git-tag-version`.
3. Run the full verification sequence and `npm run zip`.
4. Validate the tag, package, lockfile, built manifest, archive names, and changelog entry with `npm run release:prepare -- --tag vX.Y.Z`.
5. Commit the release state on `dev`, merge that exact state to `master`, and create the `vX.Y.Z` tag on the release commit.
6. Push `master` and the tag. The [release workflow](../.github/workflows/release.yml) repeats verification, creates both archives, and creates or updates the GitHub Release using that changelog section as its notes.

Only bracketed changelog headings represent linked GitHub releases. Older untagged historical headings remain plain text.

## Troubleshooting

### Firefox shows old code

Check the temporary extension's manifest path in `about:debugging`:

- `npm run dev` updates `.output/firefox-mv3-dev/`.
- `npm run build` updates `.output/firefox-mv3/`.

Load the directory that matches the command you are running, reload the extension, and refresh the trade tab. A content script already injected into a tab does not automatically become the newly loaded production bundle.

### npm reports an unsupported engine

Confirm `node --version` is at least 22.13 and `npm --version` is at least 10. The repository's normal recovery path is:

```bash
nvm install
nvm use
npm ci --legacy-peer-deps
```

### The smoke test cannot find Firefox

Set `FIREFOX_BINARY` to the full Firefox executable path. CI installs Firefox explicitly and supplies this variable to the smoke script.
