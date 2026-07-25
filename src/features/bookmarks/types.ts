export type TradeSiteVersion = '1' | '2';
export type BookmarkColor =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'indigo'
  | 'violet';

export interface BookmarkTradeLocation {
  version: TradeSiteVersion;
  type: string;
  slug: string;
}

export interface BookmarkTrade {
  id: string;
  title: string;
  color?: BookmarkColor | null;
  completedAt: string | null;
  location: BookmarkTradeLocation;
}

export interface BookmarkFolder {
  id: string;
  title: string;
  color?: BookmarkColor | null;
  version: TradeSiteVersion;
  icon: string | null;
  archivedAt: string | null;
}

export interface ImportedBookmarkTrade {
  title: string;
  color?: BookmarkColor | null;
  completedAt: string | null;
  location: BookmarkTradeLocation;
}

export interface ImportedBookmarkFolder {
  title: string;
  color?: BookmarkColor | null;
  version: TradeSiteVersion;
  icon: string | null;
  archivedAt: string | null;
  trades: ImportedBookmarkTrade[];
}
