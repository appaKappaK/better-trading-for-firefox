# Changelog

## [1.0.5] - 2026-04-01

### Added
- Chaos-equivalent price (from poe.ninja) shown inline in pinned items with a chaos icon
- Divine and chaos currency icons replace the currency name text in pinned item price display

### Changed
- "Clear all" button moves to the footer center slot in sidebar mode; stays under the history list in overlay mode
- Import tab file picker redesigned as a full drop zone — click anywhere on it or drag a file directly; no more native white Browse button
- History entries are now clickable links that open the trade search directly; metadata shown as colored pills (PoE version, type, live indicator) instead of plain pipe-separated text

### Fixed
- Pinned item price no longer includes the "Asking Price:" label, "Fee:" text, or raw chaos equivalent suffix — only the clean asking price is shown
- Pin button is now placed in its own element after the entire button row, so it stays consistent regardless of Online/Offline/AFK status shown on the listing
- Sidebar mode now shifts the page's scroll-to-top button out from behind the panel
- `buildTradeUrl` now correctly appends `/live` for live trade searches
- Consistent spacing between tab buttons and content across all tabs in the popup and the in-page panel

### Removed
- Folders/Trades/History/Schema stats grid from the popup footer
- Section label dividers (In-Page Panel, Trade Enhancers, About) from the Settings page

## [1.0.3-1.0.4] - 2026-03-31

### Added
- Collapsed dock now shows a mini list of up to 5 pinned items with a scroll-to jump button each, so pinned results are accessible without expanding the panel
- New setting "Allow dragging the overlay panel" (default off): enables header-drag repositioning in overlay mode; disabled automatically when sidebar mode is active
- Few UI updates and fixes

### Fixed
- Panel logo now renders at 40×40 px, circular, with a subtle contrasting background so it reads clearly against the dark panel
- Drag repositioning was broken: `applyOverlayPosition` was clearing the default `top`/`right` position immediately after it was set, leaving the panel without coordinates
- Folder icon images now render in the in-page panel folder list (were only showing as emoji/text labels before)
- Rename and Cancel buttons in the trade inline editor changed from the muted subtle style to ghost style so they no longer look disabled
- Pinned item title extraction now tries `.itemName .itemHeader` before falling back to the full `.itemName` text content, preventing price and property text from bleeding into the title
- Removed `.details .text` from pinned item subtitle selectors — it was duplicating price information in the subtitle field

## [1.0.2] - 2026-03-31

### Added
- Sidebar mode for the in-page panel: new setting pushes trade page content aside instead of overlaying it; panel renders full-height flush to the viewport edge
- Draggable overlay panel: the panel can be repositioned by dragging its header when not in sidebar mode; position is clamped to the viewport
- Expanded folder icon set: PoE 2 class icons (Warrior, Sorceress, Ranger, Monk, Mercenary, Huntress) and additional currency icons (Orb of Alchemy, Essence, Fossil, Scarab, Map, Divination Card)

### Changed
- Collapse button in the panel footer is hidden when sidebar mode is active (collapsing is handled by toggling the setting)

## [1.0.1] - 2026-03-30

### Fixed
- Settings page no longer navigates away when toggling an enhancer or the panel collapse preference
- Settings page repo links now point to the correct repository
- Corrected `homepage_url` in the extension manifest

### Changed
- Settings page copy cleaned up (removed internal dev notes)

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
