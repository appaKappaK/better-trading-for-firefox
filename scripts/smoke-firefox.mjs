import { spawnSync } from 'node:child_process';
import { Builder, Browser, By, until } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const START_URL =
  process.env.BTFF_START_URL ??
  'https://www.pathofexile.com/trade/search/Standard';

const OUTPUT_DIR = path.resolve('.output');
const ARTIFACTS_DIR = path.resolve('.output/smoke');
const SCREENSHOT_PATH = path.join(ARTIFACTS_DIR, 'firefox-smoke.png');
const EXTENSION_ARCHIVE_PATH = resolveExtensionArchivePath();

const RESULTSET_HTML = `
  <div class="resultset">
    <div data-id="phase0-row" class="row">
      <div class="left">
        <div class="itemRendered"></div>
        <div class="icon">
          <img src="https://web.poecdn.com/image/Art/2DItems/Armours/BodyArmours/Fancy.png" alt="">
          <div class="sockets">
            <span class="socket"></span>
            <span class="socket"></span>
          </div>
        </div>
      </div>
      <div class="middle">
        <div class="itemLevel">Item Level: 80</div>
      </div>
    </div>
  </div>
`;

const firefoxBinary = resolveFirefoxBinary();
const options = new firefox.Options()
  .addArguments('-headless')
  .windowSize({ width: 1600, height: 1200 });

if (firefoxBinary) {
  options.setBinary(firefoxBinary);
}

const driver = await new Builder()
  .forBrowser(Browser.FIREFOX)
  .setFirefoxOptions(options)
  .build();

try {
  await driver.installAddon(EXTENSION_ARCHIVE_PATH, true);
  await driver.get(START_URL);

  await driver.wait(
    until.elementLocated(By.css('[data-btff-phase0-host="true"]')),
    20_000,
  );

  const mounted = await driver.executeScript(() =>
    document.documentElement.getAttribute('data-btff-phase0'),
  );

  if (mounted !== 'mounted') {
    throw new Error(`Phase-0 panel did not mount correctly: ${mounted}`);
  }

  await driver.executeScript((html) => {
    let resultset = document.querySelector('.resultset');

    if (resultset) {
      resultset.outerHTML = html;
      return;
    }

    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.append(container.firstElementChild);
  }, RESULTSET_HTML);

  await driver.wait(async () => {
    const warningText = await driver.executeScript(() => {
      const warning = document.querySelector('.btff-phase0-maximum-sockets');
      return warning?.textContent ?? null;
    });

    return typeof warningText === 'string' && warningText.includes('Max 6 sockets');
  }, 20_000);

  // Collect smoke summary without poe.ninja check
  const smokeSummary = await driver.executeScript(() => {
    const host = document.querySelector('[data-btff-phase0-host="true"]');
    const shadowRoot = host?.shadowRoot;
    const shrinkButton = [...(shadowRoot?.querySelectorAll('button') ?? [])].find(
      (element) => element.textContent?.includes('Shrink')
    );

    return {
      shrinkButtonPresent: !!shrinkButton,
      warnings: document.querySelectorAll('.btff-phase0-maximum-sockets').length,
    };
  });

  await mkdir(ARTIFACTS_DIR, { recursive: true });
  const screenshot = await driver.takeScreenshot();
  await writeFile(SCREENSHOT_PATH, screenshot, 'base64');

  console.log('Firefox smoke passed.', smokeSummary);
  console.log(`Screenshot: ${SCREENSHOT_PATH}`);
} finally {
  await driver.quit();
}

function resolveExtensionArchivePath() {
  const candidates = readdirSync(OUTPUT_DIR)
    .filter((entry) => entry.endsWith('-firefox.zip'))
    .sort((left, right) => right.localeCompare(left));

  if (candidates.length === 0) {
    throw new Error(
      `Could not find a Firefox extension archive in ${OUTPUT_DIR}. Run "npm run zip" first.`,
    );
  }

  return path.join(OUTPUT_DIR, candidates[0]);
}

function resolveFirefoxBinary() {
  if (process.env.FIREFOX_BINARY) return process.env.FIREFOX_BINARY;

  const pathResolvedBinary = resolveBinaryFromPath(
    process.platform === 'win32'
      ? []
      : process.platform === 'darwin'
        ? ['firefox', 'firefoxdeveloperedition']
        : ['firefox-developer-edition', 'firefox'],
  );

  if (pathResolvedBinary) return pathResolvedBinary;

  const candidates =
    process.platform === 'win32'
      ? [
          'C:\\Program Files\\Firefox Developer Edition\\firefox.exe',
          'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
          'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe',
        ]
      : process.platform === 'darwin'
        ? [
            '/Applications/Firefox Developer Edition.app/Contents/MacOS/firefox',
            '/Applications/Firefox.app/Contents/MacOS/firefox',
          ]
        : [
            '/usr/bin/firefox-developer-edition',
            '/usr/bin/firefox',
            '/usr/lib64/firefox/firefox',
            '/usr/lib/firefox/firefox',
            '/snap/bin/firefox',
          ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function resolveBinaryFromPath(candidates) {
  const lookupCommand = process.platform === 'win32' ? 'where' : 'which';

  for (const candidate of candidates) {
    const result = spawnSync(lookupCommand, [candidate], {
      encoding: 'utf8',
    });

    if (result.status !== 0) continue;

    const resolvedPath = result.stdout
      .split(/\r?\n/)
      .map((value) => value.trim())
      .find(Boolean);

    if (resolvedPath) return resolvedPath;
  }

  return null;
}