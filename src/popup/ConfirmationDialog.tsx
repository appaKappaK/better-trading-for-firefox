import { useId, useLayoutEffect, useRef } from 'react';

interface ConfirmationDialogProps {
  confirmLabel: string;
  confirmation: string;
  description: string;
  disabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}

export function ConfirmationDialog({
  confirmLabel,
  confirmation,
  description,
  disabled = false,
  onCancel,
  onConfirm,
  title,
}: ConfirmationDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
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

    cancelButtonRef.current?.focus();

    return () => {
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
      onCancel={(event) => {
        event.preventDefault();
        if (!disabled) onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !disabled) onCancel();
      }}
      ref={dialogRef}
      role="alertdialog">
      <div className="popup-confirmation-dialog__surface">
        <h3 id={titleId}>{title}</h3>
        <p id={descriptionId}>{description}</p>
        <div className="popup-confirmation-actions">
          <button
            className="popup-button popup-button--danger popup-button--small"
            disabled={disabled}
            onClick={onConfirm}
            type="button">
            {confirmLabel}
          </button>
          <button
            className="popup-button popup-button--secondary popup-button--small"
            disabled={disabled}
            onClick={onCancel}
            ref={cancelButtonRef}
            type="button">
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  );
}
