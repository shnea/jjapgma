import { isDeepStrictEqual as equal } from 'node:util';
import { validateSpec, type UiSpec } from '@jjapgma/ui-spec';

type Document = { name: string; spec: UiSpec };
export function mergeProposal(base: Document, current: Document, proposed: Document) {
  const conflicts: string[] = [];
  const object = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === 'object' && !Array.isArray(v);
  function merge(before: unknown, now: unknown, next: unknown, path: string): unknown {
    if (equal(now, next) || equal(before, next)) return now;
    if (equal(before, now)) return next;
    if (
      Array.isArray(before) &&
      Array.isArray(now) &&
      Array.isArray(next) &&
      path.endsWith('.children')
    ) {
      const ids = (nodes: Record<string, unknown>[]) => nodes.map((n) => n.id as string);
      const b = ids(before),
        c = ids(now),
        p = ids(next);
      const order = equal(b, c) ? p : equal(b, p) || equal(c, p) ? c : null;
      if (!order) {
        conflicts.push(path + ' · 요소 순서/구조');
        return now;
      }
      const merged = new Map<string, unknown>();
      for (const id of new Set([...b, ...c, ...p])) {
        const old = before.find((n) => n.id === id),
          latest = now.find((n) => n.id === id),
          proposal = next.find((n) => n.id === id);
        merged.set(
          id,
          merge(
            old,
            latest,
            proposal,
            `${path} > ${latest?.name ?? proposal?.name ?? old?.name ?? id}`,
          ),
        );
      }
      return order.map((id) => merged.get(id)).filter((v) => v !== undefined);
    }
    if (object(before) && object(now) && object(next)) {
      const result: Record<string, unknown> = {};
      for (const key of new Set([
        ...Object.keys(before),
        ...Object.keys(now),
        ...Object.keys(next),
      ])) {
        const value = merge(before[key], now[key], next[key], `${path}.${key}`);
        if (value !== undefined) result[key] = value;
      }
      return result;
    }
    conflicts.push(path);
    return now;
  }
  const merged = merge(base, current, proposed, '화면') as Document;
  if (!conflicts.length) {
    try {
      merged.spec = validateSpec(merged.spec);
    } catch {
      conflicts.push('병합된 요소 관계 또는 속성을 확인해야 합니다.');
    }
  }
  return {
    merged: conflicts.length ? null : merged,
    conflicts: [...new Set(conflicts)].slice(0, 30),
  };
}
