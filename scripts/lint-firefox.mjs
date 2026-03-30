import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const projectRoot = path.resolve(import.meta.dirname, '..');
const sourceDir = path.join(projectRoot, '.output', 'firefox-mv3');
const sourceDirArg = path.relative(projectRoot, sourceDir).replaceAll('\\', '/');
const manifestPath = path.join(sourceDir, 'manifest.json');
const webExtCommand = path.join(
  projectRoot,
  'node_modules',
  'web-ext',
  'bin',
  'web-ext.js',
);
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const authoredSourceRoots = [
  path.join(projectRoot, 'entrypoints'),
  path.join(projectRoot, 'src'),
];
const sourceFileExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const knownFrameworkWarningFiles = [/^content-scripts\/.+\.js$/u, /^chunks\/.+\.js$/u];

if (!fs.existsSync(webExtCommand)) {
  console.error(`Unable to find web-ext at ${webExtCommand}`);
  process.exit(1);
}

if (!fs.existsSync(manifestPath)) {
  const buildResult = spawnSync(npmCommand, ['run', 'build'], {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  if ((buildResult.status ?? 1) !== 0) {
    process.exit(buildResult.status ?? 1);
  }
}

const result = spawnSync(
  process.execPath,
  [
    webExtCommand,
    'lint',
    '--output=json',
    `--source-dir=${sourceDirArg}`,
  ],
  {
    cwd: projectRoot,
    encoding: 'utf8',
  },
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

if (!result.stdout) {
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

const report = JSON.parse(result.stdout);
const shouldAllowFrameworkSuppression = !authoredSourceUsesUnsafeHtml();
const warnings = Array.isArray(report.warnings) ? report.warnings : [];
const ignoredWarnings = [];
const remainingWarnings = [];

for (const warning of warnings) {
  if (
    shouldAllowFrameworkSuppression &&
    isKnownFrameworkInnerHtmlWarning(warning)
  ) {
    ignoredWarnings.push(warning);
    continue;
  }

  remainingWarnings.push(warning);
}

const errors = Array.isArray(report.errors) ? report.errors : [];
const notices = Array.isArray(report.notices) ? report.notices : [];

printSummary({
  errors: errors.length,
  notices: notices.length,
  warnings: remainingWarnings.length,
});

if (ignoredWarnings.length > 0) {
  console.log();
  console.log(
    `Suppressed ${ignoredWarnings.length} known framework-generated innerHTML warning${
      ignoredWarnings.length === 1 ? '' : 's'
    }.`,
  );
}

if (errors.length > 0) {
  console.log();
  console.log('ERRORS:');
  console.log();
  printMessages(errors);
}

if (remainingWarnings.length > 0) {
  console.log();
  console.log('WARNINGS:');
  console.log();
  printMessages(remainingWarnings);
}

if (notices.length > 0) {
  console.log();
  console.log('NOTICES:');
  console.log();
  printMessages(notices);
}

if (result.stderr) {
  process.stderr.write(result.stderr);
}

process.exit(errors.length > 0 ? 1 : 0);

function authoredSourceUsesUnsafeHtml() {
  return authoredSourceRoots.some((rootPath) => scanForUnsafeHtml(rootPath));
}

function scanForUnsafeHtml(rootPath) {
  if (!fs.existsSync(rootPath)) return false;

  const entries = fs.readdirSync(rootPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(rootPath, entry.name);

    if (entry.isDirectory()) {
      if (scanForUnsafeHtml(entryPath)) return true;
      continue;
    }

    if (!sourceFileExtensions.has(path.extname(entry.name))) continue;

    const contents = fs.readFileSync(entryPath, 'utf8');
    if (/dangerouslySetInnerHTML/u.test(contents)) return true;
    if (/\binnerHTML\b/u.test(contents)) return true;
  }

  return false;
}

function isKnownFrameworkInnerHtmlWarning(warning) {
  if (warning?.code !== 'UNSAFE_VAR_ASSIGNMENT') return false;
  if (warning?.message !== 'Unsafe assignment to innerHTML') return false;
  if (typeof warning.file !== 'string') return false;

  const normalizedFile = warning.file.replaceAll('\\', '/');
  const isKnownOutputFile = knownFrameworkWarningFiles.some((pattern) =>
    pattern.test(normalizedFile),
  );

  if (!isKnownOutputFile) return false;

  const outputPath = path.join(sourceDir, normalizedFile);
  if (!fs.existsSync(outputPath)) return false;

  const fileContents = fs.readFileSync(outputPath, 'utf8');
  const column = typeof warning.column === 'number' ? warning.column : 1;
  const line = typeof warning.line === 'number' ? warning.line : 1;
  const snippet = getSnippetAtLocation(fileContents, line, column);

  return (
    snippet.includes('dangerouslySetInnerHTML') &&
    snippet.includes('innerHTML')
  );
}

function getSnippetAtLocation(text, line, column) {
  const lineStart = getLineStartIndex(text, line);
  const lineEnd = text.indexOf('\n', lineStart);
  const safeLineEnd = lineEnd === -1 ? text.length : lineEnd;
  const absoluteColumnIndex = Math.min(
    safeLineEnd,
    Math.max(lineStart, lineStart + column - 1),
  );
  const start = Math.max(lineStart, absoluteColumnIndex - 180);
  const end = Math.min(safeLineEnd, absoluteColumnIndex + 180);

  return text.slice(start, end);
}

function getLineStartIndex(text, targetLine) {
  if (targetLine <= 1) return 0;

  let line = 1;
  let index = 0;

  while (line < targetLine) {
    const nextIndex = text.indexOf('\n', index);
    if (nextIndex === -1) return index;
    index = nextIndex + 1;
    line += 1;
  }

  return index;
}

function printSummary(summary) {
  console.log('Validation Summary:');
  console.log();
  console.log(`errors          ${String(summary.errors).padEnd(15)}`);
  console.log(`notices         ${String(summary.notices).padEnd(15)}`);
  console.log(`warnings        ${String(summary.warnings).padEnd(15)}`);
}

function printMessages(messages) {
  for (const message of messages) {
    console.log(`${message.code}: ${message.message}`);
    if (message.file || message.line || message.column) {
      console.log(
        `  at ${message.file ?? 'unknown'}:${message.line ?? 1}:${message.column ?? 1}`,
      );
    }
    if (message.description) {
      console.log(`  ${message.description}`);
    }
  }
}
