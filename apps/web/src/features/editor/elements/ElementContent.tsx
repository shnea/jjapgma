import type { UiNode, Breakpoint } from '@jjapgma/ui-spec';
import { lazy, Suspense } from 'react';
const RichTextElement = lazy(() =>
  import('./RichTextSurface').then((m) => ({ default: m.RichTextElement })),
);
import { TableElement } from './TableElement';
import { FormElement, formTypes } from './FormElement';
import { NavigationElement, navigationTypes } from './NavigationElement';
import { DataElement, dataTypes } from './DataElement';
import { BasicElement } from './BasicElement';
import { ChatElement } from './ChatElement';
import { MenuElement } from './MenuElement';
import { SearchBox } from './SearchBox';
import { ChartElement } from './ChartElement';
export function ElementContent({
  node,
  breakpoint = 'desktop',
  preview = false,
}: {
  node: UiNode;
  breakpoint?: Breakpoint;
  preview?: boolean;
}) {
  if (node.type === 'richText')
    return (
      <Suspense fallback={<p role="status">본문을 불러오는 중…</p>}>
        <RichTextElement key={node.id} node={node} preview={preview} />
      </Suspense>
    );
  if (node.type === 'table') return <TableElement node={node} breakpoint={breakpoint} />;
  if (node.type === 'chart') return <ChartElement node={node} />;
  if (node.type === 'navbar' && node.props.menuItems)
    return <MenuElement node={node} breakpoint={breakpoint} />;
  if (node.type === 'searchBox') return <SearchBox node={node} breakpoint={breakpoint} />;
  if (node.type === 'chat') return <ChatElement key={node.id} node={node} />;
  if (formTypes.includes(node.type)) return <FormElement node={node} />;
  if (navigationTypes.includes(node.type)) return <NavigationElement node={node} />;
  if (dataTypes.includes(node.type)) return <DataElement node={node} />;
  return <BasicElement key={`${node.id}-${node.props.src ?? ''}`} node={node} />;
}
