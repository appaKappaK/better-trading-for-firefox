export interface FolderIconOption {
  slug: string;
  label: string;
  group: string;
}

export const FOLDER_ICON_OPTIONS: FolderIconOption[] = [
  // PoE 1 ascendancies
  { slug: 'duelist', label: 'Duelist', group: 'PoE 1' },
  { slug: 'shadow', label: 'Shadow', group: 'PoE 1' },
  { slug: 'marauder', label: 'Marauder', group: 'PoE 1' },
  { slug: 'witch', label: 'Witch', group: 'PoE 1' },
  { slug: 'ranger', label: 'Ranger', group: 'PoE 1' },
  { slug: 'templar', label: 'Templar', group: 'PoE 1' },
  { slug: 'scion', label: 'Scion', group: 'PoE 1' },
  // PoE 2 classes
  { slug: 'warrior', label: 'Warrior', group: 'PoE 2' },
  { slug: 'sorceress', label: 'Sorceress', group: 'PoE 2' },
  { slug: 'ranger2', label: 'Ranger', group: 'PoE 2' },
  { slug: 'monk', label: 'Monk', group: 'PoE 2' },
  { slug: 'mercenary', label: 'Mercenary', group: 'PoE 2' },
  { slug: 'huntress', label: 'Huntress', group: 'PoE 2' },
  // Currency
  { slug: 'chaos', label: 'Chaos Orb', group: 'Currency' },
  { slug: 'divine', label: 'Divine Orb', group: 'Currency' },
  { slug: 'exalt', label: 'Exalted Orb', group: 'Currency' },
  { slug: 'mirror', label: 'Mirror of Kalandra', group: 'Currency' },
  { slug: 'alchemy', label: 'Orb of Alchemy', group: 'Currency' },
  { slug: 'essence', label: 'Essence', group: 'Currency' },
  { slug: 'fossil', label: 'Fossil', group: 'Currency' },
  { slug: 'scarab', label: 'Scarab', group: 'Currency' },
  { slug: 'map', label: 'Map', group: 'Currency' },
  { slug: 'card', label: 'Divination Card', group: 'Currency' },
];

export function getFolderIconLabel(slug: string | null): string | null {
  if (!slug) return null;
  return FOLDER_ICON_OPTIONS.find((opt) => opt.slug === slug)?.label ?? slug;
}

const FOLDER_ICON_IMAGES: Record<string, string> = {
  duelist: 'assets/images/bookmark-folder/slayer.png',
  shadow: 'assets/images/bookmark-folder/assassin.png',
  marauder: 'assets/images/bookmark-folder/juggernaut.png',
  witch: 'assets/images/bookmark-folder/necromancer.png',
  ranger: 'assets/images/bookmark-folder/deadeye.png',
  templar: 'assets/images/bookmark-folder/inquisitor.png',
  scion: 'assets/images/bookmark-folder/ascendant.png',
  warrior: 'assets/images/bookmark-folder/poe2-titan.png',
  sorceress: 'assets/images/bookmark-folder/poe2-stormweaver.png',
  ranger2: 'assets/images/bookmark-folder/poe2-deadeye.png',
  monk: 'assets/images/bookmark-folder/poe2-invoker.png',
  mercenary: 'assets/images/bookmark-folder/poe2-witch-hunter.png',
  huntress: 'assets/images/bookmark-folder/poe2-amazon.png',
  chaos: 'assets/images/bookmark-folder/chaos.png',
  divine: 'assets/images/bookmark-folder/divine.png',
  exalt: 'assets/images/bookmark-folder/exalt.png',
  mirror: 'assets/images/bookmark-folder/mirror.png',
  alchemy: 'assets/images/bookmark-folder/alchemy.png',
  essence: 'assets/images/bookmark-folder/essence.png',
  fossil: 'assets/images/bookmark-folder/fossil.png',
  scarab: 'assets/images/bookmark-folder/scarab.png',
  map: 'assets/images/bookmark-folder/map.png',
  card: 'assets/images/bookmark-folder/card.png',
};

const FOLDER_ICON_SYMBOLS: Record<string, string> = {
  duelist: '⚔',
  shadow: '🗡',
  marauder: '🛡',
  witch: '🔮',
  ranger: '🏹',
  templar: '✝',
  scion: '♕',
  warrior: '🪓',
  sorceress: '✨',
  ranger2: '🎯',
  monk: '☯',
  mercenary: '🎖',
  huntress: '🐾',
  chaos: '🌀',
  divine: '✧',
  exalt: '⬡',
  mirror: '🪞',
  alchemy: '⚗',
  essence: '💠',
  fossil: '🪨',
  scarab: '🪲',
  map: '🗺',
  card: '🃏',
};

export function getFolderIconSymbol(slug: string | null): string | null {
  if (!slug) return null;
  return FOLDER_ICON_SYMBOLS[slug] ?? null;
}

export function getFolderIconImageUrl(slug: string | null): string | null {
  if (!slug) return null;
  const path = FOLDER_ICON_IMAGES[slug];
  if (!path) return null;

  if (typeof browser !== 'undefined' && browser.runtime?.getURL) {
    // Ensure the path starts with / and construct absolute URL
    const absolutePath = path.startsWith('/') ? path : `/${path}`;
    return browser.runtime.getURL(absolutePath as any);
  }

  return `/${path}`;
}
