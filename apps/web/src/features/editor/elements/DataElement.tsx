import { useState } from 'react';
import { PaginationControl } from './PaginationControl';
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

export function DataElement({ node }: { node: UiNode }) {
  const [page, setPage] = useState(1);
  const items = (node.props.items ?? '').split('\n').filter(Boolean);

  switch (node.type as string) {
    case 'list': {
      const showHeader = Boolean(node.props.showHeader);
      const [header = '', ...bodyItems] = showHeader ? items : ['', ...items];
      const listItems = showHeader ? bodyItems : items;
      const pageSize =
        node.props.paginationMode === 'pagination'
          ? (node.props.pageSize ?? 4)
          : listItems.length || 1;
      const totalPages = Math.max(1, Math.ceil(listItems.length / pageSize));
      const currentPage = Math.min(page, totalPages);
      const displayedItems =
        node.props.paginationMode === 'pagination'
          ? listItems.slice((currentPage - 1) * pageSize, currentPage * pageSize)
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
            page={currentPage}
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
