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

  if (version !== 'poe1' || !chaosRatios) {
    rows.forEach((row) => clearEquivalentPricings(row));
    return 0;
  }

  let enhancedCount = 0;

  rows.forEach((row) => {
    const price = parsePrice(row);
    if (!price) {
      clearEquivalentPricings(row);
      return;
    }

    let equivalents: HTMLElement[] = [];

    if (
      price.currencySlug === CHAOS_SLUG &&
      typeof chaosRatios[DIVINE_SLUG] === 'number'
    ) {
      equivalents = renderChaosEquivalents(
        price.value,
        chaosRatios[DIVINE_SLUG],
      );
    } else {
      const chaosValue = chaosRatios[price.currencySlug];
      if (typeof chaosValue === 'number') {
        equivalents = renderNonChaosEquivalents(
          price.currencyAlt,
          price.currencyIconUrl,
          price.value,
          chaosValue,
        );
      }
    }

    if (equivalents.length === 0) {
      clearEquivalentPricings(row);
      return;
    }

    reconcileEquivalentPricings(price.container, equivalents);
    enhancedCount++;
  });

  return enhancedCount;
}

function clearEquivalentPricings(row: HTMLElement) {
  row
    .querySelectorAll(`.${EQUIVALENT_CLASS}`)
    .forEach((element) => element.remove());
}

function reconcileEquivalentPricings(
  container: HTMLElement,
  equivalents: HTMLElement[],
) {
  const existing = Array.from(container.children).filter(
    (element): element is HTMLElement =>
      element instanceof HTMLElement && element.classList.contains(EQUIVALENT_CLASS),
  );
  const isUnchanged =
    existing.length === equivalents.length &&
    existing.every((element, index) => element.isEqualNode(equivalents[index]));

  if (isUnchanged) return;

  existing.forEach((element) => element.remove());
  container.append(...equivalents);
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

function renderNonChaosEquivalents(
  currencyAlt: string,
  currencyIconUrl: string,
  currencyValue: number,
  chaosValue: number,
) {
  const chaosEquivalentValue = Math.round(currencyValue * chaosValue);
  if (!chaosEquivalentValue) {
    return [];
  }

  const equivalents = [
    renderEquivalentLine(
      `${chaosEquivalentValue}x`,
      CHAOS_IMAGE_URL,
      'chaos',
      EQUIVALENT_CHAOS_CLASS,
    ),
  ];

  const flooredCurrencyValue = Math.floor(currencyValue);
  if (
    flooredCurrencyValue === 0 ||
    chaosValue < 1 ||
    flooredCurrencyValue === currencyValue
  ) {
    return equivalents;
  }

  const chaosFractionValue = Math.round((currencyValue - flooredCurrencyValue) * chaosValue);
  equivalents.push(
    renderFractionLine(
      `${flooredCurrencyValue}x`,
      currencyIconUrl,
      currencyAlt,
      `${chaosFractionValue}x`,
    ),
  );

  return equivalents;
}

function renderChaosEquivalents(
  currencyValue: number,
  divineChaosValue: number,
) {
  if (currencyValue < NORMALIZED_CURRENCY_THRESHOLD * divineChaosValue) {
    return [];
  }

  const divineEquivalent =
    Math.round((currencyValue / divineChaosValue) * 10) / 10;

  return [
    renderEquivalentLine(
      `${divineEquivalent}x`,
      DIVINE_IMAGE_URL,
      'divine',
      EQUIVALENT_CHAOS_CLASS,
    ),
  ];
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
