import type { BookmarkColor } from '@/src/features/bookmarks/types';

interface BookmarkColorOption {
  label: string;
  value: BookmarkColor | null;
  hex: string;
}

export const BOOKMARK_COLOR_OPTIONS: readonly BookmarkColorOption[] = [
  { label: 'Default', value: null, hex: '#cfd4db' },
  { label: 'Red', value: 'red', hex: '#d66a62' },
  { label: 'Orange', value: 'orange', hex: '#d98a45' },
  { label: 'Yellow', value: 'yellow', hex: '#c9a94d' },
  { label: 'Green', value: 'green', hex: '#68a875' },
  { label: 'Blue', value: 'blue', hex: '#6597c8' },
  { label: 'Indigo', value: 'indigo', hex: '#7c83c9' },
  { label: 'Violet', value: 'violet', hex: '#a477bd' },
];

const BOOKMARK_COLOR_VALUES = new Set<BookmarkColor>(
  BOOKMARK_COLOR_OPTIONS.flatMap((option) =>
    option.value === null ? [] : [option.value],
  ),
);

export function normalizeBookmarkColor(value: unknown): BookmarkColor | null {
  return typeof value === 'string' && BOOKMARK_COLOR_VALUES.has(value as BookmarkColor)
    ? (value as BookmarkColor)
    : null;
}

export function getBookmarkColorHex(value: unknown): string | undefined {
  const color = normalizeBookmarkColor(value);
  if (!color) return undefined;

  return BOOKMARK_COLOR_OPTIONS.find((option) => option.value === color)?.hex;
}
