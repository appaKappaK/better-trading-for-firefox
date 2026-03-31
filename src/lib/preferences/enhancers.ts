export const ENHANCER_SLUGS = [
  'equivalent-pricings',
  'highlight-stat-filters',
  'maximum-sockets',
  'regroup-similars',
] as const;

export type EnhancerSlug = (typeof ENHANCER_SLUGS)[number];

export interface EnhancerDefinition {
  description: string;
  label: string;
  slug: EnhancerSlug;
}

export const ENHANCER_DEFINITIONS: EnhancerDefinition[] = [
  {
    slug: 'equivalent-pricings',
    label: 'Equivalent pricings (powered by poe.ninja)',
    description: 'Show chaos and divine equivalents on result prices.',
  },
  {
    slug: 'highlight-stat-filters',
    label: 'Highlight searched mods',
    description: 'Highlight matching modifiers from the active search filters.',
  },
  {
    slug: 'maximum-sockets',
    label: 'Warning for armors that cannot be 6-socketed',
    description: 'Warn when a body armour\'s item level is too low to reach 6 sockets.',
  },
  {
    slug: 'regroup-similars',
    label: 'Regroup similar results',
    description: 'Collapse consecutive duplicate-looking listings behind a toggle.',
  },
];

export function isEnhancerEnabled(
  disabledEnhancers: string[] | null | undefined,
  slug: EnhancerSlug,
) {
  return !(disabledEnhancers ?? []).includes(slug);
}
