import { useId } from 'react';

import type { BookmarkColor } from '@/src/features/bookmarks/types';
import {
  BOOKMARK_COLOR_OPTIONS,
  normalizeBookmarkColor,
} from '@/src/lib/bookmarks/nameColors';

interface NameColorPickerProps {
  disabled?: boolean;
  label: string;
  onChange: (value: BookmarkColor | null) => void;
  value: BookmarkColor | null;
}

export function NameColorPicker({
  disabled = false,
  label,
  onChange,
  value,
}: NameColorPickerProps) {
  const groupName = useId();
  const normalizedValue = normalizeBookmarkColor(value);

  return (
    <fieldset
      aria-label={label}
      className="btff-name-color-picker"
      disabled={disabled}>
      <legend>{label}</legend>
      <div className="btff-name-color-picker__options">
        {BOOKMARK_COLOR_OPTIONS.map((option) => {
          const isNeutral = option.value === null;

          return (
            <label
              className="btff-name-color-picker__option"
              key={option.label}
              title={option.label}>
              <input
                aria-label={`${label}: ${option.label}`}
                checked={normalizedValue === option.value}
                name={groupName}
                onChange={() => onChange(option.value)}
                type="radio"
              />
              <span
                aria-hidden="true"
                className={`btff-name-color-picker__swatch${
                  isNeutral ? ' btff-name-color-picker__swatch--neutral' : ''
                }`}
                style={{ backgroundColor: option.hex }}
              />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
