# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog], and this project adheres to
[Semantic Versioning].

Repository, build, and release-process changes are documented separately in
the [Development Changelog].

## [Unreleased]

## [1.3.0] - 2026-07-26

### Added
- Drag-and-drop ordering for pinned items, including wheel scrolling through long lists
- League summaries on bookmark folders, including folders with searches from multiple leagues

### Changed
- Made bookmark-folder reordering smoother with clear drag handles, live movement, placement feedback, and wheel scrolling
- Added the header visibility shortcut to the in-page panel: right-click the header to hide it or the tab row to restore it
- Expanded the compact launcher with pinned-item prices and relevant league names
- Renamed bookmark-folder counts from trades to searches throughout the in-page panel and toolbar popup
- Made the full Quick Save header clickable and more compact, with the saved-folder list scrolling separately beneath it
- Moved full-backup actions to Import, simplified the Bookmarks guidance, and enlarged folder portraits without increasing card height
- Refined the visual separation between controls, saved-data lists, and footer summaries

### Fixed
- Made the Firefox toolbar popup shrink to fit shorter tabs and scroll when longer views reach its maximum height
- Prevented transient scrollbars from overlapping content and kept cards fully visible while they are being reordered
- Prevented wheel scrolling inside the in-page panel or toolbar popup from moving the trade page underneath
- Kept the bookmark list at the same position when folders are opened or closed
- Kept long folder, bookmark, and history names contained within their cards

## [1.2.0] - 2026-07-25

### Added
- Optional seven-color palettes for folder and bookmark names, preserved through backup export and import
- A persistent `Show header` setting, with right-click shortcuts for hiding or restoring the compact popup header
- Accessible confirmation dialogs for clearing saved data or history and deleting bookmark folders or saved searches
- A fixed post-update dialog with a stable release-highlights preview
- A double-click shortcut on the in-page logo for shrinking the overlay panel

### Changed
- Standardized button colors and interaction states across the popup and in-page panel
- Made list entries more compact, improved pinned-item artwork and price readability, and aligned History metadata consistently
- Constrained long overlay lists, retained full-height square sidebar layouts, and prevented scrollbars from shifting or covering content
- Replaced completed-bookmark strikethroughs with a muted-red X overlay that preserves the selected name color
- Reorganized Quick Save color and icon controls and replaced unclear examples with descriptive labels
- Simplified first-run behavior so every tab remains available while Import opens automatically for new installations
- Renamed `Reset to fresh` to `Clear saved data`; clearing saved content now preserves user preferences
- Limited the collapsed launcher to three pinned-item thumbnails plus an additional-item count and made the launcher draggable
- Replaced the long folder-icon menu with a compact scrollable picker, kept folders collapsed until opened, and changed the footer to report bookmark-folder count
- Moved the history-clear action beside the History heading

### Fixed
- Recorded History only after submitted searches load and reused saved titles when reopening earlier searches
- Generated readable History titles from active filters, prevented bookmark names from replacing them, and used `Empty search` instead of internal identifiers
- Kept relative timestamps current while the Pinned or History view remains open
- Extracted readable pinned-item names and preserved seller and item metadata across current, legacy, and late-loading trade results
- Displayed native or packaged currency artwork when available, retained readable fallbacks for unknown currencies, and removed the multiplication marker from prices
- Cleared Quick Save names after successful saves, dismissed confirmations automatically, preserved the selected folder, and allowed text selection during renames
- Restored bookmark folder artwork, added readable fallback monograms, and retained compatible icon identifiers in exports
- Centered Pin and Unpin controls beneath the native trade-result actions with consistent spacing
- Prevented dragging the collapsed launcher from expanding it and kept repositioned overlays within the viewport
- Prevented duplicate enhancer content and excluded bulk-exchange or incomplete listings from similar-result groups without collapsing existing groups
- Kept the Firefox toolbar popup correctly sized, button labels centered, confirmation dialogs visible, and the in-page panel usable at narrow widths
- Distinguished unavailable backup actions from exports that are actively running

### Removed
- The dedicated drag handle; the collapsed launcher now serves as the drag surface

### Security
- Restricted web-accessible bookmark icon assets to official Path of Exile origins

## [1.1.0] - 2026-04-11

### Added
- New opt-in setting to keep pinned items across trade-search changes within the current Firefox tab session
- Session-persistent pinned items can reopen their saved trade search when the original row is no longer on the current page
- Pinned-item actions now switch between `Scroll to item` and `Open saved search` based on whether the row exists on the current page

### Changed
- Trade league names are now normalized to readable text in saved history and related trade-link displays, while outbound trade URLs remain correctly encoded
- Existing saved history league values and last-seen league values are repaired automatically on load when older encoded values are present
- Auto-generated history fallback titles now use a shorter `type/slug` format instead of repeating the league in the title
- Session-persistent pins are isolated to the current trade-tab session and do not survive a full Firefox restart
- Collapsed session pins now use short `Jump` / `Open` actions based on whether the pinned result is on the current page
- The setting for per-session persistence now correctly explains that pins survive multiple searches and filter changes within the current trade tab session
- In-page panel branding now uses a `Path of Exile` / `Better Trading` header hierarchy with the logo aligned with the History tab

