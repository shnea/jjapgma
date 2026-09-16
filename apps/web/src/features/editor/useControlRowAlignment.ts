import { useLayoutEffect, useRef } from 'react';
import { effectiveStyle, type UiNode, type Breakpoint } from '@jjapgma/ui-spec';

// Align control centers, excluding labels/help text, without writing offsets to the saved spec.
export function useControlRowAlignment(enabled: boolean, layout: UiNode, breakpoint: Breakpoint) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const row = ref.current;
    if (!enabled || !row) return;
    const entries = Array.from(row.children).flatMap((child) => {
      if (!(child instanceof HTMLElement)) return [];
      const node = layout.children.find((node) => node.id === child.dataset.nodeId);
      if (!node || !['input', 'dateRange', 'select', 'button'].includes(node.type)) return [];
      const value = effectiveStyle(node, breakpoint);
      // Explicit child placement remains authoritative, including zero margins and custom CSS.
      if (
        value.hidden ||
        (value.alignSelf && value.alignSelf !== 'auto') ||
        value.marginTop !== undefined ||
        value.marginBottom !== undefined ||
        node.props.customCss?.trim()
      )
        return [];
      const control = child.querySelector<HTMLElement>(
        node.type === 'button' ? '.element-button' : '[data-field-control]',
      );
      if (!control) return [];
      return [
        {
          child,
          control,
          field: node.type !== 'button',
        },
      ];
    });
    if (!entries.some((entry) => entry.field) || !entries.some((entry) => !entry.field)) return;
    entries.forEach(({ child }) => {
      child.setAttribute('data-control-row-item', 'true');
    });
    let frame = 0;
    const align = () => {
      if (getComputedStyle(row).flexDirection !== 'row') return;
      // Explicit flex-start allows the original line top to be recovered even with wrapping.
      const lines = new Map<number, typeof entries>();
      for (const entry of entries) {
        if (!entry.child.getClientRects().length) continue;
        const top = Math.round(
          entry.child.offsetTop -
            (parseFloat(entry.child.style.getPropertyValue('--control-row-offset')) || 0),
        );
        const key = [...lines.keys()].find((key) => Math.abs(key - top) <= 1) ?? top;
        const line = lines.get(key) ?? [];
        line.push(entry);
        lines.set(key, line);
      }
      for (const line of lines.values()) {
        const positions = line.map((entry) => {
          const box = entry.child.getBoundingClientRect();
          const scale = entry.child.offsetHeight ? box.height / entry.child.offsetHeight : 1;
          return (
            (entry.control.getBoundingClientRect().top - box.top) / (scale || 1) +
            entry.control.offsetHeight / 2
          );
        });
        const center = Math.max(...positions);
        line.forEach((entry, index) => {
          const offset = line.some((item) => item.field)
            ? Math.max(0, center - positions[index])
            : 0;
          const next = `${offset}px`;
          if (entry.child.style.getPropertyValue('--control-row-offset') !== next)
            entry.child.style.setProperty('--control-row-offset', next);
        });
      }
    };
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(align);
    });
    [row, ...entries.flatMap(({ child, control }) => [child, control])].forEach((element) =>
      observer.observe(element),
    );
    align();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      entries.forEach(({ child }) => {
        child.removeAttribute('data-control-row-item');
        child.style.removeProperty('--control-row-offset');
      });
    };
  }, [enabled, layout, breakpoint]);
  return ref;
}
