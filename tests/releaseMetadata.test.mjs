import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  extractLatestChangelogRelease,
  findReleaseArtifacts,
  prepareRelease,
  validateReleaseMetadata,
} from '../scripts/release-metadata.mjs';

const changelog = `# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Upcoming change

## [1.1.0] - 2026-04-11

### Added
- Session-persistent pins

### Fixed
- Firefox manifest warning

## [1.0.6] - 2026-04-04

### Fixed
- Previous fix
`;

describe('release metadata', () => {
  it('skips Unreleased and extracts notes only from the latest dated release', () => {
    expect(extractLatestChangelogRelease(changelog)).toEqual({
      version: '1.1.0',
      date: '2026-04-11',
      notes: [
        '### Added',
        '- Session-persistent pins',
        '',
        '### Fixed',
        '- Firefox manifest warning',
      ].join('\n'),
    });
  });

  it('stops release notes before a combined historical version heading', () => {
    const changelogWithCombinedVersion = `# Changelog

## [1.1.0] - 2026-04-11

### Added
- Current release

## [1.0.5-1.0.6] - 2026-04-04

### Added
- Older release
`;

    expect(extractLatestChangelogRelease(changelogWithCombinedVersion)).toEqual({
      version: '1.1.0',
      date: '2026-04-11',
      notes: ['### Added', '- Current release'].join('\n'),
    });
  });

  it('accepts a release only when tag, package, lockfile, manifest, and changelog versions match', () => {
    expect(
      validateReleaseMetadata({
        tag: 'v1.1.0',
        packageVersion: '1.1.0',
        lockfileVersion: '1.1.0',
        manifestVersion: '1.1.0',
        changelogText: changelog,
      }),
    ).toEqual({
      version: '1.1.0',
      date: '2026-04-11',
      notes: [
        '### Added',
        '- Session-persistent pins',
        '',
        '### Fixed',
        '- Firefox manifest warning',
      ].join('\n'),
    });
  });

  it.each([
    ['tag', { tag: 'v1.0.6' }, 'tag v1.0.6'],
    ['package', { packageVersion: '1.0.6' }, 'package.json 1.0.6'],
    ['lockfile', { lockfileVersion: '1.0.6' }, 'package-lock.json 1.0.6'],
    ['manifest', { manifestVersion: '1.0.6' }, 'built manifest 1.0.6'],
  ])('rejects a mismatched %s version', (_label, override, expectedMessage) => {
    expect(() =>
      validateReleaseMetadata({
        tag: 'v1.1.0',
        packageVersion: '1.1.0',
        lockfileVersion: '1.1.0',
        manifestVersion: '1.1.0',
        changelogText: changelog,
        ...override,
      }),
    ).toThrow(expectedMessage);
  });

  it('rejects duplicate changelog sections for the release version', () => {
    const duplicateChangelog = `${changelog}\n## [1.1.0] - 2026-04-12\n\n### Fixed\n- Duplicate entry\n`;

    expect(() =>
      validateReleaseMetadata({
        tag: 'v1.1.0',
        packageVersion: '1.1.0',
        lockfileVersion: '1.1.0',
        manifestVersion: '1.1.0',
        changelogText: duplicateChangelog,
      }),
    ).toThrow('appears more than once');
  });

  it('requires both Firefox and source archives for the release version', () => {
    expect(
      findReleaseArtifacts(
        [
          'bettertradingforfirefox-1.1.0-sources.zip',
          'bettertradingforfirefox-1.0.6-firefox.zip',
          'bettertradingforfirefox-1.1.0-firefox.zip',
        ],
        '1.1.0',
      ),
    ).toEqual([
      'bettertradingforfirefox-1.1.0-firefox.zip',
      'bettertradingforfirefox-1.1.0-sources.zip',
    ]);

    expect(() =>
      findReleaseArtifacts(
        ['bettertradingforfirefox-1.1.0-firefox.zip'],
        '1.1.0',
      ),
    ).toThrow('source archive');
  });

  it('validates packaged metadata and writes the matching changelog notes', async () => {
    const projectRoot = await mkdtemp(
      path.join(os.tmpdir(), 'better-trading-release-'),
    );
    const outputDir = path.join(projectRoot, '.output');
    const manifestDir = path.join(outputDir, 'firefox-mv3');
    const notesPath = path.join(outputDir, 'release-notes.md');

    await mkdir(manifestDir, { recursive: true });
    await Promise.all([
      writeJson(path.join(projectRoot, 'package.json'), { version: '1.1.0' }),
      writeJson(path.join(projectRoot, 'package-lock.json'), {
        version: '1.1.0',
        packages: { '': { version: '1.1.0' } },
      }),
      writeFile(path.join(projectRoot, 'CHANGELOG.md'), changelog),
      writeJson(path.join(manifestDir, 'manifest.json'), { version: '1.1.0' }),
      writeFile(
        path.join(outputDir, 'bettertradingforfirefox-1.1.0-firefox.zip'),
        '',
      ),
      writeFile(
        path.join(outputDir, 'bettertradingforfirefox-1.1.0-sources.zip'),
        '',
      ),
    ]);

    const result = await prepareRelease({
      projectRoot,
      tag: 'v1.1.0',
      notesPath,
    });

    expect(result.version).toBe('1.1.0');
    expect(result.artifacts).toEqual([
      'bettertradingforfirefox-1.1.0-firefox.zip',
      'bettertradingforfirefox-1.1.0-sources.zip',
    ]);
    expect(await readFile(notesPath, 'utf8')).toBe(`${result.notes}\n`);
  });
});

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
