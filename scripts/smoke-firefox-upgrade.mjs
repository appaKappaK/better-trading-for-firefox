import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { Builder, Browser, By, until } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';

const ROOT_DIR = path.resolve('.');
const OUTPUT_DIR = path.join(ROOT_DIR, '.output');
const ARTIFACTS_DIR = path.join(OUTPUT_DIR, 'smoke');
const SCREENSHOT_PATH = path.join(
  ARTIFACTS_DIR,
  'firefox-upgrade-notice.png',
);
const packageJson = JSON.parse(
  await readFile(path.join(ROOT_DIR, 'package.json'), 'utf8'),
);
const currentVersion = packageJson.version;
const previousArchive = resolveRequiredArchive(
  'BTFF_PREVIOUS_EXTENSION_ARCHIVE',
);
const currentArchive = resolveArchive(
  process.env.BTFF_CURRENT_EXTENSION_ARCHIVE ??
    path.join(
      OUTPUT_DIR,
      `bettertradingforfirefox-${currentVersion}-firefox.zip`,
    ),
  'current extension archive',
);
const firefoxBinary = resolveFirefoxBinary();
const options = new firefox.Options()
  .addArguments('-headless')
  .windowSize({ width: 1280, height: 900 });
const service = new firefox.ServiceBuilder().addArguments(
  '--allow-system-access',
);

if (firefoxBinary) {
  options.setBinary(firefoxBinary);
}

const driver = await new Builder()
  .forBrowser(Browser.FIREFOX)
  .setFirefoxOptions(options)
  .setFirefoxService(service)
  .build();

try {
  const previousExtensionId = await driver.installAddon(previousArchive, true);
  const previousPopupUrl = await resolveExtensionPopupUrl(
    driver,
    previousExtensionId,
  );
  await driver.get(previousPopupUrl);
  await driver.wait(
    until.elementLocated(By.css('.popup-shell')),
    20_000,
    'Previous extension popup did not load.',
  );

  const previousState = await seedPreviousVersionState(driver);
  if (previousState.version === currentVersion) {
    throw new Error(
      `Previous archive unexpectedly contains the current version ${currentVersion}.`,
    );
  }

  await driver.get('about:blank');
  const currentExtensionId = await driver.installAddon(currentArchive, true);

  if (currentExtensionId !== previousExtensionId) {
    throw new Error(
      `Extension ID changed during upgrade: ${previousExtensionId} -> ${currentExtensionId}.`,
    );
  }

  const currentPopupUrl = await resolveExtensionPopupUrl(
    driver,
    currentExtensionId,
  );
  if (currentPopupUrl !== previousPopupUrl) {
    throw new Error(
      `Extension origin changed during upgrade: ${previousPopupUrl} -> ${currentPopupUrl}.`,
    );
  }

  await driver.get(currentPopupUrl);
  await driver.wait(
    until.elementLocated(By.css('.popup-shell')),
    20_000,
    'Current extension popup did not load after upgrade.',
  );

  const dialog = await driver.wait(
    until.elementLocated(By.css('[data-confirmation="update-notice"]')),
    20_000,
    'The first popup open after upgrade did not show the update notice.',
  );
  const noticeText = (await dialog.getText()).trim();
  const expectedNoticeText = [
    `Updated to v${currentVersion}`,
    'Better Trading for Firefox was just updated.',
  ];

  for (const expectedText of expectedNoticeText) {
    if (!noticeText.includes(expectedText)) {
      throw new Error(
        `Update notice is missing "${expectedText}": ${noticeText}`,
      );
    }
  }

  const changelogLink = await dialog.findElement(
    By.css('.popup-release-notes__link'),
  );
  await driver.actions().move({ origin: changelogLink }).perform();

  const preview = await driver.wait(
    until.elementLocated(By.css('.popup-release-notes__preview')),
    10_000,
    'Release-highlights preview did not appear after the packaged upgrade.',
  );
  const previewText = (await preview.getText()).trim();
  const expectedHighlights = [
    'Personalize folders and bookmarks with color-coded names and a streamlined icon picker.',
    'Manage saved data safely with confirmation dialogs and clearing that preserves your extension settings.',
    'Quickly hide or restore the popup header, drag the collapsed panel, and double-click the logo to shrink it.',
  ];

  for (const highlight of expectedHighlights) {
    if (!previewText.includes(highlight)) {
      throw new Error(
        `Packaged update notice is missing a release highlight: ${highlight}`,
      );
    }
  }

  const upgradedState = await readUpgradeState(driver);
  if (upgradedState.version !== currentVersion) {
    throw new Error(
      `Expected upgraded manifest ${currentVersion}, received ${upgradedState.version}.`,
    );
  }
  if (upgradedState.pendingUpdateNotice !== currentVersion) {
    throw new Error(
      `Expected pending update notice ${currentVersion}, received ${upgradedState.pendingUpdateNotice}.`,
    );
  }
  if (!upgradedState.sidePanelDraggable) {
    throw new Error('A stored preference did not survive the packaged upgrade.');
  }

  await mkdir(ARTIFACTS_DIR, { recursive: true });
  await writeFile(SCREENSHOT_PATH, await driver.takeScreenshot(), 'base64');

  const dismissButton = await dialog.findElement(
    By.xpath(".//button[normalize-space(.)='Dismiss']"),
  );
  await dismissButton.click();
  await driver.wait(
    until.stalenessOf(dialog),
    10_000,
    'Update notice did not close after dismissal.',
  );

  const dismissedState = await readUpgradeState(driver);
  if (dismissedState.pendingUpdateNotice !== null) {
    throw new Error('Dismissing the update notice did not clear its stored flag.');
  }

  console.log('Firefox packaged upgrade smoke passed.', {
    currentArchive,
    currentVersion,
    extensionId: currentExtensionId,
    previousArchive,
    previousVersion: previousState.version,
    preservedPreference: upgradedState.sidePanelDraggable,
    screenshot: SCREENSHOT_PATH,
  });
} finally {
  await driver.quit();
}

