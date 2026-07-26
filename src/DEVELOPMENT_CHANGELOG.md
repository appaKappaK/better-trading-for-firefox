# Development Changelog

This file records notable repository, build, packaging, documentation, and
development-tooling changes. User-visible extension changes remain in the main
[Changelog].

## Unreleased

## 1.3.0 - 2026-07-26

### Changed
- Expanded automated coverage for bookmark league metadata and terminology, long-name containment, compact Quick Save and collapsed-dock metadata, scroll-position retention, shared header context-menu shortcuts, folder and pinned-item pointer reordering while wheel-scrolling, post-load drag-list attachment, nested and transient scrolling, content-sized toolbar tabs, relocated backup actions, and trade-page shadow-root remounts during longer smoke runs

### Fixed
- Prevented same-version Firefox temporary-extension reloads from being mistaken for release upgrades and re-queuing the update notice
- Passed privileged browser-test access through geckodriver so packaged smoke tests remain compatible with current Firefox releases

## 1.2.0 - 2026-07-25

### Added
- Changelog-driven GitHub release automation with metadata validation, Firefox verification, Firefox and source archives, and support for manually rebuilding an existing release tag
- Automated background lifecycle coverage and a packaged Firefox upgrade smoke test for the post-update notice

### Changed
- Excluded ignored screenshots, private notes, icon source files, and local reference artwork from Firefox source archives
- Split contributor documentation into a source developer guide and refreshed the root README for current features, requirements, and installation guidance
- Raised the development requirement to Node.js 22.13, pinned Node.js 22.22.2 through `.nvmrc`, and aligned CI with the `dev` and `master` branch model

### Security
- Pinned patched transitive build, test, and Firefox-tooling dependencies to resolve known npm and GitHub advisories; these dependencies are not part of the packaged extension runtime

[Changelog]: ../CHANGELOG.md
