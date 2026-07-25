import { spawnSync } from 'node:child_process';
import { Builder, Browser, By, until } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const START_URL =
  process.env.BTFF_START_URL ??
  'https://www.pathofexile.com/trade/search/Standard/EB04ajr4S5';

const OUTPUT_DIR = path.resolve('.output');
const ARTIFACTS_DIR = path.resolve('.output/smoke');
const BOOKMARK_SCREENSHOT_PATH = path.join(
  ARTIFACTS_DIR,
  'firefox-bookmark-collapsed.png',
);
const BOOKMARK_COLOR_PICKER_SCREENSHOT_PATH = path.join(
  ARTIFACTS_DIR,
  'firefox-bookmark-color-picker.png',
);
const BOOKMARK_COMPLETED_SCREENSHOT_PATH = path.join(
  ARTIFACTS_DIR,
  'firefox-bookmark-completed.png',
);
const DOCK_SCREENSHOT_PATH = path.join(
  ARTIFACTS_DIR,
  'firefox-dock-draggable.png',
);
const POPUP_HISTORY_SCREENSHOT_PATH = path.join(
  ARTIFACTS_DIR,
  'firefox-popup-history.png',
);
const POPUP_FIRST_RUN_SCREENSHOT_PATH = path.join(
  ARTIFACTS_DIR,
  'firefox-popup-first-run.png',
);
const POPUP_PICKER_SCREENSHOT_PATH = path.join(
  ARTIFACTS_DIR,
  'firefox-popup-icon-picker.png',
);
const PINNED_PANEL_SCREENSHOT_PATH = path.join(
  ARTIFACTS_DIR,
  'firefox-pinned-panel.png',
);
const PIN_ROW_SCREENSHOT_PATH = path.join(
  ARTIFACTS_DIR,
  'firefox-pin-row.png',
);
const SIDEBAR_SCREENSHOT_PATH = path.join(
  ARTIFACTS_DIR,
  'firefox-sidebar.png',
);
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
        <div class="itemPopupContainer newItemPopup uniquePopup">
          <div class="itemBoxContent">
            <div class="item-popup__header itemHeader doubleLine">
              <span class="l"></span>
              <div class="item-popup__header-line">The Taming</div>
              <div class="item-popup__header-line">Prismatic Ring</div>
              <span class="r"></span>
            </div>
            <div class="content">
              <div class="displayProperty">
                <span class="lc s itemLevel" data-field="ilvl">Item Level: <span>80</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="right">
        <div class="details">
          <div class="price">
            <div data-field="price">
              <br><span>100</span>
              <span class="currency-text"><span>Chaos Orb</span></span>
            </div>
          </div>
          <span class="profile-link"><a href="/account/view-profile/SmokeSeller">SmokeSeller#1234</a></span>
          <div class="btns">
            <button type="button">Ignore Player</button>
            <button type="button">Show 2 similar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
