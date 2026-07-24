import { useEffect, useRef, useState } from 'react';

import {
  FOLDER_ICON_OPTIONS,
  getFolderIconImageUrl,
  getFolderIconLabel,
  normalizeFolderIconSlug,
} from '@/src/lib/bookmarks/folderIcons';

interface FolderIconProps {
  fallbackClassName: string;
  imageClassName: string;
  label: string;
  slug: string;
}

export function FolderIcon({
  fallbackClassName,
  imageClassName,
  label,
  slug,
}: FolderIconProps) {
  const imageUrl = getFolderIconImageUrl(slug);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);

  if (imageUrl && failedImageUrl !== imageUrl) {
    return (
      <img
        alt=""
        aria-hidden="true"
        className={imageClassName}
        onError={() => setFailedImageUrl(imageUrl)}
        src={imageUrl}
        title={label}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={fallbackClassName}
      title={label}>
      {buildFolderIconMonogram(label)}
    </span>
  );
}

interface FolderIconPickerProps {
  disabled?: boolean;
  onChange: (value: string | null) => void;
  value: string | null;
}

export function FolderIconPicker({
  disabled = false,
  onChange,
  value,
}: FolderIconPickerProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const selectedButtonRef = useRef<HTMLButtonElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const normalizedValue = normalizeFolderIconSlug(value);
  const selectedOption = FOLDER_ICON_OPTIONS.find(
    (option) => option.slug === normalizedValue,
  );
  const importedLabel = value && !selectedOption ? getFolderIconLabel(value) : null;
  const currentLabel = selectedOption
    ? `${selectedOption.group} — ${selectedOption.label}`
    : importedLabel
      ? `Imported — ${importedLabel}`
      : 'None';

  useEffect(() => {
    if (disabled && detailsRef.current) {
      detailsRef.current.open = false;
    }
  }, [disabled]);

  function chooseIcon(nextValue: string | null) {
    if (disabled) return;

    if (nextValue !== value) {
      onChange(nextValue);
    }

    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
    summaryRef.current?.focus();
  }

  return (
    <details
      aria-disabled={disabled}
      className="btff-folder-icon-picker"
      data-disabled={disabled}
      name="btff-folder-icon-picker"
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !event.currentTarget.open) return;
        event.preventDefault();
        event.currentTarget.open = false;
        summaryRef.current?.focus();
      }}
      onToggle={(event) => {
        if (disabled && event.currentTarget.open) {
          event.currentTarget.open = false;
          return;
        }

        if (event.currentTarget.open) {
          queueMicrotask(() => {
            const options = optionsRef.current;
            const selectedButton = selectedButtonRef.current;
            if (options && selectedButton) {
              centerSelectedFolderIcon(options, selectedButton);
            }

            if (detailsRef.current) {
              revealFolderIconPicker(detailsRef.current);
            }
          });
        }
      }}
      ref={detailsRef}>
      <summary
        aria-label={`Folder icon: ${currentLabel}`}
        className="btff-folder-icon-picker__summary"
        onClick={(event) => {
          if (disabled) event.preventDefault();
        }}
        onKeyDown={(event) => {
          if (disabled && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
          }
        }}
        ref={summaryRef}
        tabIndex={disabled ? -1 : undefined}>
        <span className="btff-folder-icon-picker__current">
          {value ? (
            <FolderIcon
              fallbackClassName="btff-folder-icon-picker__icon btff-folder-icon-picker__icon--fallback"
              imageClassName="btff-folder-icon-picker__icon"
              label={selectedOption?.label ?? importedLabel ?? value}
              slug={value}
            />
          ) : (
            <span
              aria-hidden="true"
              className="btff-folder-icon-picker__icon btff-folder-icon-picker__icon--none">
              —
            </span>
          )}
          <span className="btff-folder-icon-picker__current-label">
            {currentLabel}
          </span>
        </span>
        <span aria-hidden="true" className="btff-folder-icon-picker__chevron">
          ▼
        </span>
      </summary>

      <div
        aria-label="Folder icon choices"
        className="btff-folder-icon-picker__options"
        ref={optionsRef}
        role="group">
        <button
          aria-pressed={value === null}
          className="btff-folder-icon-picker__option"
          disabled={disabled}
          onClick={() => chooseIcon(null)}
          ref={value === null ? selectedButtonRef : undefined}
          type="button">
          <span
            aria-hidden="true"
            className="btff-folder-icon-picker__icon btff-folder-icon-picker__icon--none">
            —
          </span>
          <span>None</span>
        </button>
        {importedLabel && value ? (
          <button
            aria-pressed="true"
            className="btff-folder-icon-picker__option"
            disabled={disabled}
            onClick={() => chooseIcon(value)}
            ref={selectedButtonRef}
            type="button">
            <FolderIcon
              fallbackClassName="btff-folder-icon-picker__icon btff-folder-icon-picker__icon--fallback"
              imageClassName="btff-folder-icon-picker__icon"
              label={importedLabel}
              slug={value}
            />
            <span className="btff-folder-icon-picker__option-copy">
              <strong>{importedLabel}</strong>
              <small>Imported</small>
            </span>
          </button>
        ) : null}
        {FOLDER_ICON_OPTIONS.map((option) => (
          <button
            aria-pressed={normalizedValue === option.slug}
            className="btff-folder-icon-picker__option"
            disabled={disabled}
            key={option.slug}
            onClick={() => chooseIcon(option.slug)}
            ref={
              normalizedValue === option.slug ? selectedButtonRef : undefined
            }
            type="button">
            <FolderIcon
              fallbackClassName="btff-folder-icon-picker__icon btff-folder-icon-picker__icon--fallback"
              imageClassName="btff-folder-icon-picker__icon"
              label={option.label}
              slug={option.slug}
            />
            <span className="btff-folder-icon-picker__option-copy">
              <strong>{option.label}</strong>
              <small>{option.group}</small>
            </span>
          </button>
        ))}
      </div>
    </details>
  );
}

