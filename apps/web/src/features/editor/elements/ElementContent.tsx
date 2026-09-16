import type { UiNode, Breakpoint } from '@jjapgma/ui-spec';
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
}: {
  node: UiNode;
  breakpoint?: Breakpoint;
}) {
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
