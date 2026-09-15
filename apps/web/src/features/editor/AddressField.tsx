import { useEffect, useState } from 'react';
import { propsSchema } from '@jjapgma/ui-spec';
export function AddressField({
  field,
  label,
  value,
  onCommit,
}: {
  field: 'src' | 'href';
  label: string;
  value: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState(false);
  useEffect(() => {
    setDraft(value);
    setError(false);
  }, [value]);
  return (
    <>
      <span>{label}</span>
      <input
        value={draft}
        maxLength={2000}
        aria-invalid={error}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const valid = propsSchema.shape[field].safeParse(draft).success;
          setError(!valid);
          if (valid) onCommit(draft);
        }}
      />
      {error && (
        <small className="error-text">
          {field === 'src'
            ? '/로 시작하는 사이트 내 이미지 경로를 입력하세요.'
            : '사이트 내 경로, #위치 또는 http/https 주소를 입력하세요.'}
        </small>
      )}
    </>
  );
}
