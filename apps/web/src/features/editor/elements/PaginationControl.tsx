import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from 'lucide-react';

export function PaginationControl({
  mode = 'pagination',
  design = 'numbered',
  page,
  total,
  onPageChange,
}: {
  mode?: 'none' | 'pagination' | 'infinite';
  design?: 'numbered' | 'compact' | 'simple';
  page: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (mode === 'none') return null;
  if (mode === 'infinite')
    return (
      <div className="element-infinite-sentinel">
        <Loader2 size={16} className="spin" />
        <span>항목을 더 불러오는 중…</span>
      </div>
    );
  const count = Math.max(1, total),
    current = Math.min(Math.max(1, page), count);
  const start = Math.max(1, Math.min(current - 2, count - 4));
  const pages = Array.from({ length: Math.min(5, count) }, (_, i) => start + i);
  const change = (value: number) => onPageChange(Math.min(count, Math.max(1, value)));
  return (
    <nav className="pagination-control" aria-label="페이지 탐색">
      <div className="pagination-layout">
        <div className="pagination-arrows">
          <button
            className="pagination-edge"
            type="button"
            aria-label="처음으로"
            disabled={current === 1}
            onClick={() => change(1)}
          >
            <ChevronsLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="이전 페이지"
            disabled={current === 1}
            onClick={() => change(current - 1)}
          >
            <ChevronLeft size={16} />
          </button>
        </div>
        <div className="pagination-center">
          {design === 'numbered' && (
            <div className="pagination-numbers">
              {pages.map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={n + ' 페이지'}
                  aria-current={n === current ? 'page' : undefined}
                  onClick={() => change(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
          <span
            className={
              design === 'numbered' ? 'pagination-summary numbered-summary' : 'pagination-summary'
            }
            aria-live="polite"
          >
            {current} / {count}
            {design === 'simple' ? ' 페이지' : ''}
          </span>
        </div>
        <div className="pagination-arrows">
          <button
            type="button"
            aria-label="다음 페이지"
            disabled={current === count}
            onClick={() => change(current + 1)}
          >
            <ChevronRight size={16} />
          </button>
          <button
            className="pagination-edge"
            type="button"
            aria-label="끝으로"
            disabled={current === count}
            onClick={() => change(count)}
          >
            <ChevronsRight size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
}
