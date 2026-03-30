import type { PoeNinjaChaosRatios } from '@/src/lib/poeNinja/chaosRatios';
import type { TradePageVersion } from '@/src/content/tradePage';

const CHAOS_IMAGE_URL =
  'https://web.poecdn.com/image/Art/2DItems/Currency/CurrencyRerollRare.png';
const CHAOS_SLUG = 'chaos-orb';
const DIVINE_IMAGE_URL =
  'https://web.poecdn.com/image/Art/2DItems/Currency/CurrencyModValues.png';
const DIVINE_SLUG = 'divine-orb';
const EQUIVALENT_CLASS = 'btff-equivalent-pricings';
const EQUIVALENT_CHAOS_CLASS = 'btff-equivalent-pricings-chaos';
const EQUIVALENT_FRACTION_CLASS = 'btff-equivalent-pricings-chaos-fraction';
const EQUALS_CLASS = 'btff-equivalent-pricings-equals';
const NORMALIZED_CURRENCY_THRESHOLD = 0.5;

interface ParsedPrice {
  container: HTMLElement;
  currencyAlt: string;
  currencyIconUrl: string;
  currencySlug: string;
  value: number;
}

export function applyEquivalentPricings(
  root: ParentNode,
  version: TradePageVersion,
  chaosRatios: PoeNinjaChaosRatios | null,
) {
  const rows = Array.from(
    root.querySelectorAll<HTMLElement>('.resultset > div.row[data-id]'),
  );

  rows.forEach((row) => clearEquivalentPricings(row));

  if (version !== 'poe1' || !chaosRatios) {
    return 0;
  }

  let enhancedCount = 0;

  rows.forEach((row) => {
    const price = parsePrice(row);
    if (!price) return;

    if (
      price.currencySlug === CHAOS_SLUG &&
      typeof chaosRatios[DIVINE_SLUG] === 'number'
    ) {
      if (applyChaosEquivalent(price.container, price.value, chaosRatios[DIVINE_SLUG])) {
        enhancedCount++;
      }
      return;
    }

    const chaosValue = chaosRatios[price.currencySlug];
    if (typeof chaosValue !== 'number') {
      return;
    }

    if (
      applyNonChaosEquivalent(
        price.container,
        price.currencyAlt,
        price.currencyIconUrl,
        price.value,
        chaosValue,
      )
    ) {
      enhancedCount++;
    }
  });

  return enhancedCount;
}

function clearEquivalentPricings(row: HTMLElement) {
  row
    .querySelectorAll(`.${EQUIVALENT_CLASS}`)
    .forEach((element) => element.remove());
}

function parsePrice(row: HTMLElement): ParsedPrice | null {
  const container = row.querySelector<HTMLElement>('.details .price');
  const valueText = row.querySelector<HTMLElement>('[data-field="price"] > br + span')
    ?.textContent;
  const currencyName = row.querySelector<HTMLElement>(
    '[data-field="price"] .currency-text span',
  )?.textContent;
  const currencyImage = row.querySelector<HTMLImageElement>(
    '[data-field="price"] .currency-image img',
  );

  const value = Number.parseFloat(valueText ?? '');
  if (!container || !currencyName || !currencyImage || Number.isNaN(value)) {
    return null;
  }

  return {
    container,
    currencyAlt: currencyImage.alt || currencyName,
    currencyIconUrl: currencyImage.src,
    currencySlug: slugify(currencyName),
    value,
  };
}

function applyNonChaosEquivalent(
  container: HTMLElement,
  currencyAlt: string,
  currencyIconUrl: string,
  currencyValue: number,
  chaosValue: number,
) {
  const chaosEquivalentValue = Math.round(currencyValue * chaosValue);
  if (!chaosEquivalentValue) {
    return false;
  }

  container.append(
    renderEquivalentLine(
      `${chaosEquivalentValue}x`,
      CHAOS_IMAGE_URL,
      'chaos',
      EQUIVALENT_CHAOS_CLASS,
    ),
  );

  const flooredCurrencyValue = Math.floor(currencyValue);
  if (
    flooredCurrencyValue === 0 ||
    chaosValue < 1 ||
    flooredCurrencyValue === currencyValue
  ) {
    return true;
  }

  const chaosFractionValue = Math.round((currencyValue - flooredCurrencyValue) * chaosValue);
  container.append(
    renderFractionLine(
      `${flooredCurrencyValue}x`,
      currencyIconUrl,
      currencyAlt,
      `${chaosFractionValue}x`,
    ),
  );

  return true;
}

function applyChaosEquivalent(
  container: HTMLElement,
  currencyValue: number,
  divineChaosValue: number,
) {
  if (currencyValue < NORMALIZED_CURRENCY_THRESHOLD * divineChaosValue) {
    return false;
  }

  const divineEquivalent =
    Math.round((currencyValue / divineChaosValue) * 10) / 10;

  container.append(
    renderEquivalentLine(
      `${divineEquivalent}x`,
      DIVINE_IMAGE_URL,
      'divine',
      EQUIVALENT_CHAOS_CLASS,
    ),
  );

  return true;
}

function renderEquivalentLine(
  label: string,
  imageUrl: string,
  alt: string,
  extraClass: string,
) {
  const element = document.createElement('span');
  element.className = `${EQUIVALENT_CLASS} ${extraClass}`;
  element.append(createEqualsElement(), document.createTextNode(label));

  const image = document.createElement('img');
  image.alt = alt;
  image.src = imageUrl;
  element.append(image);

  return element;
}

function renderFractionLine(
  flooredValue: string,
  currencyIconUrl: string,
  currencyAlt: string,
  chaosFractionValue: string,
) {
  const element = document.createElement('span');
  element.className = `${EQUIVALENT_CLASS} ${EQUIVALENT_FRACTION_CLASS}`;
  element.append(createEqualsElement(), document.createTextNode(flooredValue));

  const baseImage = document.createElement('img');
  baseImage.alt = currencyAlt;
  baseImage.src = currencyIconUrl;
  element.append(baseImage, document.createTextNode(`+${chaosFractionValue}`));

  const chaosImage = document.createElement('img');
  chaosImage.alt = 'chaos';
  chaosImage.src = CHAOS_IMAGE_URL;
  element.append(chaosImage);

  return element;
}

function createEqualsElement() {
  const equals = document.createElement('span');
  equals.className = EQUALS_CLASS;
  equals.textContent = '=';
  return equals;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^-\w]/g, '');
}
