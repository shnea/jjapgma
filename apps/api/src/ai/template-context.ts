import { createTemplate, pageTemplates, type UiNode } from '@jjapgma/ui-spec';

// MCP template inspection and creation must use the same IDs so subsequent operations
// can update/move/remove existing template elements. IDs remain local to each page.
export function createMcpTemplate(templateId: string) {
  const spec = createTemplate(templateId);
  const ids = new Map<string, string>();
  let sequence = 0;
  const assign = (node: UiNode, root = false) => {
    const id = root ? 'page-root' : `template-${templateId}-${++sequence}`;
    ids.set(node.id, id);
    node.id = id;
    node.children.forEach((child) => assign(child));
  };
  assign(spec.root, true);
  const remap = (node: UiNode) => {
    const action = node.props.overlayAction;
    if (node.props.searchTargetId && ids.has(node.props.searchTargetId))
      node.props.searchTargetId = ids.get(node.props.searchTargetId);
    if (action?.targetId && ids.has(action.targetId)) action.targetId = ids.get(action.targetId);
    node.children.forEach(remap);
  };
  remap(spec.root);
  return spec;
}

export function templateCatalog() {
  return pageTemplates.map((template) => ({
    ...template,
    sections: createMcpTemplate(template.id).root.children.map((node) => ({
      type: node.type,
      text: node.props.text.slice(0, 60),
      childTypes: [...new Set(node.children.map((child) => child.type))],
    })),
  }));
}
