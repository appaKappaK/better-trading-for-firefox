import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

describe('Node toolchain configuration', () => {
  it('keeps ignored reference material out of Firefox source archives', async () => {
    const wxtConfig = await readFile(
      path.join(projectRoot, 'wxt.config.ts'),
      'utf8',
    );

    for (const ignoredDirectory of [
      'EXTpics/**',
      'docs/**',
      'extra pics idk/**',
      'ico/**',
    ]) {
      expect(wxtConfig).toContain(`'${ignoredDirectory}'`);
    }
  });

  it('provides a valid Node version pin for nvm', async () => {
    const nvmVersion = await readFile(path.join(projectRoot, '.nvmrc'), 'utf8');

    expect(nvmVersion.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('declares an engine floor compatible with the pinned Node version', async () => {
    const [nvmVersion, packageText] = await Promise.all([
      readFile(path.join(projectRoot, '.nvmrc'), 'utf8'),
      readFile(path.join(projectRoot, 'package.json'), 'utf8'),
    ]);
    const packageJson = JSON.parse(packageText);
    const minimumNodeVersion = packageJson.engines.node.match(
      /^>=(\d+\.\d+\.\d+)$/,
    )?.[1];

    expect(minimumNodeVersion).toBeDefined();
    expect(
      compareVersions(nvmVersion.trim(), minimumNodeVersion),
    ).toBeGreaterThanOrEqual(0);
  });

  it.each(['ci.yml', 'release.yml'])(
    'uses the nvm pin in %s',
    async (workflowName) => {
      const workflowText = await readFile(
        path.join(projectRoot, '.github', 'workflows', workflowName),
        'utf8',
      );
      const setupNodeCount =
        workflowText.match(/uses:\s*actions\/setup-node@/g)?.length ?? 0;
      const nvmPinCount =
        workflowText.match(/node-version-file:\s*['"]?\.nvmrc['"]?/g)
          ?.length ?? 0;

      expect(setupNodeCount).toBeGreaterThan(0);
      expect(nvmPinCount).toBe(setupNodeCount);
      expect(workflowText).not.toContain('.node-version');
      expect(workflowText).not.toMatch(/^\s*node-version:\s*/mu);
    },
  );
});

function compareVersions(left, right) {
  const leftParts = left.split('.').map(Number);
  const rightParts = right.split('.').map(Number);

  for (let index = 0; index < 3; index += 1) {
    const difference = leftParts[index] - rightParts[index];
    if (difference !== 0) return difference;
  }

  return 0;
}
