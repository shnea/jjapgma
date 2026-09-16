import { Fragment, useEffect, useRef, useState } from 'react';
import { LayoutTemplate, Plus, Trash2 } from 'lucide-react';
import { createTemplate, pageTemplates, type UiSpec } from '@jjapgma/ui-spec';
import { api, errorMessage } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { PagePreview } from './PagePreview';
import { TemplateFilters } from './TemplateFilters';

type PersonalTemplate = { id: string; name: string; created_at: string };
type Preview = { id: string; name: string; spec: UiSpec; personal: boolean };
export function TemplatePanel({
  spec,
  pageId,
  pageName,
  projectId,
  disabled = false,
  insertDisabled = false,
  targetName,
  onInsert,
}: {
  spec: UiSpec;
  pageId: string;
  pageName: string;
  projectId: string;
  disabled?: boolean;
  insertDisabled?: boolean;
  targetName: string;
  onInsert: (spec: UiSpec, name: string, edgeToEdge?: boolean) => boolean;
}) {
  const [scope, setScope] = useState<'official' | 'personal'>('official');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('전체');
  const [items, setItems] = useState<PersonalTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview>();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [deleting, setDeleting] = useState<PersonalTemplate>();
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    if (scope !== 'personal') return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void api<PersonalTemplate[]>('/templates', { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) setItems(value);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorMessage(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [scope, retry]);

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (e) {
      if (active.current) setError(errorMessage(e));
    } finally {
      if (active.current) setBusy(false);
    }
  }
  async function openPersonal(item: PersonalTemplate) {
    await run(async () => {
      const value = await api<PersonalTemplate & { spec: UiSpec }>(`/templates/${item.id}`);
      if (active.current) setPreview({ ...value, personal: true });
    });
  }
  async function insert() {
    if (!preview || disabled || insertDisabled) return;
    await run(async () => {
      const value = preview.personal
        ? await api<{ spec: UiSpec }>(`/templates/${preview.id}/use`, {
            method: 'POST',
            body: JSON.stringify({ projectId }),
          })
        : preview;
      if (
        active.current &&
        onInsert(value.spec, preview.name, !preview.personal && preview.id === 'main')
      ) {
        setPreview(undefined);
        setNotice('템플릿을 추가했습니다. 실행 취소로 되돌릴 수 있습니다.');
      }
    });
  }
  const search = query.trim().toLocaleLowerCase();
  const official = pageTemplates.filter(
    (item) =>
      (category === '전체' || item.category === category) &&
      `${item.id} ${item.name} ${item.category} ${item.description}`
        .toLocaleLowerCase()
        .includes(search),
  );
  const personal = items.filter((item) => item.name.toLocaleLowerCase().includes(search));
  const dialogOpen = !!preview || saving || !!deleting;
  return (
    <section className="template-panel" aria-label="템플릿 라이브러리">
      <div className="template-scopes" role="group" aria-label="템플릿 종류">
        <button
          aria-pressed={scope === 'official'}
          disabled={busy}
          onClick={() => {
            setScope('official');
            setError('');
            setNotice('');
          }}
        >
          공식 템플릿
        </button>
        <button
          aria-pressed={scope === 'personal'}
          disabled={busy}
          onClick={() => {
            setScope('personal');
            setNotice('');
          }}
        >
          내 템플릿
        </button>
      </div>
      {scope === 'official' ? (
        <TemplateFilters
          query={query}
          category={category}
          onQuery={setQuery}
          onCategory={setCategory}
        />
      ) : (
        <input
          type="search"
          aria-label="템플릿 검색"
          placeholder="템플릿 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}
      {scope === 'personal' ? (
        <>
          <Button
            variant="secondary"
            disabled={disabled || busy}
            onClick={() => {
              setName(pageName);
              setSaving(true);
              setError('');
            }}
          >
            <Plus size={14} /> 현재 화면 저장
          </Button>
          <p className="template-help">
            나만 볼 수 있는 템플릿입니다. 다른 프로젝트에서도 다시 사용할 수 있습니다.
          </p>
        </>
      ) : (
        <p className="template-help">미리보기로 살펴보고 선택한 영역에 추가하세요.</p>
      )}
      {loading && scope === 'personal' ? (
        <p role="status">템플릿을 불러오는 중…</p>
      ) : (
        <div className="template-list">
          {scope === 'official'
            ? official.map((item, index) => (
                <Fragment key={item.id}>
                  {(index === 0 || official[index - 1].category !== item.category) && (
                    <h3 className="template-group-title">
                      {item.category}
                      <span>{official.filter((v) => v.category === item.category).length}</span>
                    </h3>
                  )}
                  <article className="template-card">
                    <div className="template-card-title">
                      <LayoutTemplate size={18} />
                      <span>{item.category}</span>
                    </div>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    <Button
                      variant="secondary"
                      disabled={busy}
                      aria-label={`${item.name} 미리보기`}
                      onClick={() => {
                        setError('');
                        setPreview({ ...item, spec: createTemplate(item.id), personal: false });
                      }}
                    >
                      미리보기
                    </Button>
                  </article>
                </Fragment>
              ))
            : personal.map((item) => (
                <article className="template-card" key={item.id}>
                  <div className="template-card-title">
                    <LayoutTemplate size={18} />
                    <span>내 템플릿</span>
                  </div>
                  <h3>{item.name}</h3>
                  <div className="template-card-actions">
                    <Button
                      variant="secondary"
                      disabled={busy}
                      aria-label={`${item.name} 미리보기`}
                      onClick={() => void openPersonal(item)}
                    >
                      미리보기
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy}
                      aria-label={`${item.name} 템플릿 삭제`}
                      onClick={() => {
                        setError('');
                        setDeleting(item);
                      }}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </article>
              ))}
          {!(scope === 'official' ? official : personal).length && (
            <p className="template-help">
              {search
                ? '검색 결과가 없습니다.'
                : '저장한 템플릿이 없습니다. 자주 쓰는 화면을 저장해 보세요.'}
            </p>
          )}
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      {!dialogOpen && error && (
        <div role="alert">
          <p>{error}</p>
          {scope === 'personal' && (
            <Button variant="ghost" onClick={() => setRetry((value) => value + 1)}>
              다시 불러오기
            </Button>
          )}
        </div>
      )}
      {preview && (
        <Dialog
          title={`${preview.name} 미리보기`}
          busy={busy}
          onClose={() => {
            setPreview(undefined);
            setError('');
          }}
        >
          <PagePreview spec={preview.spec} templateId={preview.personal ? preview.id : undefined} />
          <p className="template-help">
            {targetName}에 묶음으로 추가합니다. 기존 내용과 페이지 테마는 유지됩니다.
          </p>
          {error && <p role="alert">{error}</p>}
          {(disabled || insertDisabled) && <p>편집 가능한 영역을 선택하면 추가할 수 있습니다.</p>}
          <div className="dialog-actions">
            <Button
              variant="primary"
              loading={busy}
              disabled={disabled || insertDisabled}
              onClick={() => void insert()}
            >
              화면에 추가
            </Button>
          </div>
        </Dialog>
      )}
      {saving && (
        <Dialog
          title="내 템플릿으로 저장"
          busy={busy}
          onClose={() => {
            setSaving(false);
            setError('');
          }}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (disabled || !name.trim()) return;
              void run(async () => {
                const item = await api<PersonalTemplate>('/templates', {
                  method: 'POST',
                  body: JSON.stringify({ name: name.trim(), sourcePageId: pageId, spec }),
                });
                if (active.current) {
                  setItems((values) => [item, ...values]);
                  setSaving(false);
                  setQuery('');
                  setNotice('내 템플릿에 저장했습니다.');
                }
              });
            }}
          >
            <label className="template-name">
              템플릿 이름
              <input
                data-dialog-autofocus
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <p className="template-help">
              현재 편집 중인 화면 전체와 이미지를 복사해 저장합니다. 이후 원본 수정이나 삭제에
              영향을 받지 않습니다.
            </p>
            {error && <p role="alert">{error}</p>}
            <div className="dialog-actions">
              <Button
                type="submit"
                variant="primary"
                loading={busy}
                disabled={disabled || !name.trim()}
              >
                템플릿 저장
              </Button>
            </div>
          </form>
        </Dialog>
      )}
      {deleting && (
        <Dialog
          title="내 템플릿 삭제"
          busy={busy}
          onClose={() => {
            setDeleting(undefined);
            setError('');
          }}
        >
          <p>“{deleting.name}” 템플릿을 삭제할까요? 이미 추가한 페이지는 유지됩니다.</p>
          {error && <p role="alert">{error}</p>}
          <div className="dialog-actions">
            <Button
              variant="danger"
              loading={busy}
              onClick={() =>
                void run(async () => {
                  await api(`/templates/${deleting.id}`, { method: 'DELETE' });
                  if (active.current) {
                    setItems((values) => values.filter((item) => item.id !== deleting.id));
                    setDeleting(undefined);
                    setNotice('템플릿을 삭제했습니다.');
                  }
                })
              }
            >
              템플릿 삭제
            </Button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
