# Better Trading for Firefox

[![GitHub Actions CI](https://github.com/appaKappaK/better-trading-for-firefox/actions/workflows/ci.yml/badge.svg)](https://github.com/appaKappaK/better-trading-for-firefox/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Firefox Add-on](https://img.shields.io/badge/Firefox-Add--on-orange.svg)](https://addons.mozilla.org/en-US/firefox/addon/better-trading-for-firefox/)

A Firefox-only extension for the Path of Exile trade site. It adds bookmarks, search history, pinned listings, configurable trade-page enhancements, and migration from the original Better Trading add-on.

## Features

- Pin individual trade results, jump back to them, and optionally keep pins across searches in the current tab
- Save searches into named folders with custom icons and colors
- Mark saved searches complete, update them to the current league or search, and archive folders
- Reopen automatically recorded PoE 1 and PoE 2 search history
- Show chaos and divine price equivalents using poe.ninja data
- Highlight searched modifiers, warn about body armours that cannot reach six sockets, and regroup similar listings
- Use the in-page interface as a movable overlay, compact dock, or full-height sidebar
- Import and export data compatible with the original Better Trading bookmark format

The in-page panel handles pins, quick saves, bookmarks, and history while browsing the trade site. The toolbar popup manages imports, full backups, archived folders, history, and settings.

## Install

Install the published version from [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/better-trading-for-firefox/). The current extension manifest requires Firefox 142 or newer.

To build or temporarily load the extension from source, follow the [developer guide](src/README.md#build-and-load-in-firefox).

## Legacy migration

To bring over data from the original Better Trading add-on:

1. Open the extension popup and select **Import**.
2. Paste a folder export string (`3:eyJ...`) or a full backup into the import box, or click/drag a `.txt` backup into the file picker.
3. Review the detected folder and trade counts.
4. Select **Import legacy data**.

The importer supports the v1, v2, and v3 legacy formats and does not delete data from the original extension.

To back up this extension's data, open **Bookmarks** in the popup and select **Download backup** or **Copy full backup**. Individual folders can also be copied in the legacy export format.

## Data and permissions

Bookmarks, history, and settings are stored locally in Firefox. The equivalent-pricing enhancer requests league currency data from poe.ninja and caches it locally; the extension does not collect analytics.

The extension is limited to Firefox and the Path of Exile trade pages. PoE 2 is supported, but receives less hands-on testing than PoE 1.

## Development

Architecture, setup, testing, CI, and release instructions live in the [source developer guide](src/README.md). User-visible changes are recorded in the [changelog](CHANGELOG.md).

## Background

This project is an independent Firefox-native rebuild of [Better Trading](https://github.com/exile-center/better-trading) by exile-center. It uses a Firefox Manifest V3, WXT, and Preact-based architecture while preserving compatibility with the original bookmark export formats.

Better Trading for Firefox is available under the [MIT License](LICENSE).
