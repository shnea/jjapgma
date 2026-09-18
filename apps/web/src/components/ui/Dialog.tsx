import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { Button } from './Button';
import { X } from 'lucide-react';
export function Dialog({
  title,
  busy = false,
  className = 'page-library-dialog',
  description,
  onClose,
  children,
}: {
  title: string;
  busy?: boolean;
  className?: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = ref.current!;
    const trigger = document.activeElement as HTMLElement | null;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-dialog-autofocus]')?.focus();
    return () => {
      dialog.close();
      trigger?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`app-dialog ${className}`}
      aria-labelledby={id}
      aria-describedby={description ? `${id}-description` : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header>
        <div>
          <h2 id={id}>{title}</h2>
          {description && <p id={`${id}-description`}>{description}</p>}
        </div>
        <Button
          variant="ghost"
          className="modal-close-btn"
          aria-label="닫기"
          disabled={busy}
          onClick={onClose}
        >
          <X size={18} />
        </Button>
      </header>
      {children}
    </dialog>
  );
}