async function seedPreviousVersionState(driver) {
  return driver.wait(async () => {
    const result = await driver.executeAsyncScript((done) => {
      const key = 'btff-schema-v1';

      browser.storage.local
        .get(key)
        .then(async (stored) => {
          const schema = stored[key];
          if (!schema?.preferences?.hasCompletedOnboarding) {
            done(null);
            return;
          }

          await browser.storage.local.set({
            [key]: {
              ...schema,
              preferences: {
                ...schema.preferences,
                pendingUpdateNotice: null,
                sidePanelDraggable: true,
              },
            },
          });

          done({
            version: browser.runtime.getManifest().version,
          });
        })
        .catch((error) => done({ error: String(error) }));
    });

    if (result?.error) {
      throw new Error(`Could not seed previous-version storage: ${result.error}`);
    }

    return result ?? false;
  }, 20_000, 'Previous extension storage was not initialized.');
}

async function readUpgradeState(driver) {
  const result = await driver.executeAsyncScript((done) => {
    browser.storage.local
      .get('btff-schema-v1')
      .then((stored) => {
        const schema = stored['btff-schema-v1'];
        done({
          pendingUpdateNotice:
            schema?.preferences?.pendingUpdateNotice ?? null,
          sidePanelDraggable:
            schema?.preferences?.sidePanelDraggable ?? false,
          version: browser.runtime.getManifest().version,
        });
      })
      .catch((error) => done({ error: String(error) }));
  });

  if (result?.error) {
    throw new Error(`Could not read upgraded extension state: ${result.error}`);
  }

  return result;
}

async function resolveExtensionPopupUrl(driver, extensionId) {
  await driver.setContext(firefox.Context.CHROME);

  try {
    const popupUrl = await driver.executeScript((id) => {
      const policy = WebExtensionPolicy.getByID(id);
      return policy?.getURL('popup.html') ?? null;
    }, extensionId);

    if (typeof popupUrl !== 'string') {
      throw new Error(`Could not resolve popup URL for extension ${extensionId}.`);
    }

    return popupUrl;
  } finally {
    await driver.setContext(firefox.Context.CONTENT);
  }
}

function resolveRequiredArchive(environmentName) {
  const configuredPath = process.env[environmentName];
  if (!configuredPath) {
    throw new Error(
      `${environmentName} must point to the previous released Firefox archive.`,
    );
  }

  return resolveArchive(configuredPath, environmentName);
}

function resolveArchive(candidate, label) {
  const resolvedPath = path.resolve(candidate);
  if (!existsSync(resolvedPath)) {
    throw new Error(`Could not find ${label}: ${resolvedPath}`);
  }

  return resolvedPath;
}

function resolveFirefoxBinary() {
  if (process.env.FIREFOX_BINARY) return process.env.FIREFOX_BINARY;

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
