export type PopupPage = 'bookmarks' | 'history';

export function normalizePopupPage(value: string | null | undefined): PopupPage {
  return value === 'history' ? 'history' : 'bookmarks';
}
