import { describe, expect, it } from 'vitest';

import { readImportFile } from '../src/popup/importFiles';

describe('importFiles helper', () => {
  it('reads non-empty backup files as trimmed text', async () => {
    const file = new File(['\n  backup-content  \n'], 'backup.txt', {
      type: 'text/plain',
    });

    await expect(readImportFile(file)).resolves.toBe('backup-content');
  });

  it('rejects empty backup files', async () => {
    const file = new File(['   '], 'empty.txt', {
      type: 'text/plain',
    });

    await expect(readImportFile(file)).rejects.toThrow('That backup file was empty.');
  });
});