### Fixed
- Multi-word and future league names no longer render as `%20`-encoded text in history pills or related trade links
- Existing fallback history titles derived from older `type/league/slug` values are cleaned up when they are clearly auto-generated
- Realm-prefixed trade leagues such as PoE2 now render with their user-facing labels (for example `PoE2 - Fate of the Vaal`) while still opening the correct trade URLs
- Pinned item cards now surface item level above the relative pinned time, and the pinned-tab scrollbar no longer crowds the right card border
- Firefox build output no longer includes the unsupported `web_accessible_resources.use_dynamic_url` manifest key, removing the warning shown in `about:debugging`
- Firefox toolbar icons are cropped more aggressively at small sizes so the add-on reads larger in the browser UI

### Removed
- `Clear all` / `Clear pinned` controls from the in-page pinned-items view; pinned items are now cleared only by unpinning individual items
- In-page history clear controls from the trade-site panel; clearing history now remains available from the extension popup
- Hover preview tooltip/popover from pinned item thumbnails in the in-page pinned list
- Separate pinned-list action row above the in-page pinned items list
- Tooltip-only enlarged pinned item image preview in the in-page panel

## 1.0.6 - 2026-04-04

_The original changelog grouped these changes under 1.0.5–1.0.6; Firefox Add-ons published them as version 1.0.6._

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

## 1.0.4 - 2026-03-31

_The original changelog grouped these changes under 1.0.3–1.0.4; no separate 1.0.3 tag or release is recorded._

### Added
- Collapsed dock now shows a mini list of up to 5 pinned items with a scroll-to jump button each, so pinned results are accessible without expanding the panel
- New setting "Allow dragging the overlay panel" (default off): enables header-drag repositioning in overlay mode; disabled automatically when sidebar mode is active

### Fixed
- Panel logo now renders at 40×40 px, circular, with a subtle contrasting background so it reads clearly against the dark panel
- Drag repositioning was broken: `applyOverlayPosition` was clearing the default `top`/`right` position immediately after it was set, leaving the panel without coordinates
- Folder icon images now render in the in-page panel folder list (were only showing as emoji/text labels before)
- Rename and Cancel buttons in the trade inline editor changed from the muted subtle style to ghost style so they no longer look disabled
- Pinned item title extraction now tries `.itemName .itemHeader` before falling back to the full `.itemName` text content, preventing price and property text from bleeding into the title
- Removed `.details .text` from pinned item subtitle selectors — it was duplicating price information in the subtitle field

## 1.0.2 - 2026-03-31

### Added
- Sidebar mode for the in-page panel: new setting pushes trade page content aside instead of overlaying it; panel renders full-height flush to the viewport edge
- Draggable overlay panel: the panel can be repositioned by dragging its header when not in sidebar mode; position is clamped to the viewport
- Expanded folder icon set: PoE 2 class icons (Warrior, Sorceress, Ranger, Monk, Mercenary, Huntress) and additional currency icons (Orb of Alchemy, Essence, Fossil, Scarab, Map, Divination Card)

### Changed
- Collapse button in the panel footer is hidden when sidebar mode is active (collapsing is handled by toggling the setting)

## 1.0.1 - 2026-03-30

### Fixed
- Settings page no longer navigates away when toggling an enhancer or the panel collapse preference
- Settings page repo links now point to the correct repository
- Corrected `homepage_url` in the extension manifest

### Changed
- Updated Settings descriptions for release use

## 1.0.0 - 2026-03-30

Initial release.

### Added
- Bookmark trade searches into named folders with icons, archiving, and drag-and-drop reordering
- Folder export and import compatible with the original Better Trading backup format (v1, v2, v3)
- Automatic search history tracking with timestamps and quick-jump links
- Live enhancers on trade result pages: stat filter highlighting, socket warnings, chaos-equivalent pricing via poe.ninja, and result regrouping
- Pinned items to keep individual results visible while browsing
- Collapsible in-page side panel with dock button showing pinned and result counts
- Popup for managing bookmarks, history, settings, and legacy imports
- Full settings page with per-enhancer toggles
- Firefox-only MV3 with WXT and Preact
- CI pipeline: typecheck, unit tests, production build, web-ext lint, headless Selenium smoke test
- Release workflow: zips and attaches artifact to GitHub Release on semver tags
- 51 unit tests across all core modules

[Keep a Changelog]: https://keepachangelog.com/en/1.1.0/
[Semantic Versioning]: https://semver.org/spec/v2.0.0.html
[Development Changelog]: src/DEVELOPMENT_CHANGELOG.md
[Unreleased]: https://github.com/appaKappaK/better-trading-for-firefox/compare/v1.3.0...dev
[1.3.0]: https://github.com/appaKappaK/better-trading-for-firefox/releases/tag/v1.3.0
[1.2.0]: https://github.com/appaKappaK/better-trading-for-firefox/releases/tag/v1.2.0
[1.1.0]: https://github.com/appaKappaK/better-trading-for-firefox/releases/tag/v1.1.0
