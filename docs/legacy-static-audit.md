# Legacy Static Audit

Static audit captured from the sibling `better-trading` repo before any runtime export tooling.

## Persistent Storage Keys

- `bookmark-folders`
- `bookmark-trades--<folderId>`
- `trade-history`
- `poe-ninja-chaos-ratios-cache`
- `current-page`
- `dismissed-changelog`
- `bookmark-folders-expansion`
- `disabled-enhancers`
- `side-panel-collapsed`

## Storage Split

- `browser.storage.local` stores bookmarks, history, and cached remote data.
- extension `localStorage` stores page and UI preferences.
- no IndexedDB usage was found in the current repo.

## Selector-Heavy Areas

- `app/services/item-results/item-element.ts`
- `app/services/item-results/enhance.ts`
- `app/services/item-results/enhancers/equivalent-pricings.ts`
- `app/services/item-results/enhancers/highlight-stat-filters.ts`
- `app/services/item-results/enhancers/maximum-sockets.ts`
- `app/services/item-results/enhancers/pinnable.ts`
- `app/services/item-results/enhancers/regroup-similars.ts`
- `app/services/search-panel.ts`
- `app/services/page-title.ts`

## Reusable Tests And Fixtures

- `tests/unit/services/bookmarks-test.ts`
- `tests/unit/services/bookmarks/export-test.ts`
- `tests/unit/services/bookmarks/storage-test.ts`
- `tests/unit/services/trade-location-test.ts`
- `tests/unit/services/item-results/enhancers/equivalent-pricings-test.ts`
- `tests/html-samples/item-results/*`
- `tests/html-samples/search-panel/*`

## Immediate Migration Notes

- bookmark ordering is array-order based, not sort-key based
- trade-location history is internal extension history, not browser history
- equivalent pricing depends on `poe.ninja` plus a one-hour cache
- maximum sockets currently only runs on PoE 1 logic
