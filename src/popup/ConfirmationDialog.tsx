import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';

import { attachTransientScrollbar } from '@/src/lib/ui/transientScrollbar';

interface ConfirmationDialogProps {
  cancelLabel?: string | null;
  confirmLabel: string;
  confirmation: string;
  description: ReactNode;
  disabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  role?: 'alertdialog' | 'dialog';
  title: string;
  tone?: 'danger' | 'notice';
}

export function ConfirmationDialog({
  cancelLabel = 'Cancel',
  confirmLabel,
  confirmation,
  description,
  disabled = false,
  onCancel,
  onConfirm,
  role = 'alertdialog',
  title,
  tone = 'danger',
}: ConfirmationDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    if (!dialog.open) {
      try {
        dialog.showModal();
      } catch {
        dialog.setAttribute('open', '');
      }
    }

    const detachTransientScrollbar = attachTransientScrollbar(dialog);
    (cancelButtonRef.current ?? confirmButtonRef.current)?.focus();

    return () => {
      detachTransientScrollbar();
      if (dialog.open) {
        try {
          dialog.close();
        } catch {
          dialog.removeAttribute('open');
        }
      }

      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, []);

  return (
    <dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      aria-modal="true"
      className="popup-confirmation-dialog"
      data-confirmation={confirmation}
      data-tone={tone}
      onCancel={(event) => {
        event.preventDefault();
        if (!disabled) onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !disabled) onCancel();
      }}
      ref={dialogRef}
      role={role}>
      <div className="popup-confirmation-dialog__surface">
        <h3 id={titleId}>{title}</h3>
        <div
          className="popup-confirmation-dialog__description"
          id={descriptionId}>
          {description}
        </div>
        <div className="popup-confirmation-actions">
          <button
            className={`popup-button popup-button--small ${
              tone === 'danger'
                ? 'popup-button--danger'
                : 'popup-button--secondary'
            }`}
            disabled={disabled}
            onClick={onConfirm}
            ref={confirmButtonRef}
            type="button">
            {confirmLabel}
          </button>
          {cancelLabel ? (
            <button
              className="popup-button popup-button--secondary popup-button--small"
              disabled={disabled}
              onClick={onCancel}
              ref={cancelButtonRef}
              type="button">
              {cancelLabel}
            </button>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
