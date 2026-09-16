import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { Button } from './Button';
import { X } from 'lucide-react';
export function Dialog({
  title,
  busy = false,
  onClose,
  children,
}: {
  title: string;
  busy?: boolean;
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
      className="page-library-dialog"
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header>
        <h2 id={id}>{title}</h2>
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
