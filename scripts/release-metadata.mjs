import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const changelogHeadingPattern =
  /^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})[ \t]*$/gmu;

export function extractLatestChangelogRelease(changelogText) {
  const headings = [...changelogText.matchAll(changelogHeadingPattern)];
  const latestHeading = headings[0];

  if (!latestHeading || latestHeading.index === undefined) {
    throw new Error(
      'CHANGELOG.md must begin with a release heading like "## [1.2.3] - YYYY-MM-DD".',
    );
  }

  const matchingHeadings = headings.filter(
    (heading) => heading[1] === latestHeading[1],
  );
  if (matchingHeadings.length > 1) {
    throw new Error(
      `CHANGELOG.md release ${latestHeading[1]} appears more than once.`,
    );
  }

  const notesStart = latestHeading.index + latestHeading[0].length;
  const notesEnd = headings[1]?.index ?? changelogText.length;
  const notes = changelogText.slice(notesStart, notesEnd).trim();

  if (!notes) {
    throw new Error(`CHANGELOG.md entry ${latestHeading[1]} has no release notes.`);
  }

  return {
    version: latestHeading[1],
    date: latestHeading[2],
    notes,
  };
}

export function validateReleaseMetadata({
  tag,
  packageVersion,
  lockfileVersion,
  manifestVersion,
  changelogText,
}) {
  const changelogRelease = extractLatestChangelogRelease(changelogText);
  const expectedVersion = changelogRelease.version;
  const expectedTag = `v${expectedVersion}`;
  const mismatches = [];

  if (tag !== expectedTag) {
    mismatches.push(`tag ${tag} must be ${expectedTag}`);
  }
  if (packageVersion !== expectedVersion) {
    mismatches.push(
      `package.json ${packageVersion} must be ${expectedVersion}`,
    );
  }
  if (lockfileVersion !== expectedVersion) {
    mismatches.push(
      `package-lock.json ${lockfileVersion} must be ${expectedVersion}`,
    );
  }
  if (manifestVersion !== expectedVersion) {
    mismatches.push(
      `built manifest ${manifestVersion} must be ${expectedVersion}`,
    );
  }

  if (mismatches.length > 0) {
    throw new Error(
      `Release metadata mismatch:\n${mismatches.map((message) => `- ${message}`).join('\n')}`,
    );
  }

  return changelogRelease;
}

export function findReleaseArtifacts(fileNames, version) {
  const firefoxArchive = fileNames.find((fileName) =>
    fileName.endsWith(`-${version}-firefox.zip`),
  );
  const sourceArchive = fileNames.find((fileName) =>
    fileName.endsWith(`-${version}-sources.zip`),
  );

  if (!firefoxArchive) {
    throw new Error(`Missing Firefox archive for version ${version}.`);
  }
  if (!sourceArchive) {
    throw new Error(`Missing source archive for version ${version}.`);
  }

  return [firefoxArchive, sourceArchive];
}

export async function prepareRelease({ projectRoot, tag, notesPath }) {
  const outputDir = path.join(projectRoot, '.output');
  const [packageJson, packageLock, manifest, changelogText, outputFiles] =
    await Promise.all([
      readJson(path.join(projectRoot, 'package.json')),
      readJson(path.join(projectRoot, 'package-lock.json')),
      readJson(path.join(outputDir, 'firefox-mv3', 'manifest.json')),
      readFile(path.join(projectRoot, 'CHANGELOG.md'), 'utf8'),
      readdir(outputDir),
    ]);

  const lockfileVersion = packageLock.packages?.['']?.version;
  if (packageLock.version !== lockfileVersion) {
    throw new Error(
      `package-lock.json versions disagree: top-level ${packageLock.version} and root package ${lockfileVersion}.`,
    );
  }

  const release = validateReleaseMetadata({
    tag,
    packageVersion: packageJson.version,
    lockfileVersion,
    manifestVersion: manifest.version,
    changelogText,
  });
  const artifacts = findReleaseArtifacts(outputFiles, release.version);

  await mkdir(path.dirname(notesPath), { recursive: true });
  await writeFile(notesPath, `${release.notes}\n`);

  return { ...release, artifacts };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function main() {
  const projectRoot = path.resolve(import.meta.dirname, '..');
  const tag = readOption('--tag') ?? process.env.GITHUB_REF_NAME;
  const notesOption = readOption('--notes-file') ?? '.output/release-notes.md';

  if (!tag) {
    throw new Error('Provide a release tag with --tag or GITHUB_REF_NAME.');
  }

  const notesPath = path.resolve(projectRoot, notesOption);
  const release = await prepareRelease({ projectRoot, tag, notesPath });

  console.log(`Validated release ${tag} from CHANGELOG.md (${release.date}).`);
  console.log(`Release notes: ${path.relative(projectRoot, notesPath)}`);
  console.log(`Artifacts: ${release.artifacts.join(', ')}`);
}

function readOption(name) {
  const optionIndex = process.argv.indexOf(name);
  if (optionIndex === -1) return undefined;

  const value = process.argv[optionIndex + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${name} requires a value.`);
  }

  return value;
}

const entryPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : undefined;

if (entryPath === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
