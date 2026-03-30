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