`;

const TRADE_FIXTURE_STYLES = `
  html {
    min-height: 100%;
    background: #090c11;
  }
  body.btff-smoke-page {
    min-height: 1200px;
    margin: 0;
    overflow: auto;
    color: #c9c1b2;
    font-family: Arial, sans-serif;
    background:
      radial-gradient(circle at 18% 16%, rgba(133, 75, 25, 0.22), transparent 28%),
      radial-gradient(circle at 68% 56%, rgba(32, 54, 72, 0.2), transparent 32%),
      linear-gradient(145deg, #11151c, #080a0e 72%);
  }
  .btff-smoke-stage {
    box-sizing: border-box;
    min-height: 100vh;
    padding: 88px 390px 120px 36px;
  }
  .btff-smoke-stage::before {
    content: 'DETERMINISTIC TRADE FIXTURE';
    display: block;
    margin-bottom: 14px;
    color: #8a7455;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.16em;
  }
  .resultset {
    width: min(100%, 1040px);
  }
  .resultset > .row {
    position: relative;
    display: grid;
    grid-template-columns: 170px minmax(260px, 1fr) 280px;
    align-items: center;
    min-height: 248px;
    box-sizing: border-box;
    margin-bottom: 14px;
    overflow: hidden;
    border: 1px solid rgba(195, 151, 80, 0.2);
    background:
      linear-gradient(90deg, rgba(30, 26, 23, 0.96), rgba(13, 16, 21, 0.98)),
      #11151c;
    box-shadow: 0 18px 44px rgba(0, 0, 0, 0.34);
  }
  .resultset .left,
  .resultset .middle,
  .resultset .right {
    box-sizing: border-box;
    min-width: 0;
    padding: 24px;
  }
  .resultset .left,
  .resultset .middle,
  .resultset .details {
    text-align: center;
  }
  .resultset .icon img {
    display: block;
    width: 92px;
    height: 92px;
    margin: 0 auto;
    object-fit: contain;
  }
  .resultset .item-popup__header-line {
    color: #d3a23b;
    font: 700 20px/1.25 Georgia, serif;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .resultset .item-popup__header-line + .item-popup__header-line {
    color: #d8d0bd;
    font-size: 14px;
  }
  .resultset .displayProperty {
    margin-top: 14px;
    color: #9299a5;
    font-size: 12px;
  }
  .resultset .right {
    border-left: 1px solid rgba(255, 255, 255, 0.06);
  }
  .resultset .price {
    color: #c7a96e;
    font: 16px/1.35 Georgia, serif;
  }
  .resultset .profile-link {
    display: block;
    margin-top: 16px;
  }
  .resultset .profile-link a {
    color: #d4b465;
    font-size: 12px;
    text-decoration: none;
  }
  .resultset .btns {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 24px;
  }
  .resultset .btns button {
    border: 1px solid #4b4d51;
    background: #202227;
    color: #d6c49d;
    padding: 4px 8px;
    font-size: 12px;
  }
`;

const firefoxBinary = resolveFirefoxBinary();
const options = new firefox.Options()
  .addArguments('-headless', '-remote-allow-system-access')
  .windowSize({ width: 1600, height: 1200 });

if (firefoxBinary) {
  options.setBinary(firefoxBinary);
}

const driver = await new Builder()
  .forBrowser(Browser.FIREFOX)
  .setFirefoxOptions(options)
  .build();

try {
  const extensionId = await driver.installAddon(EXTENSION_ARCHIVE_PATH, true);
  await initializeFreshProfile(driver, extensionId);
  const toolbarPopup = await verifyToolbarPopupOpens(driver, extensionId);
  await driver.get(START_URL);

  await driver.wait(
    until.elementLocated(By.css('[data-btff-phase0-host="true"]')),
    20_000,
    'Better Trading shadow host did not mount.',
  );

  const mounted = await driver.executeScript(() =>
    document.documentElement.getAttribute('data-btff-phase0'),
  );

  if (mounted !== 'mounted') {
    throw new Error(`Phase-0 panel did not mount correctly: ${mounted}`);
  }

  await installTradeFixture(driver);

  await driver.wait(async () => {
    const warningText = await driver.executeScript(() => {
      const warning = document.querySelector('.btff-phase0-maximum-sockets');
      return warning?.textContent ?? null;
    });

    return typeof warningText === 'string' && warningText.includes('Max 6 sockets');
  }, 20_000, 'Maximum-socket warning did not render for the injected result.');

  const pinActionSpacing = await measurePinActionSpacing(driver);

  if (pinActionSpacing.computedMarginTop !== '8px') {
    throw new Error(
      `Pin action row did not receive the expected 8px margin: ${pinActionSpacing.computedMarginTop}`,
    );
  }

  if (pinActionSpacing.renderedGap < 7) {
    throw new Error(
      `Pin button is still touching the native result actions: ${pinActionSpacing.renderedGap}px gap`,
    );
  }

  if (pinActionSpacing.centerDelta > 1) {
    throw new Error(
      `Pin button is not centered in its action row: ${pinActionSpacing.centerDelta}px offset`,
    );
  }

  await mkdir(ARTIFACTS_DIR, { recursive: true });
  const pinRow = await driver.findElement(By.css('[data-id="phase0-row"]'));
  const pinRowScreenshot = await pinRow.takeScreenshot(true);
  await writeFile(PIN_ROW_SCREENSHOT_PATH, pinRowScreenshot, 'base64');

  const regroupSimilar = await verifyRegroupSimilarResults(driver);
  const enhancerQuiescence = await verifyEnhancersQuiesce(driver);

  const folderIcon = await createFolderWithIcon(driver);

  if (folderIcon.naturalWidth === 0) {
    throw new Error(
      `Folder icon failed to load from the packaged extension: ${folderIcon.src}`,
    );
  }

  if (folderIcon.collapsedCardHeight > 68) {
    throw new Error(
      `Collapsed bookmark folder is taller than the compact layout allows: ${folderIcon.collapsedCardHeight}px`,
    );
  }

  if (folderIcon.tradeListPresent) {
    throw new Error('Collapsed bookmark folder still renders its saved trades.');
  }

  assertIconPickerIsCapped(folderIcon.picker, 'In-page');

  await mkdir(ARTIFACTS_DIR, { recursive: true });
  const bookmarkScreenshot = await driver.takeScreenshot();
  await writeFile(BOOKMARK_SCREENSHOT_PATH, bookmarkScreenshot, 'base64');

  const inPageHistory = await measureInPageHistory(driver);

  const pinnedItem = await pinResultAndMeasure(driver);

  if (pinnedItem.title !== 'The Taming') {
    throw new Error(`Pinned item title was not captured correctly: ${pinnedItem.title}`);
  }

  if (pinnedItem.subtitle !== 'SmokeSeller#1234') {
    throw new Error(
      `Pinned item seller context was crowded by other metadata: ${pinnedItem.subtitle}`,
    );
  }

  if (pinnedItem.cardHeight > 90) {
    throw new Error(
      `Pinned item card is taller than the compact layout allows: ${pinnedItem.cardHeight}px`,
    );
  }

  if (pinnedItem.thumbnailWidth !== 36 || pinnedItem.thumbnailHeight !== 36) {
    throw new Error(
      `Pinned item artwork has the wrong size: ${pinnedItem.thumbnailWidth}×${pinnedItem.thumbnailHeight}px`,
    );
  }

  if (Math.abs(pinnedItem.contentRightGap) > 1) {
    throw new Error(
      `Pinned list does not align with the tab row: ${pinnedItem.contentRightGap}px`,
    );
  }

  const pinnedPanelScreenshot = await driver.takeScreenshot();
  await writeFile(
    PINNED_PANEL_SCREENSHOT_PATH,
    pinnedPanelScreenshot,
    'base64',
  );

  // Collect smoke summary without poe.ninja check
  const smokeSummary = await driver.executeScript(
    (
      loadedFolderIcon,
      loadedPinActionSpacing,
      loadedPinnedItem,
      loadedRegroupSimilar,
      loadedEnhancerQuiescence,
      loadedInPageHistory,
    ) => {
      const host = document.querySelector('[data-btff-phase0-host="true"]');
      const shadowRoot = host?.shadowRoot;
      const shrinkButton = [...(shadowRoot?.querySelectorAll('button') ?? [])].find(
        (element) => element.textContent?.includes('Shrink'),
      );

      return {
        folderIcon: {
          collapsedCardHeight: loadedFolderIcon.collapsedCardHeight,
          headerText: loadedFolderIcon.headerText,
          naturalHeight: loadedFolderIcon.naturalHeight,
          naturalWidth: loadedFolderIcon.naturalWidth,
          tradeListPresent: loadedFolderIcon.tradeListPresent,
        },
        enhancerQuiescence: loadedEnhancerQuiescence,
        inPageHistory: loadedInPageHistory,
        pinActionSpacing: loadedPinActionSpacing,
        pinnedItem: loadedPinnedItem,
        regroupSimilar: loadedRegroupSimilar,
        shrinkButtonPresent: !!shrinkButton,
        warnings: document.querySelectorAll('.btff-phase0-maximum-sockets').length,
      };
    },
    folderIcon,
    pinActionSpacing,
    pinnedItem,
    regroupSimilar,
    enhancerQuiescence,
    inPageHistory,
  );

  const screenshot = await driver.takeScreenshot();
  await writeFile(SCREENSHOT_PATH, screenshot, 'base64');

  const dockDrag = await verifyCollapsedDockDrag(driver, extensionId);

  console.log('Firefox smoke passed.', {
    ...smokeSummary,
    dockDrag,
    toolbarPopup,
  });
  console.log(`Collapsed bookmark screenshot: ${BOOKMARK_SCREENSHOT_PATH}`);
  console.log(`Bookmark color picker screenshot: ${BOOKMARK_COLOR_PICKER_SCREENSHOT_PATH}`);
  console.log(`Completed bookmark screenshot: ${BOOKMARK_COMPLETED_SCREENSHOT_PATH}`);
  console.log(`Draggable dock screenshot: ${DOCK_SCREENSHOT_PATH}`);
  console.log(`Popup history screenshot: ${POPUP_HISTORY_SCREENSHOT_PATH}`);
  console.log(`Popup first-run screenshot: ${POPUP_FIRST_RUN_SCREENSHOT_PATH}`);
  console.log(`Popup icon picker screenshot: ${POPUP_PICKER_SCREENSHOT_PATH}`);
  console.log(`Pinned panel screenshot: ${PINNED_PANEL_SCREENSHOT_PATH}`);
  console.log(`Pin row screenshot: ${PIN_ROW_SCREENSHOT_PATH}`);
  console.log(`Sidebar screenshot: ${SIDEBAR_SCREENSHOT_PATH}`);
  console.log(`Screenshot: ${SCREENSHOT_PATH}`);
} finally {
  await driver.quit();
}

async function installTradeFixture(driver) {
  await driver.executeScript((html, fixtureStyles) => {
    const extensionHost = document.querySelector(
      '[data-btff-phase0-host="true"]',
    );
    Array.from(document.body.children).forEach((child) => {
      if (child !== extensionHost && !child.contains(extensionHost)) child.remove();
    });

    document.body.className = 'btff-smoke-page';
    document.getElementById('btff-smoke-fixture-styles')?.remove();
    const style = document.createElement('style');
    style.id = 'btff-smoke-fixture-styles';
    style.textContent = fixtureStyles;
    document.head.append(style);

    const stage = document.createElement('main');
    stage.className = 'btff-smoke-stage';
    stage.innerHTML = html;
    document.body.prepend(stage);

    const original = document.querySelector('[data-id="phase0-row"]');
    const duplicate = original?.cloneNode(true);
    if (duplicate instanceof HTMLElement) {
      duplicate.dataset.id = 'phase0-row-duplicate';
      original.after(duplicate);
    }
  }, RESULTSET_HTML, TRADE_FIXTURE_STYLES);
}

async function verifyToolbarPopupOpens(driver, extensionId) {
  await driver.get('about:blank');
  await driver.setContext(firefox.Context.CHROME);

  try {
    await driver.executeScript(() => {
      document.getElementById('unified-extensions-button')?.click();
    });

    const actionButtonId = `${extensionId.replace(/[{}]/g, '_')}-BAP`;
    await driver.wait(async () => {
      return driver.executeScript(
        (buttonId) => !!document.getElementById(buttonId),
        actionButtonId,
      );
    }, 10_000, 'Extension action did not appear in the Firefox toolbar UI.');

    await driver.executeScript((buttonId) => {
      document.getElementById(buttonId)?.click();
    }, actionButtonId);

    let geometry = null;

    try {
      geometry = await driver.wait(async () => {
        const nextGeometry = await measureToolbarPopup(driver);
        return nextGeometry.browser.height > 100 ? nextGeometry : false;
      }, 3_000, 'Toolbar popup remained collapsed.');
    } catch {
      geometry = await measureToolbarPopup(driver);
      throw new Error(
        `Firefox toolbar popup did not obtain a usable height: ${JSON.stringify(geometry)}`,
      );
    }

    await driver.executeScript(() => {
      document.getElementById('customizationui-widget-panel')?.hidePopup();
    });

    return geometry;
  } finally {
    await driver.setContext(firefox.Context.CONTENT);
  }
}

async function measureToolbarPopup(driver) {
  return driver.executeScript(() => {
    const panel = document.getElementById('customizationui-widget-panel');
    const popupBrowser = panel?.querySelector(
      'browser[webextension-view-type="popup"]',
    );
    const panelRect = panel?.getBoundingClientRect();
    const browserRect = popupBrowser?.getBoundingClientRect();

    return {
      browser: {
        height: Math.round(browserRect?.height ?? 0),
        style: popupBrowser?.getAttribute('style') ?? null,
        width: Math.round(browserRect?.width ?? 0),
      },
      panel: {
        height: Math.round(panelRect?.height ?? 0),
        state: panel?.state ?? null,
        width: Math.round(panelRect?.width ?? 0),
      },
    };
  });
}

async function initializeFreshProfile(driver, extensionId) {
  const popupUrl = await resolveExtensionPopupUrl(driver, extensionId);
  await driver.get(popupUrl);
  await driver.wait(
    until.elementLocated(By.css('.popup-shell')),
    20_000,
    'Extension popup did not load for smoke-profile initialization.',
  );

  await driver.wait(async () => {
    const tabs = await driver.findElements(By.css('.popup-tab'));
    if (tabs.length !== 4) return false;

    const states = await Promise.all(
      tabs.map(async (tab) => ({
        active: (await tab.getAttribute('data-active')) === 'true',
        disabled: (await tab.getAttribute('disabled')) !== null,
        label: (await tab.getText()).trim(),
      })),
    );
    const importTab = states.find((tab) => tab.label === 'Import');

    return importTab?.active && states.every((tab) => !tab.disabled);
  }, 20_000, 'Fresh smoke profile did not open Import with every tab enabled.');

  const onboardingNotices = await driver.findElements(By.css('.popup-status'));
  if (onboardingNotices.length > 0) {
    throw new Error('Fresh smoke profile still exposed an onboarding notice.');
  }

  const legacyButtons = await driver.findElements(
    By.xpath(
      "//button[normalize-space(.)='Start fresh' or normalize-space(.)='Continue without import' or normalize-space(.)='Dismiss']",
    ),
  );
  if (legacyButtons.length > 0) {
    throw new Error('Fresh smoke profile still exposed a legacy onboarding action.');
  }

  await mkdir(ARTIFACTS_DIR, { recursive: true });
  const firstRunScreenshot = await driver.takeScreenshot();
  await writeFile(
    POPUP_FIRST_RUN_SCREENSHOT_PATH,
    firstRunScreenshot,
    'base64',
  );

  await driver.wait(async () => {
    return driver.executeAsyncScript((done) => {
      browser.storage.local
        .get('btff-schema-v1')
        .then((result) => {
          done(Boolean(result['btff-schema-v1']?.preferences?.hasCompletedOnboarding));
        })
        .catch(() => done(false));
    });
  }, 20_000, 'Fresh smoke profile did not record its first popup open.');

  await driver.navigate().refresh();
  await driver.wait(
    until.elementLocated(By.css('.popup-shell')),
    20_000,
    'Extension popup did not reload after first-run initialization.',
  );

  await driver.wait(async () => {
    const tabs = await driver.findElements(By.css('.popup-tab'));

    for (const tab of tabs) {
      if ((await tab.getText()).trim() !== 'Bookmarks') continue;

      return (
        (await tab.getAttribute('data-active')) === 'true' &&
        (await tab.getAttribute('disabled')) === null
      );
    }

    return false;
  }, 20_000, 'Initialized smoke profile did not return to Bookmarks.');

  const settingsTab = await findElementByText(driver, '.popup-tab', 'Settings');
  await settingsTab.click();
  await setPopupCheckbox(driver, 'Keep pins across searches in this tab', true);

  const bookmarksTab = await findElementByText(driver, '.popup-tab', 'Bookmarks');
  await bookmarksTab.click();
}

async function measurePinActionSpacing(driver) {
  await driver.wait(async () => {
    const host = await driver.findElements(
      By.css('[data-id="phase0-row"] .btff-pin-action-host'),
    );
    return host.length > 0;
  }, 20_000, 'Pin action host did not render for spacing verification.');

  return driver.executeScript(() => {
    const row = document.querySelector('[data-id="phase0-row"]');
    const nativeActions = row?.querySelector('.details .btns');
    const pinHost = row?.querySelector('.btff-pin-action-host');
    const nativeRect = nativeActions?.getBoundingClientRect();
    const pinRect = pinHost?.getBoundingClientRect();
    const pinButtonRect = pinHost
      ?.querySelector('.btff-pin-button')
      ?.getBoundingClientRect();

    return {
      centerDelta:
        pinRect && pinButtonRect
          ? Math.round(
              Math.abs(
                pinButtonRect.left + pinButtonRect.width / 2 -
                  (pinRect.left + pinRect.width / 2),
              ) * 100,
            ) / 100
          : Number.POSITIVE_INFINITY,
      computedMarginTop: pinHost ? getComputedStyle(pinHost).marginTop : null,
      nativeActions: nativeActions?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
      renderedGap:
        nativeRect && pinRect
          ? Math.round((pinRect.top - nativeRect.bottom) * 100) / 100
          : Number.NEGATIVE_INFINITY,
    };
  });
}

async function verifyRegroupSimilarResults(driver) {
  const toggle = await driver.wait(async () => {
    const [button] = await driver.findElements(By.css('.bt-group-button'));
    return button ?? false;
  }, 20_000, 'Regroup-similar control did not render for duplicate results.');

  const hiddenState = await driver.executeScript(() => {
    const row = document.querySelector('[data-id="phase0-row-duplicate"]');
    return {
      display: row ? getComputedStyle(row).display : null,
      state: row?.getAttribute('bt-regroup-state') ?? null,
    };
  });

  if (hiddenState.state !== 'hidden' || hiddenState.display !== 'none') {
    throw new Error(
      `Regroup-similar did not hide the duplicate row: ${JSON.stringify(hiddenState)}`,
    );
  }

  await toggle.click();

  const visibleState = await driver.wait(async () => {
    const state = await driver.executeScript(() => {
      const row = document.querySelector('[data-id="phase0-row-duplicate"]');
      return {
        display: row ? getComputedStyle(row).display : null,
        state: row?.getAttribute('bt-regroup-state') ?? null,
      };
    });

    return state.state === 'visible' && state.display !== 'none' ? state : false;
  }, 10_000, 'Regroup-similar toggle did not reveal the duplicate row.');

  return { hiddenState, visibleState };
}

async function verifyEnhancersQuiesce(driver) {
  const result = await driver.executeAsyncScript((done) => {
    const selector = [
      '.bt-group-button',
      '.btff-pin-button',
      '.btff-pin-action-host',
      '.btff-phase0-maximum-sockets',
      '.btff-equivalent-pricings',
    ].join(',');
    const samples = [];
    let mutationCount = 0;

    const resolveElement = (node) =>
      node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;

    const isInsideExtensionUi = (node) => {
      const element = resolveElement(node);

      return !!(
        element?.matches?.(selector) || element?.closest?.(selector)
      );
    };

    const containsExtensionUi = (node) => {
      const element = resolveElement(node);

      return !!(
        isInsideExtensionUi(node) ||
        element?.querySelector?.(selector)
      );
    };

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        const changedExtensionUi =
          isInsideExtensionUi(record.target) ||
          [...record.addedNodes].some(containsExtensionUi) ||
          [...record.removedNodes].some(containsExtensionUi);

        if (!changedExtensionUi) continue;

        mutationCount += 1;
        if (samples.length < 5) {
          samples.push({
            addedNodes: record.addedNodes.length,
            removedNodes: record.removedNodes.length,
            target:
              record.target instanceof Element
                ? record.target.className || record.target.tagName
                : record.target.parentElement?.className ?? '#text',
            type: record.type,
          });
        }
      }
    });

    observer.observe(document.body, {
      characterData: true,
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      done({ mutationCount, samples });
    }, 650);
  });

  if (result.mutationCount !== 0) {
    throw new Error(
      `Page enhancers kept mutating while idle: ${JSON.stringify(result)}`,
    );
  }

  return result;
}

async function verifyCollapsedDockDrag(driver, extensionId) {
  const popupUrl = await resolveExtensionPopupUrl(driver, extensionId);
  await driver.get(popupUrl);
  await driver.wait(
    until.elementLocated(By.css('.popup-shell')),
    20_000,
    'Extension popup did not load in a browser tab.',
  );

  const popupUi = await verifyPopupControls(driver);

  let settingsTab = await findElementByText(driver, '.popup-tab', 'Settings');
  await settingsTab.click();
  await setPopupCheckbox(driver, 'Open the in-page panel collapsed', false);
  await setPopupCheckbox(driver, 'Open the in-page panel as a sidebar', true);

  await driver.get(START_URL);
  let host = await driver.wait(
    until.elementLocated(By.css('[data-btff-phase0-host="true"]')),
    20_000,
    'Better Trading shadow host did not remount for sidebar verification.',
  );
  let shadowRoot = await host.getShadowRoot();
  const [sidebarPanel] = await waitForElements(
    driver,
    shadowRoot,
    '.btff-panel',
  );
  const sidebarLayout = await driver.executeScript((panel) => {
    const rect = panel.getBoundingClientRect();
    return {
      borderRadius: getComputedStyle(panel).borderRadius,
      height: Math.round(rect.height),
      rightGap: Math.round(window.innerWidth - rect.right),
      top: Math.round(rect.top),
    };
  }, sidebarPanel);

  if (
    sidebarLayout.borderRadius !== '0px' ||
    sidebarLayout.rightGap !== 0 ||
    sidebarLayout.top !== 0
  ) {
    throw new Error(
      `Sidebar is not square and flush with the viewport: ${JSON.stringify(sidebarLayout)}`,
    );
  }

  await installTradeFixture(driver);
  const sidebarScreenshot = await driver.takeScreenshot();
  await writeFile(SIDEBAR_SCREENSHOT_PATH, sidebarScreenshot, 'base64');

  await driver.get(popupUrl);
  await driver.wait(
    until.elementLocated(By.css('.popup-shell')),
    20_000,
    'Extension popup did not reopen after sidebar verification.',
  );
  settingsTab = await findElementByText(driver, '.popup-tab', 'Settings');
  await settingsTab.click();
  await setPopupCheckbox(driver, 'Open the in-page panel as a sidebar', false);
  await setPopupCheckbox(driver, 'Allow dragging the overlay panel', true);
  await setPopupCheckbox(driver, 'Open the in-page panel collapsed', true);

  await driver.get(START_URL);
  host = await driver.wait(
    until.elementLocated(By.css('[data-btff-phase0-host="true"]')),
    20_000,
    'Better Trading shadow host did not remount for drag verification.',
  );
  shadowRoot = await host.getShadowRoot();
  const [dock] = await waitForElements(driver, shadowRoot, '.btff-panel-dock');
  const [launcher] = await waitForElements(
    driver,
    shadowRoot,
    '.btff-panel-dock__button',
  );

  const before = await dock.getRect();
  const launcherRect = await launcher.getRect();

  if (launcherRect.width < before.width - 2 || launcherRect.height < 44) {
    throw new Error(
      `Compact launcher is not acting as a full-card drag target: ${launcherRect.width}×${launcherRect.height}px for a ${before.width}px dock`,
    );
  }

  await driver.actions().dragAndDrop(launcher, { x: -160, y: 100 }).perform();

  const moved = await driver.wait(async () => {
    const rect = await dock.getRect();
    return rect.x <= before.x - 100 && rect.y >= before.y + 60 ? rect : false;
  }, 10_000, 'Compact dock did not move from its launcher card.');

  const remainedCollapsed = (await shadowRoot.findElements(
    By.css('.btff-panel-dock'),
  )).length === 1;

  if (!remainedCollapsed) {
    throw new Error('Dragging the compact launcher also expanded the panel.');
  }

  const dockScreenshot = await driver.takeScreenshot();
  await writeFile(DOCK_SCREENSHOT_PATH, dockScreenshot, 'base64');

  await driver.actions().dragAndDrop(launcher, { x: 250, y: 0 }).perform();
  const edgeDock = await dock.getRect();
  await launcher.click();

  const [panel] = await waitForElements(driver, shadowRoot, '.btff-panel');
  const expanded = await driver.wait(async () => {
    const rect = await panel.getRect();
    const viewport = await driver.executeScript(() => ({
      height: window.innerHeight,
      width: window.innerWidth,
    }));
    const isInsideViewport =
      rect.x >= -1 &&
      rect.y >= -1 &&
      rect.x + rect.width <= viewport.width + 1 &&
      rect.y + rect.height <= viewport.height + 1;

    return isInsideViewport ? { rect, viewport } : false;
  }, 10_000, 'Expanded panel was not re-clamped inside the viewport.');

  const [logoButton] = await waitForElements(
    driver,
    shadowRoot,
    '.btff-panel__logo-button',
  );
  await driver.actions().doubleClick(logoButton).perform();
  await waitForElements(driver, shadowRoot, '.btff-panel-dock');

  return {
    before: summarizeRect(before),
    dockAtRightEdge: summarizeRect(edgeDock),
    expanded: summarizeRect(expanded.rect),
    launcher: summarizeRect(launcherRect),
    logoDoubleClickCollapsed: true,
    moved: summarizeRect(moved),
    popupUi,
    sidebar: sidebarLayout,
    viewport: expanded.viewport,
  };
}

async function verifyPopupControls(driver) {
  const shell = await driver.findElement(By.css('.popup-shell'));
  const bookmarksTab = await findElementByText(driver, '.popup-tab', 'Bookmarks');
  await bookmarksTab.click();

  const pickerSummary = await driver.wait(
    until.elementLocated(By.css('.popup-record-card .btff-folder-icon-picker__summary')),
    20_000,
    'Popup bookmark icon picker did not render.',
  );
  await pickerSummary.click();

  const pickerOptions = await driver.wait(
    until.elementLocated(By.css('.popup-record-card .btff-folder-icon-picker__options')),
    10_000,
    'Popup bookmark icon options did not open.',
  );
  const picker = await measureIconPicker(driver, pickerOptions);
  assertIconPickerIsCapped(picker, 'Popup');

  const pickerScreenshot = await driver.takeScreenshot();
  await writeFile(POPUP_PICKER_SCREENSHOT_PATH, pickerScreenshot, 'base64');
  await pickerSummary.click();

  const deleteTrade = await driver.wait(
    until.elementLocated(By.css('.popup-trade-actions .popup-button--danger')),
    10_000,
    'Popup saved-search delete action did not render.',
  );
  await deleteTrade.click();
  const deleteTradeDialog = await driver.wait(
    until.elementLocated(
      By.css(
        'dialog.popup-confirmation-dialog[data-confirmation="delete-trade"][open]',
      ),
    ),
    10_000,
    'Saved-search delete confirmation did not appear.',
  );
  await assertDialogIsVisible(driver, deleteTradeDialog, 'Saved-search delete');
  if (!(await deleteTradeDialog.getText()).includes('Delete saved search?')) {
    throw new Error('Saved-search delete confirmation copy is missing.');
  }
  const cancelDeleteTrade = await findElementByText(
    driver,
    'dialog[data-confirmation="delete-trade"] button',
    'Cancel',
  );
  await cancelDeleteTrade.click();

  const bookmarksSize = await measurePopupShell(driver, shell);
  const historyTab = await findElementByText(driver, '.popup-tab', 'History');
  await historyTab.click();
  const historyItem = await driver.wait(
    until.elementLocated(By.css('.popup-history-item')),
    20_000,
    'Popup history did not render a saved search.',
  );
  const historyItemRect = await historyItem.getRect();
  const historyPills = await historyItem.findElement(
    By.css('.popup-history-pills'),
  );
  const historyPillsJustification = await historyPills.getCssValue(
    'justify-content',
  );

  if (historyPillsJustification !== 'flex-start') {
    throw new Error('Popup history pills are not anchored to the left edge.');
  }

  if (historyItemRect.height > 82) {
    throw new Error(
      `Popup history card is taller than the compact layout allows: ${historyItemRect.height}px`,
    );
  }

  const clearHistory = await findElementByText(
    driver,
    '.popup-panel-header button',
    'Clear all history',
  );
  await clearHistory.click();
  const clearHistoryDialog = await driver.wait(
    until.elementLocated(
      By.css(
        'dialog.popup-confirmation-dialog[data-confirmation="clear-history"][open]',
      ),
    ),
    10_000,
    'Clear-history confirmation did not appear.',
  );
  await assertDialogIsVisible(driver, clearHistoryDialog, 'Clear-history');
  const cancelClear = await findElementByText(
    driver,
    'dialog[data-confirmation="clear-history"] button',
    'Cancel',
  );
  await cancelClear.click();

  const historyScreenshot = await driver.takeScreenshot();
  await writeFile(POPUP_HISTORY_SCREENSHOT_PATH, historyScreenshot, 'base64');

  await driver.executeScript((popupShell) => {
    popupShell.dispatchEvent(new WheelEvent('wheel', { bubbles: true }));
  }, shell);
  const transientScrollbarVisible =
    (await shell.getAttribute('data-scrolling')) === 'true';

  if (!transientScrollbarVisible) {
    throw new Error('Popup scrollbar did not become visible during wheel activity.');
  }

  const historySize = await measurePopupShell(driver, shell);
  const importTab = await findElementByText(driver, '.popup-tab', 'Import');
  await importTab.click();
  const resetButton = await findElementByText(
    driver,
    '.popup-actions button',
    'Clear saved data',
  );
  await resetButton.click();
  const resetConfirmation = await driver.wait(
    until.elementLocated(
      By.css(
        'dialog.popup-confirmation-dialog[data-confirmation="reset-data"][open]',
      ),
    ),
    10_000,
    'Clear-data confirmation did not appear.',
  );
  await assertDialogIsVisible(driver, resetConfirmation, 'Clear-data');
  if (!(await resetConfirmation.getText()).includes('Clear Better Trading data?')) {
    throw new Error('Clear-data confirmation copy is missing.');
  }
  const cancelReset = await findElementByText(
    driver,
    'dialog[data-confirmation="reset-data"] button',
    'Cancel',
  );
  await cancelReset.click();
  const importSize = await measurePopupShell(driver, shell);

  const settingsTab = await findElementByText(driver, '.popup-tab', 'Settings');
  await settingsTab.click();
  const settingsSize = await measurePopupShell(driver, shell);

  for (const [label, size] of [
    ['History', historySize],
    ['Import', importSize],
    ['Settings', settingsSize],
  ]) {
    if (
      size.height !== bookmarksSize.height ||
      size.width !== bookmarksSize.width ||
      size.clientWidth !== bookmarksSize.clientWidth
    ) {
      throw new Error(
        `${label} changed the popup scrollbar geometry: ${JSON.stringify({ bookmarksSize, size })}`,
      );
    }
  }

  return {
    bookmarksSize,
    historyCardHeight: Math.round(historyItemRect.height),
    historyPillsJustification,
    historySize,
    importSize,
    picker,
    settingsSize,
    transientScrollbarVisible,
  };
}

async function assertDialogIsVisible(driver, dialog, label) {
  const geometry = await driver.executeScript((dialogElement) => {
    const rect = dialogElement.getBoundingClientRect();
    return {
      bottom: Math.round(rect.bottom),
      height: Math.round(rect.height),
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      top: Math.round(rect.top),
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      width: Math.round(rect.width),
    };
  }, dialog);

  if (
    geometry.width <= 0 ||
    geometry.height <= 0 ||
    geometry.left < 0 ||
    geometry.top < 0 ||
    geometry.right > geometry.viewportWidth ||
    geometry.bottom > geometry.viewportHeight
  ) {
    throw new Error(
      `${label} dialog is outside the visible popup viewport: ${JSON.stringify(geometry)}`,
    );
  }

  return geometry;
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

async function setPopupCheckbox(driver, labelText, checked) {
  const setting = await driver.wait(async () => {
    const labels = await driver.findElements(By.css('.popup-setting-card'));

    for (const label of labels) {
      if ((await label.getText()).includes(labelText)) return label;
    }

    return false;
  }, 20_000, `Could not find popup setting "${labelText}".`);
  const checkbox = await setting.findElement(By.css('input[type="checkbox"]'));

  if ((await checkbox.isSelected()) !== checked) {
    await checkbox.click();
  }

  await driver.wait(
    async () => (await checkbox.isSelected()) === checked,
    10_000,
    `Popup setting "${labelText}" did not update.`,
  );
}

async function measurePopupShell(driver, shell) {
  return driver.executeScript((popupShell) => {
    const rect = popupShell.getBoundingClientRect();
    return {
      clientWidth: popupShell.clientWidth,
      height: Math.round(rect.height),
      scrollHeight: popupShell.scrollHeight,
      width: Math.round(rect.width),
    };
  }, shell);
}

async function measureIconPicker(driver, optionsElement) {
  return driver.executeScript((options) => {
    const optionElements = Array.from(
      options.querySelectorAll('.btff-folder-icon-picker__option'),
    );
    const firstOption = optionElements[0];
    const styles = getComputedStyle(options);
    const optionHeight = firstOption?.getBoundingClientRect().height ?? 0;
    const rowGap = Number.parseFloat(styles.rowGap) || 0;
    const verticalPadding =
      (Number.parseFloat(styles.paddingTop) || 0) +
      (Number.parseFloat(styles.paddingBottom) || 0);
    const usableHeight = Math.max(options.clientHeight - verticalPadding, 0);
    const viewport = options.closest('.popup-shell, .btff-panel__scroll-area');
    const optionsRect = options.getBoundingClientRect();
    const viewportRect = viewport?.getBoundingClientRect();
    const visibleIntersectionHeight = viewportRect
      ? Math.max(
          Math.min(optionsRect.bottom, viewportRect.bottom) -
            Math.max(optionsRect.top, viewportRect.top),
          0,
        )
      : 0;
    const viewportUsableHeight = Math.max(
      Math.min(visibleIntersectionHeight, options.clientHeight) - verticalPadding,
      0,
    );

    return {
      clientHeight: options.clientHeight,
      optionCount: optionElements.length,
      optionHeight,
      scrollHeight: options.scrollHeight,
      viewportVisibleRows:
        optionHeight > 0
          ? Math.floor(
              (viewportUsableHeight + rowGap) / (optionHeight + rowGap),
            )
          : 0,
      visibleRows:
        optionHeight > 0
          ? Math.floor((usableHeight + rowGap) / (optionHeight + rowGap))
          : 0,
    };
  }, optionsElement);
}

function assertIconPickerIsCapped(picker, locationLabel) {
  if (picker.optionCount !== 24) {
    throw new Error(
      `${locationLabel} icon picker has ${picker.optionCount} options instead of 24.`,
    );
  }

  if (picker.visibleRows < 10 || picker.visibleRows > 12) {
    throw new Error(
      `${locationLabel} icon picker shows ${picker.visibleRows} rows before scrolling.`,
    );
  }

  if (picker.viewportVisibleRows < 10) {
    throw new Error(
      `${locationLabel} icon picker exposes only ${picker.viewportVisibleRows} rows in its panel viewport after opening.`,
    );
  }

  if (picker.scrollHeight <= picker.clientHeight) {
    throw new Error(`${locationLabel} icon picker is not internally scrollable.`);
  }
}

function summarizeRect(rect) {
  return {
    height: Math.round(rect.height),
    width: Math.round(rect.width),
    x: Math.round(rect.x),
    y: Math.round(rect.y),
  };
}

async function createFolderWithIcon(driver) {
  const host = await driver.findElement(By.css('[data-btff-phase0-host="true"]'));
  const shadowRoot = await host.getShadowRoot();
  const bookmarksTab = await findElementByText(
    shadowRoot,
    '.btff-panel__tab',
    'Bookmarks',
  );
  await bookmarksTab.click();

  const [quickSaveToggle] = await waitForElements(
    driver,
    shadowRoot,
    '.btff-panel__composer-toggle',
  );
  await quickSaveToggle.click();

  let inputs = await waitForElements(
    driver,
    shadowRoot,
    '.btff-panel__field > input',
    2,
  );
  await inputs[0].sendKeys('Smoke test folder');

  const [folderGreen] = await waitForElements(
    driver,
    shadowRoot,
    'input[aria-label="Folder name color: Green"]',
  );
  await driver.executeScript((input) => input.click(), folderGreen);

  const [iconPickerSummary] = await waitForElements(
    driver,
    shadowRoot,
    '.btff-panel__field .btff-folder-icon-picker__summary',
  );
  await iconPickerSummary.click();
  const [iconPickerOptions] = await waitForElements(
    driver,
    shadowRoot,
    '.btff-folder-icon-picker__options',
  );
  const picker = await measureIconPicker(driver, iconPickerOptions);
  const shadowOption = await findElementContainingText(
    shadowRoot,
    '.btff-folder-icon-picker__option',
    'Shadow',
  );
  await shadowOption.click();

  inputs = await waitForElements(
    driver,
    shadowRoot,
    '.btff-panel__field > input',
    2,
  );
  await inputs.at(-1).sendKeys('Smoke test trade');

  const [bookmarkViolet] = await waitForElements(
    driver,
    shadowRoot,
    'input[aria-label="Bookmark name color: Violet"]',
  );
  await driver.executeScript((input) => input.click(), bookmarkViolet);

  const colorPickerScreenshot = await driver.takeScreenshot();
  await writeFile(
    BOOKMARK_COLOR_PICKER_SCREENSHOT_PATH,
    colorPickerScreenshot,
    'base64',
  );

  const saveButton = await findElementByText(
    shadowRoot,
    'button',
    'Save current search',
  );
  await saveButton.click();

  const loadedFolderIcon = await driver.wait(async () => {
    const [image] = await shadowRoot.findElements(
      By.css('.btff-panel__folder-icon'),
    );
    if (!image) return false;

    return driver.executeScript((folderIconImage) => {
      if (!folderIconImage.complete) return null;
      return {
        naturalHeight: folderIconImage.naturalHeight,
        naturalWidth: folderIconImage.naturalWidth,
        src: folderIconImage.src,
      };
    }, image);
  }, 20_000);

  const folderToggle = await driver.wait(async () => {
    const [toggle] = await shadowRoot.findElements(
      By.css('.btff-panel__record-toggle'),
    );
    if (!toggle) return false;

    return (await toggle.getAttribute('aria-expanded')) === 'true'
      ? toggle
      : false;
  }, 20_000, 'Saved bookmark folder did not open after creation.');

  const nameColors = await driver.executeScript(() => {
    const host = document.querySelector('[data-btff-phase0-host="true"]');
    const root = host?.shadowRoot;
    const folderTitle = root?.querySelector(
      '.btff-panel__record-toggle [data-name-color="green"]',
    );
    const tradeTitle = root?.querySelector(
      '.btff-panel__trade-title[data-name-color="violet"]',
    );

    return {
      folder: folderTitle ? getComputedStyle(folderTitle).color : null,
      trade: tradeTitle ? getComputedStyle(tradeTitle).color : null,
    };
  });

  if (nameColors.folder !== 'rgb(104, 168, 117)') {
    throw new Error(`Folder name color did not persist: ${nameColors.folder}`);
  }

  if (nameColors.trade !== 'rgb(164, 119, 189)') {
    throw new Error(`Bookmark name color did not persist: ${nameColors.trade}`);
  }

  const markDoneButton = await findElementByText(
    shadowRoot,
    'button',
    'Mark done',
  );
  await markDoneButton.click();

  const completedX = await driver.wait(async () => {
    const state = await driver.executeScript(() => {
      const host = document.querySelector('[data-btff-phase0-host="true"]');
      const root = host?.shadowRoot;
      const row = root?.querySelector('.btff-panel__trade-row');
      const title = row?.querySelector('.btff-panel__trade-title');
      if (!(row instanceof HTMLElement) || !(title instanceof HTMLElement)) {
        return null;
      }

      const before = getComputedStyle(title, '::before');
      const after = getComputedStyle(title, '::after');
      return {
        afterBackground: after.backgroundImage,
        completed: row.dataset.completed,
        afterContent: after.content,
        afterInset: [after.top, after.right, after.bottom, after.left],
        afterWidth: Number.parseFloat(after.width),
        beforeBackground: before.backgroundImage,
        beforeContent: before.content,
        beforeInset: [before.top, before.right, before.bottom, before.left],
        beforeWidth: Number.parseFloat(before.width),
        titleWidth: title.getBoundingClientRect().width,
      };
    });

    return state?.completed === 'true' ? state : false;
  }, 20_000, 'Saved bookmark did not enter the completed state.');

  if (
    !completedX.beforeBackground.includes('linear-gradient') ||
    !completedX.beforeBackground.includes('rgb(200, 90, 74)') ||
    !completedX.afterBackground.includes('linear-gradient') ||
    !completedX.afterBackground.includes('rgb(200, 90, 74)') ||
    completedX.beforeBackground === completedX.afterBackground ||
    completedX.beforeInset.join(' ') !== '-1px -2px -1px -2px' ||
    completedX.afterInset.join(' ') !== '-1px -2px -1px -2px' ||
    completedX.beforeWidth < completedX.titleWidth ||
    completedX.afterWidth < completedX.titleWidth ||
    completedX.beforeContent === 'none' ||
    completedX.afterContent === 'none'
  ) {
    throw new Error(`Completed bookmark X did not render correctly: ${JSON.stringify(completedX)}`);
  }

  const completedScreenshot = await driver.takeScreenshot();
  await writeFile(
    BOOKMARK_COMPLETED_SCREENSHOT_PATH,
    completedScreenshot,
    'base64',
  );

  const [updatedFolderToggle] = await waitForElements(
    driver,
    shadowRoot,
    '.btff-panel__record-toggle',
  );
  await updatedFolderToggle.click();

  const collapsedFolder = await driver.wait(async () => {
    const state = await driver.executeScript(() => {
      const host = document.querySelector('[data-btff-phase0-host="true"]');
      const root = host?.shadowRoot;
      const record = root?.querySelector('.btff-panel__record');
      const toggle = root?.querySelector('.btff-panel__record-toggle');

      return {
        collapsedCardHeight:
          record?.getBoundingClientRect().height ?? Number.POSITIVE_INFINITY,
        expanded: toggle?.getAttribute('aria-expanded') ?? null,
        headerText: toggle?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
        tradeListPresent: !!record?.querySelector('.btff-panel__trade-list'),
      };
    });

    return state.expanded === 'false' ? state : false;
  }, 20_000, 'Saved bookmark folder did not collapse to its compact header.');

  return {
    ...loadedFolderIcon,
    ...collapsedFolder,
    completedX,
    nameColors,
    picker,
  };
}

async function pinResultAndMeasure(driver) {
  const [pinButton] = await driver.wait(async () => {
    const buttons = await driver.findElements(By.css('.btff-pin-button'));
    return buttons.length > 0 ? buttons : false;
  }, 20_000, 'Pin button did not render for the injected trade result.');
  await pinButton.click();

  const host = await driver.findElement(By.css('[data-btff-phase0-host="true"]'));
  const shadowRoot = await host.getShadowRoot();
  const pinnedTab = await findElementByText(
    shadowRoot,
    '.btff-panel__tab',
    'Pinned',
  );
  await pinnedTab.click();

  await waitForElements(driver, shadowRoot, '.btff-panel__pinned-item');
  const readPinnedTimestamp = () =>
    driver.executeScript(() => {
      const hostElement = document.querySelector('[data-btff-phase0-host="true"]');
      return (
        hostElement?.shadowRoot
          ?.querySelector('.btff-panel__pinned-time')
          ?.textContent?.trim() ?? null
      );
    });
  const initialTimestamp = await readPinnedTimestamp();
  let updatedTimestamp;

  try {
    updatedTimestamp = await driver.wait(async () => {
      const timestamp = await readPinnedTimestamp();
      return timestamp !== initialTimestamp ? timestamp : false;
    }, 6_000, 'Pinned item relative time did not update while the tab remained open.');
  } catch (error) {
    const diagnostic = await driver.executeScript(() => ({
      activeTab:
        document
          .querySelector('[data-btff-phase0-host="true"]')
          ?.shadowRoot?.querySelector('.btff-panel__tab[data-active="true"]')
          ?.textContent?.trim() ?? null,
      dockPresent: Boolean(
        document
          .querySelector('[data-btff-phase0-host="true"]')
          ?.shadowRoot?.querySelector('.btff-panel-dock'),
      ),
      latestTimestamp:
        document
          .querySelector('[data-btff-phase0-host="true"]')
          ?.shadowRoot?.querySelector('.btff-panel__pinned-time')
          ?.textContent?.trim() ?? null,
      panelText:
        document
          .querySelector('[data-btff-phase0-host="true"]')
          ?.shadowRoot?.querySelector('.btff-panel')
          ?.textContent?.replace(/\s+/g, ' ')
          .trim() ?? null,
      pinnedItemCount:
        document
          .querySelector('[data-btff-phase0-host="true"]')
          ?.shadowRoot?.querySelectorAll('.btff-panel__pinned-item').length ?? 0,
      storedPins: sessionStorage.getItem('btff:session-pins-items'),
    }));
    const timeoutScreenshot = await driver.takeScreenshot();
    await writeFile(
      path.join(ARTIFACTS_DIR, 'firefox-pinned-timeout.png'),
      timeoutScreenshot,
      'base64',
    );
    throw new Error(
      `Pinned item relative time did not update: ${JSON.stringify({ initialTimestamp, ...diagnostic })}`,
      { cause: error },
    );
  }

  const metrics = await driver.executeScript(() => {
    const hostElement = document.querySelector('[data-btff-phase0-host="true"]');
    const root = hostElement?.shadowRoot;
    const card = root?.querySelector('.btff-panel__pinned-item');
    const title = root?.querySelector('.btff-panel__pinned-info strong');
    const subtitle = root?.querySelector('.btff-panel__pinned-subtitle');
    const actions = root?.querySelector('.btff-panel__pinned-actions');
    const thumbnail = root?.querySelector('.btff-panel__pinned-thumb');
    const thumbnailRect = thumbnail?.getBoundingClientRect();
    const tabsRect = root?.querySelector('.btff-panel__tabs')?.getBoundingClientRect();
    const cardRect = card?.getBoundingClientRect();

    return {
      actions: actions?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
      cardHeight: cardRect?.height ?? Number.POSITIVE_INFINITY,
      contentRightGap:
        tabsRect && cardRect
          ? Math.round((tabsRect.right - cardRect.right) * 100) / 100
          : Number.POSITIVE_INFINITY,
      subtitle: subtitle?.textContent?.trim() ?? null,
      thumbnailHeight: thumbnailRect?.height ?? 0,
      thumbnailWidth: thumbnailRect?.width ?? 0,
      title: title?.textContent?.trim() ?? null,
    };
  });

  return {
    ...metrics,
    initialTimestamp,
    updatedTimestamp,
  };
}

async function measureInPageHistory(driver) {
  const host = await driver.findElement(By.css('[data-btff-phase0-host="true"]'));
  const shadowRoot = await host.getShadowRoot();
  const historyTab = await findElementByText(
    shadowRoot,
    '.btff-panel__tab',
    'History',
  );
  await historyTab.click();
  const [historyItem] = await waitForElements(
    driver,
    shadowRoot,
    '.btff-panel__history-item',
  );
  const [historyPills] = await waitForElements(
    driver,
    shadowRoot,
    '.btff-history-pills',
  );
  const historyPillsJustification = await historyPills.getCssValue(
    'justify-content',
  );

  if (historyPillsJustification !== 'flex-start') {
    throw new Error('In-page history pills are not anchored to the left edge.');
  }
  const layout = await driver.executeScript(() => {
    const hostElement = document.querySelector('[data-btff-phase0-host="true"]');
    const root = hostElement?.shadowRoot;
    const title = root?.querySelector('.btff-panel__history-item strong');
    if (title) title.textContent = 'Headhunter Leather Belt';

    return {
      footerText:
        root?.querySelector('.btff-panel__footer span')?.textContent?.trim() ??
        null,
      titleHeight: title?.getBoundingClientRect().height ?? 0,
    };
  });
  const rect = await historyItem.getRect();

  if (layout.titleHeight <= 0 || layout.titleHeight > 34) {
    throw new Error(
      `In-page history title exceeded its two-line limit: ${layout.titleHeight}px`,
    );
  }

  if (rect.height > 82) {
    throw new Error(
      `In-page history card is taller than the compact layout allows: ${rect.height}px`,
    );
  }

  if (layout.footerText !== '1 bookmark') {
    throw new Error(
      `In-page footer has the wrong bookmark count: ${layout.footerText}`,
    );
  }

  return {
    cardHeight: Math.round(rect.height),
    footerText: layout.footerText,
    historyPillsJustification,
    titleHeight: Math.round(layout.titleHeight),
  };
}

async function findElementByText(root, selector, text) {
  const elements = await root.findElements(By.css(selector));

  for (const element of elements) {
    if ((await element.getText()).trim() === text) return element;
  }

  throw new Error(`Could not find ${selector} with text "${text}".`);
}

async function findElementContainingText(root, selector, text) {
  const elements = await root.findElements(By.css(selector));

  for (const element of elements) {
    if ((await element.getText()).includes(text)) return element;
  }

  throw new Error(`Could not find ${selector} containing text "${text}".`);
}

async function waitForElements(driver, root, selector, minimumCount = 1) {
  try {
    return await driver.wait(async () => {
      const elements = await root.findElements(By.css(selector));
      return elements.length >= minimumCount ? elements : false;
    }, 20_000, `Expected at least ${minimumCount} element(s) matching ${selector}.`);
  } catch (error) {
    throw new Error(
      `Could not resolve ${minimumCount} element(s) matching ${selector}.`,
      { cause: error },
    );
  }
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
