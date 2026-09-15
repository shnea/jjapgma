import { useState } from 'react';
import type { UiNode } from '@jjapgma/ui-spec';
import { PaginationControl } from './PaginationControl';
export const navigationTypes = [
  'navbar',
  'menu',
  'tabs',
  'breadcrumb',
  'pagination',
  'stepper',
  'bottomNavigation',
];
export function NavigationElement({ node }: { node: UiNode }) {
  const [active, setActive] = useState(0);
  if (node.type === 'pagination')
    return (
      <PaginationControl
        page={active + 1}
        total={node.props.pageCount ?? 5}
        design={node.props.paginationDesign}
        onPageChange={(p) => setActive(p - 1)}
      />
    );
  const items = (node.props.items ?? '').split('\n').filter(Boolean);
  if (node.type === 'breadcrumb')
    return (
      <nav aria-label={node.props.text}>
        <ol className="element-breadcrumb">
          {items.map((item, index) => (
            <li key={index}>
              <span aria-current={index === items.length - 1 ? 'page' : undefined}>{item}</span>
            </li>
          ))}
        </ol>
      </nav>
    );
  if (node.type === 'tabs')
    return (
      <div>
        <div role="tablist" aria-label={node.props.text} className="element-tabs">
          {items.map((item, index) => (
            <button
              key={index}
              role="tab"
              id={`${node.id}-tab-${index}`}
              aria-controls={`${node.id}-panel`}
              aria-selected={active === index}
              tabIndex={active === index ? 0 : -1}
              onClick={() => setActive(index)}
              onKeyDown={(e) => {
                let next = index;
                if (e.key === 'ArrowRight') next = (index + 1) % items.length;
                else if (e.key === 'ArrowLeft') next = (index + items.length - 1) % items.length;
                else if (e.key === 'Home') next = 0;
                else if (e.key === 'End') next = items.length - 1;
                else return;
                e.preventDefault();
                setActive(next);
                document.getElementById(`${node.id}-tab-${next}`)?.focus();
              }}
            >
              {item}
            </button>
          ))}
        </div>
        <div
          role="tabpanel"
          id={`${node.id}-panel`}
          aria-labelledby={`${node.id}-tab-${active}`}
          className="element-tab-content"
        >
          {items[active]} · {node.props.text}
        </div>
      </div>
    );
  return (
    <nav aria-label={node.props.text} className={`element-nav element-nav-${node.type}`}>
      {items.map((item, index) => (
        <button
          key={index}
          aria-current={active === index ? (node.type === 'stepper' ? 'step' : 'page') : undefined}
          onClick={() => setActive(index)}
        >
          {node.type === 'stepper' && <span>{index + 1}</span>}
          {item}
        </button>
      ))}
    </nav>
  );
}
