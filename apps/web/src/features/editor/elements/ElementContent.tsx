import type { UiNode } from '@jjapgma/ui-spec';
import { FormElement, formTypes } from './FormElement';
import { NavigationElement, navigationTypes } from './NavigationElement';
import { DataElement, dataTypes } from './DataElement';
import { BasicElement } from './BasicElement';
export function ElementContent({ node }: { node: UiNode }) {
  if (formTypes.includes(node.type)) return <FormElement node={node} />;
  if (navigationTypes.includes(node.type)) return <NavigationElement node={node} />;
  if (dataTypes.includes(node.type)) return <DataElement node={node} />;
  return <BasicElement key={`${node.id}-${node.props.src ?? ''}`} node={node} />;
}
