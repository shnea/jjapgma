import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
type Props = {
  name: string;
  disabled: boolean;
  busy: boolean;
  error: string;
  onRename: (name: string) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
};

function PageSettingsDialog({
  name,
  busy,
  error,
  onRename,
  onDelete,
  onClose,
}: Omit<Props, 'disabled'> & { onClose: () => void }) {
  const [draft, setDraft] = useState(name);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (await onRename(draft.trim())) onClose();
  }
  return (
    <Dialog className="page-settings-dialog" title="페이지 수정" busy={busy} onClose={onClose}>
      <form onSubmit={(event) => void submit(event)}>
        <label>
          페이지 이름
          <input
            data-dialog-autofocus
            required
            maxLength={100}
            value={draft}
            disabled={busy}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
        <div className="page-settings-actions">
          <Button type="submit" loading={busy} disabled={!draft.trim()}>
            이름 저장
          </Button>
          <Button variant="ghost" disabled={busy} onClick={onClose}>
            취소
          </Button>
        </div>
      </form>
      <div className="page-settings-danger">
        <p>페이지를 목록에서 숨깁니다. 저장된 버전은 삭제된 페이지에서 복원할 수 있습니다.</p>
        <Button
          variant="danger"
          disabled={busy}
          onClick={() => {
            if (
              window.confirm(
                `'${name}' 페이지를 삭제할까요? 저장된 버전은 복원할 수 있지만 저장하지 않은 변경은 남지 않습니다.`,
              )
            )
              void onDelete().then((done) => {
                if (done) onClose();
              });
          }}
        >
          <Trash2 size={15} />
          페이지 삭제
        </Button>
      </div>
    </Dialog>
  );
}
export function PageSettings(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="페이지 수정"
        title="페이지 수정"
        disabled={props.disabled || props.busy}
        onClick={() => setOpen(true)}
      >
        <Pencil size={16} />
      </button>
      {open && <PageSettingsDialog {...props} onClose={() => setOpen(false)} />}
    </>
  );
}
