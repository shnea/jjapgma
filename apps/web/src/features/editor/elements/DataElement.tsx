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
  const items = (node.props.items ?? '').split('\n').filter(Boolean);
  switch (node.type) {
    case 'table': {
      const [header = '', ...rows] = items;
      return (
        <div className="element-table-scroll">
          <table>
            <caption>{node.props.text}</caption>
            <thead>
              <tr>
                {header.split('|').map((cell, i) => (
                  <th scope="col" key={i}>
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {row.split('|').map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case 'list':
      return (
        <ul className="element-list">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
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
      const isPill = node.type === 'chip' || node.props.shape === 'pill';
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