function centerSelectedFolderIcon(
  options: HTMLElement,
  selectedButton: HTMLElement,
) {
  const optionsRect = options.getBoundingClientRect();
  const selectedRect = selectedButton.getBoundingClientRect();
  const selectedTop =
    selectedRect.top - optionsRect.top + options.scrollTop;
  const centeredTop =
    selectedTop - options.clientHeight / 2 + selectedRect.height / 2;

  options.scrollTop = Math.max(centeredTop, 0);
}

export function revealFolderIconPicker(details: HTMLElement) {
  const viewport = details.closest<HTMLElement>(
    '.popup-shell, .btff-panel__scroll-area',
  );
  if (!viewport) return;

  const viewportRect = viewport.getBoundingClientRect();
  const detailsRect = details.getBoundingClientRect();
  const inset = 8;
  const visibleTop = viewportRect.top + inset;
  const visibleBottom = viewportRect.bottom - inset;
  const availableHeight = visibleBottom - visibleTop;
  let scrollDelta = 0;

  if (detailsRect.height > availableHeight) {
    scrollDelta = detailsRect.top - visibleTop;
  } else if (detailsRect.bottom > visibleBottom) {
    scrollDelta = detailsRect.bottom - visibleBottom;
  } else if (detailsRect.top < visibleTop) {
    scrollDelta = detailsRect.top - visibleTop;
  }

  if (scrollDelta !== 0) {
    viewport.scrollTop += scrollDelta;
  }
}

function buildFolderIconMonogram(label: string) {
  const words = label
    .split(/\s+/u)
    .map((word) => word.replace(/[^a-z0-9]/giu, ''))
    .filter((word) => word && word.toLowerCase() !== 'of');

  if (words.length >= 2) {
    return `${words[0][0]}${words.at(-1)?.[0] ?? ''}`.toUpperCase();
  }

  return (words[0]?.slice(0, 2) || 'BT').toUpperCase();
}
