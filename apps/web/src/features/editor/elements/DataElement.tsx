import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from 'lucide-react';
import type { UiNode } from '@jjapgma/ui-spec';

export const dataTypes = [
  'table',
  'list',
  'descriptionList',
  'badge',
  'avatar',
  'accordion',
  'jsonViewer',
  // legacy fallback
  'keyValue',
  'chip',
];

function PaginationControl({
  mode,
  design,
  page,
  total,
  onPageChange,
}: {
  mode?: 'none' | 'pagination' | 'infinite';
  design?: 'numbered' | 'compact' | 'simple';
  page: number;
  total: number;
  onPageChange: (p: number) => void;
}) {
  if (mode === 'infinite') {
    return (
      <div className="element-infinite-sentinel">
        <Loader2 size={16} className="spin" />
        <span>항목을 더 불러오는 중…</span>
      </div>
    );
  }
  if (mode !== 'pagination') return null;

  const currentDesign = design ?? 'numbered';

  if (currentDesign === 'compact') {
    return (
      <div className="element-pagination">
        <button
          type="button"
          disabled={page <= 1}
          onClick={(e) => {
            e.stopPropagation();
            onPageChange(Math.max(1, page - 1));
          }}
          aria-label="이전 페이지"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="page-info">
          {page} / {total}
        </span>
        <button
          type="button"
          disabled={page >= total}
          onClick={(e) => {
            e.stopPropagation();
            onPageChange(Math.min(total, page + 1));
          }}
          aria-label="다음 페이지"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  if (currentDesign === 'simple') {
    return (
      <div className="element-pagination">
        <button
          type="button"
          disabled={page <= 1}
          onClick={(e) => {
            e.stopPropagation();
            onPageChange(Math.max(1, page - 1));
          }}
        >
          이전
        </button>
        <span className="page-info">{page} 페이지</span>
        <button
          type="button"
          disabled={page >= total}
          onClick={(e) => {
            e.stopPropagation();
            onPageChange(Math.min(total, page + 1));
          }}
        >
          다음
        </button>
      </div>
    );
  }

  // default: numbered
  return (
    <div className="element-pagination">
      <button
        type="button"
        disabled={page <= 1}
        onClick={(e) => {
          e.stopPropagation();
          onPageChange(1);
        }}
        title="처음으로"
        aria-label="처음으로"
      >
        <ChevronsLeft size={15} />
      </button>
      <button
        type="button"
        disabled={page <= 1}
        onClick={(e) => {
          e.stopPropagation();
          onPageChange(Math.max(1, page - 1));
        }}
        title="이전 페이지"
        aria-label="이전 페이지"
      >
        <ChevronLeft size={15} />
      </button>
      {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          type="button"
          className={page === p ? 'active' : ''}
          onClick={(e) => {
            e.stopPropagation();
            onPageChange(p);
          }}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        disabled={page >= total}
        onClick={(e) => {
          e.stopPropagation();
          onPageChange(Math.min(total, page + 1));
        }}
        title="다음 페이지"
        aria-label="다음 페이지"
      >
        <ChevronRight size={15} />
      </button>
      <button
        type="button"
        disabled={page >= total}
        onClick={(e) => {
          e.stopPropagation();
          onPageChange(total);
        }}
        title="끝으로"
        aria-label="끝으로"
      >
        <ChevronsRight size={15} />
      </button>
    </div>
  );
}

export function DataElement({ node }: { node: UiNode }) {
  const [page, setPage] = useState(1);
  const items = (node.props.items ?? '').split('\n').filter(Boolean);

  switch (node.type as string) {
    case 'table': {
      const showHeader = node.props.showHeader !== false;
      const [header = '', ...rows] = items;
      const pageSize = node.props.paginationMode === 'pagination' ? 3 : rows.length || 1;
      const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
      const displayedRows =
        node.props.paginationMode === 'pagination'
          ? rows.slice((page - 1) * pageSize, page * pageSize)
          : rows;

      return (
        <div className="element-table-wrapper">
          <div className="element-table-scroll">
            <table>
              {node.props.text && <caption>{node.props.text}</caption>}
              {showHeader && (
                <thead>
                  <tr>
                    {header.split('|').map((cell, i) => (
                      <th scope="col" key={i}>
                        {cell}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {displayedRows.map((row, i) => (
                  <tr key={i}>
                    {row.split('|').map((cell, j) => (
                      <td key={j}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControl
            mode={node.props.paginationMode}
            design={node.props.paginationDesign}
            page={page}
            total={totalPages}
            onPageChange={setPage}
          />
        </div>
      );
    }
    case 'list': {
      const showHeader = Boolean(node.props.showHeader);
      const [header = '', ...bodyItems] = showHeader ? items : ['', ...items];
      const listItems = showHeader ? bodyItems : items;
      const pageSize = node.props.paginationMode === 'pagination' ? 4 : listItems.length || 1;
      const totalPages = Math.max(1, Math.ceil(listItems.length / pageSize));
      const displayedItems =
        node.props.paginationMode === 'pagination'
          ? listItems.slice((page - 1) * pageSize, page * pageSize)
          : listItems;

      return (
        <div className="element-list-wrapper">
          {showHeader && (
            <div className="element-list-header" style={{ fontWeight: 600, marginBottom: 8 }}>
              {header}
            </div>
          )}
          <ul className="element-list">
            {displayedItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          <PaginationControl
            mode={node.props.paginationMode}
            design={node.props.paginationDesign}
            page={page}
            total={totalPages}
            onPageChange={setPage}
          />
        </div>
      );
    }
    case 'descriptionList':
    case 'keyValue':
      return (
        <dl className="element-description">
          {items.map((item, i) => {
            const [term, ...details] = item.split('|');
            return (
              <div key={i}>
                <dt>{term}</dt>
                <dd>{details.join(' | ') || '—'}</dd>
              </div>
            );
          })}
        </dl>
      );
    case 'accordion':
      return (
        <div className="element-accordion">
          {items.map((item, i) => (
            <details key={i}>
              <summary>{item}</summary>
              <p>{node.props.text}</p>
            </details>
          ))}
        </div>
      );
    case 'avatar':
      return (
        <span className="element-avatar" role="img" aria-label={node.props.text}>
          {node.props.text.slice(0, 2)}
        </span>
      );
    case 'badge':
    case 'chip': {
      const isPill = (node.type as string) === 'chip' || node.props.shape === 'pill';
      return (
        <span className={`element-badge ${isPill ? 'shape-pill' : 'shape-rounded'}`}>
          {node.props.text}
        </span>
      );
    }
    case 'jsonViewer': {
      let text = node.props.text;
      try {
        text = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        /* Preserve invalid JSON visibly for correction. */
      }
      return (
        <pre className="element-json">
          <code>{text}</code>
        </pre>
      );
    }
    default:
      throw new Error(`지원하지 않는 데이터 요소: ${node.type}`);
  }
}
