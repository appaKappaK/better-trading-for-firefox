import { describe, expect, it, vi } from 'vitest';

import {
  FOLDER_ICON_OPTIONS,
  getFolderIconImageUrl,
  getFolderIconLabel,
} from '../src/lib/bookmarks/folderIcons';

describe('bookmark folder icon compatibility', () => {
  it('stores representative class choices as original Better Trading slugs', () => {
    expect(
      FOLDER_ICON_OPTIONS.find((option) => option.label === 'Shadow')?.slug,
    ).toBe('assassin');
    expect(
      FOLDER_ICON_OPTIONS.find((option) => option.label === 'Warrior')?.slug,
    ).toBe('poe2-titan');
  });

  it('continues to render aliases saved by the Firefox development build', () => {
    vi.stubGlobal('browser', {
      runtime: { getURL: (path: string) => `moz-extension://test${path}` },
    });

    expect(getFolderIconLabel('shadow')).toBe('Shadow');
    expect(getFolderIconImageUrl('shadow')).toContain('/assassin.png');

    vi.unstubAllGlobals();
  });
});
