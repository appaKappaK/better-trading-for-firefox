export interface FolderIconOption {
  slug: string;
  label: string;
  group: string;
}

export const FOLDER_ICON_OPTIONS: FolderIconOption[] = [
  // PoE 1 ascendancies
  { slug: 'slayer', label: 'Duelist', group: 'PoE 1' },
  { slug: 'assassin', label: 'Shadow', group: 'PoE 1' },
  { slug: 'juggernaut', label: 'Marauder', group: 'PoE 1' },
  { slug: 'necromancer', label: 'Witch', group: 'PoE 1' },
  { slug: 'deadeye', label: 'Ranger', group: 'PoE 1' },
  { slug: 'inquisitor', label: 'Templar', group: 'PoE 1' },
  { slug: 'ascendant', label: 'Scion', group: 'PoE 1' },
  // PoE 2 classes
  { slug: 'poe2-titan', label: 'Warrior', group: 'PoE 2' },
  { slug: 'poe2-stormweaver', label: 'Sorceress', group: 'PoE 2' },
  { slug: 'poe2-deadeye', label: 'Ranger', group: 'PoE 2' },
  { slug: 'poe2-invoker', label: 'Monk', group: 'PoE 2' },
  { slug: 'poe2-witch-hunter', label: 'Mercenary', group: 'PoE 2' },
  { slug: 'poe2-amazon', label: 'Huntress', group: 'PoE 2' },
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

const FOLDER_ICON_ALIASES: Record<string, string> = {
  duelist: 'slayer',
  shadow: 'assassin',
  marauder: 'juggernaut',
  witch: 'necromancer',
  ranger: 'deadeye',
  templar: 'inquisitor',
  scion: 'ascendant',
  warrior: 'poe2-titan',
  sorceress: 'poe2-stormweaver',
  ranger2: 'poe2-deadeye',
  monk: 'poe2-invoker',
  mercenary: 'poe2-witch-hunter',
  huntress: 'poe2-amazon',
};

export function normalizeFolderIconSlug(slug: string | null): string | null {
  if (!slug) return null;
  return FOLDER_ICON_ALIASES[slug] ?? slug;
}

export function getFolderIconLabel(slug: string | null): string | null {
  if (!slug) return null;
  const normalizedSlug = normalizeFolderIconSlug(slug);
  return (
    FOLDER_ICON_OPTIONS.find((option) => option.slug === normalizedSlug)?.label ??
    humanizeFolderIconSlug(slug)
  );
}

const FOLDER_ICON_IMAGES: Record<string, string> = {
  slayer: 'assets/images/bookmark-folder/slayer.png',
  assassin: 'assets/images/bookmark-folder/assassin.png',
  juggernaut: 'assets/images/bookmark-folder/juggernaut.png',
  necromancer: 'assets/images/bookmark-folder/necromancer.png',
  deadeye: 'assets/images/bookmark-folder/deadeye.png',
  inquisitor: 'assets/images/bookmark-folder/inquisitor.png',
  ascendant: 'assets/images/bookmark-folder/ascendant.png',
  'poe2-titan': 'assets/images/bookmark-folder/poe2-titan.png',
  'poe2-stormweaver': 'assets/images/bookmark-folder/poe2-stormweaver.png',
  'poe2-deadeye': 'assets/images/bookmark-folder/poe2-deadeye.png',
  'poe2-invoker': 'assets/images/bookmark-folder/poe2-invoker.png',
  'poe2-witch-hunter': 'assets/images/bookmark-folder/poe2-witch-hunter.png',
  'poe2-amazon': 'assets/images/bookmark-folder/poe2-amazon.png',
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
  slayer: '⚔',
  assassin: '🗡',
  juggernaut: '🛡',
  necromancer: '🔮',
  deadeye: '🏹',
  inquisitor: '✝',
  ascendant: '♕',
  'poe2-titan': '🪓',
  'poe2-stormweaver': '✨',
  'poe2-deadeye': '🎯',
  'poe2-invoker': '☯',
  'poe2-witch-hunter': '🎖',
  'poe2-amazon': '🐾',
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
  const normalizedSlug = normalizeFolderIconSlug(slug);
  if (!normalizedSlug) return null;
  return FOLDER_ICON_SYMBOLS[normalizedSlug] ?? null;
}

export function getFolderIconImageUrl(slug: string | null): string | null {
  const normalizedSlug = normalizeFolderIconSlug(slug);
  if (!normalizedSlug) return null;
  const path = FOLDER_ICON_IMAGES[normalizedSlug];
  if (!path) return null;

  if (typeof browser !== 'undefined' && browser.runtime?.getURL) {
    // Ensure the path starts with / and construct absolute URL
    const absolutePath = path.startsWith('/') ? path : `/${path}`;
    return browser.runtime.getURL(absolutePath as any);
  }

  return `/${path}`;
}

function humanizeFolderIconSlug(slug: string) {
  return slug
    .replace(/^poe2-/u, '')
    .split('-')
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ');
}
