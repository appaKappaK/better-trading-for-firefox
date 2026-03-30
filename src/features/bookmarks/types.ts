export type TradeSiteVersion = '1' | '2';

export interface BookmarkTradeLocation {
  version: TradeSiteVersion;
  type: string;
  slug: string;
}

export interface BookmarkTrade {
  id: string;
  title: string;
  completedAt: string | null;
  location: BookmarkTradeLocation;
}

export interface BookmarkFolder {
  id: string;
  title: string;
  version: TradeSiteVersion;
  icon: string | null;
  archivedAt: string | null;
}

export interface ImportedBookmarkTrade {
  title: string;
  completedAt: string | null;
  location: BookmarkTradeLocation;
}

export interface ImportedBookmarkFolder {
  title: string;
  version: TradeSiteVersion;
  icon: string | null;
  archivedAt: string | null;
  trades: ImportedBookmarkTrade[];
}
