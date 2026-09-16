import { useState } from 'react';
import { pageTemplates } from '@jjapgma/ui-spec';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { TemplatePicker } from './TemplatePicker';
export function CreatePageDialog({
  busy,
  error,
  onCreate,
  onClose,
}: {
  busy: boolean;
  error: string;
  onCreate: (name: string, templateId?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [templateId, setTemplate] = useState('');
  return (
    <Dialog title="새 페이지 만들기" busy={busy} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onCreate(name.trim(), templateId || undefined);
        }}
      >
        <label className="library-name">
          새 페이지
          <input
            autoFocus
            data-dialog-autofocus
            required
            maxLength={100}
            value={name}
            disabled={busy}
            placeholder="페이지 이름"
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <TemplatePicker
          value={templateId}
          disabled={busy}
          onChange={(id) => {
            const previousName = pageTemplates.find((item) => item.id === templateId)?.name;
            if (!name || name === previousName)
              setName(pageTemplates.find((item) => item.id === id)?.name ?? '');
            setTemplate(id);
          }}
        />
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
        <footer>
          <Button type="submit" loading={busy} disabled={!name.trim()}>
            페이지 만들기
          </Button>
          <Button variant="ghost" disabled={busy} onClick={onClose}>
            취소
          </Button>
        </footer>
      </form>
    </Dialog>
  );
}
