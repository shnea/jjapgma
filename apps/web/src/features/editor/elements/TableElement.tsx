import { useContext, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ExportAssetsContext } from '../export/ExportAssets';
import { readTable, type UiNode, type Breakpoint, type TableColumn } from '@jjapgma/ui-spec';
import { ArrowUp, ArrowDown, Search } from 'lucide-react';
import { ElementIcon } from '../controls/IconPicker';
import { PaginationControl } from './PaginationControl';
import { useNavigation } from '../NavigationRuntime';
const safeLink = (value: string) => /^(https?:\/\/[^\s]+|\/(?!\/)[^\\\s]*|#[\w-]*)$/.test(value);
const safeImage = (value: string) => /^\/(?!\/)[^\\\s]*$/.test(value);
const truthy = (value: string) =>
  ['true', '1', 'yes', '예', '선택', '완료'].includes(value.toLowerCase());
function textColor(color: string) {
  const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  return rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114 > 150 ? '#17221c' : '#ffffff';
}
export function TableElement({ node, breakpoint }: { node: UiNode; breakpoint: Breakpoint }) {
  const table = readTable(node.props);
  const { queries } = useNavigation();
  const externalQuery = queries[node.id] ?? '';
  const exportedAssets = useContext(ExportAssetsContext);
  const [page, setPage] = useState(1),
    [query, setQuery] = useState(''),
    [filterColumn, setFilterColumn] = useState(''),
    [filter, setFilter] = useState('');
  const [sort, setSort] = useState<{ id: string; direction: 1 | -1 }>(),
    [selected, setSelected] = useState<Set<string>>(new Set());
  const [checks, setChecks] = useState<Record<string, boolean>>({}),
    [actions, setActions] = useState<Record<string, boolean>>({}),
    [retry, setRetry] = useState(false);
  const [size, setSize] = useState<number>(),
    [loaded, setLoaded] = useState(20);
  const sentinel = useRef<HTMLDivElement>(null);
  const visible = table.columns.filter((c) => !c.hidden?.[breakpoint]);
  const actualFilter = visible.find((c) => c.id === filterColumn)?.id ?? visible[0]?.id;
  const filtered = table.rows.filter(
    (row) =>
      !row.hidden &&
      (!externalQuery ||
        visible.some((c) =>
          (row.cells[c.id] ?? '').toLocaleLowerCase().includes(externalQuery.toLocaleLowerCase()),
        )) &&
      (!table.searchable ||
        !query ||
        visible.some((c) =>
          (row.cells[c.id] ?? '').toLocaleLowerCase().includes(query.toLocaleLowerCase()),
        )) &&
      (!table.filterable ||
        !filter ||
        (row.cells[actualFilter ?? ''] ?? '')
          .toLocaleLowerCase()
          .includes(filter.toLocaleLowerCase())),
  );
  const sorted = [...filtered];
  const sortColumn = visible.find((c) => c.id === sort?.id && c.sortable);
  if (sort && sortColumn)
    sorted.sort((a, b) => {
      const left = a.cells[sort.id] ?? '',
        right = b.cells[sort.id] ?? '';
      const numeric =
        sortColumn.type === 'number'
          ? Number(left.replaceAll(',', '')) - Number(right.replaceAll(',', ''))
          : sortColumn.type === 'date'
            ? Date.parse(left) - Date.parse(right)
            : NaN;
      return (
        (Number.isFinite(numeric) ? numeric : left.localeCompare(right, 'ko', { numeric: true })) *
        sort.direction
      );
    });
  const mode = node.props.paginationMode ?? 'none',
    pageSize = size ?? node.props.pageSize ?? 3;
  const total = Math.max(1, Math.ceil(sorted.length / pageSize)),
    current = Math.min(page, total);
  const offset = mode === 'pagination' ? (current - 1) * pageSize : 0;
  const rows =
    mode === 'pagination'
      ? sorted.slice(offset, offset + pageSize)
      : mode === 'infinite'
        ? sorted.slice(0, loaded)
        : sorted;
  const numbers = ['number', 'number-select'].includes(table.firstColumn ?? ''),
    selection = ['select', 'number-select'].includes(table.firstColumn ?? '');
  const targets = table.selectionScope === 'filtered' ? sorted : rows;
  const selectedCount = table.rows.filter((row) => !row.hidden && selected.has(row.id)).length;
  const allChecked = !!targets.length && targets.every((row) => selected.has(row.id));
  const partiallyChecked = !allChecked && targets.some((row) => selected.has(row.id));
  const cards = breakpoint === 'mobile' && table.mobileLayout === 'cards';
  useEffect(() => {
    setRetry(false);
  }, [table.state]);
  useEffect(() => {
    if (mode !== 'infinite' || !sentinel.current || loaded >= sorted.length) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setLoaded((value) => Math.min(sorted.length, value + 20));
    });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [mode, loaded, sorted.length, retry, table.state]);
  const select = (id: string, checked: boolean) =>
    setSelected((old) => {
      const next = new Set(old);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  function cell(column: TableColumn, rowId: string, value: string) {
    const key = `${rowId}:${column.id}`;
    if (column.type === 'number') {
      const number = Number(value.replaceAll(',', ''));
      return value && Number.isFinite(number) ? number.toLocaleString('ko-KR') : value;
    }
    if (column.type === 'date') {
      const date = new Date(value);
      return value && !Number.isNaN(date.valueOf())
        ? date.toLocaleDateString('ko-KR', { timeZone: 'UTC' })
        : value;
    }
    if (column.type === 'link')
      return safeLink(value) ? (
        <a href={value}>{column.label || value}</a>
      ) : (
        <span>{column.label || value || '—'}</span>
      );
    if (column.type === 'button')
      return safeLink(value) ? (
        <a className="table-action" href={value}>
          <ElementIcon name={column.icon} />
          {column.label || '열기'}
        </a>
      ) : (
        <button
          type="button"
          className="table-action"
          aria-pressed={actions[key] ?? false}
          onClick={() => setActions((old) => ({ ...old, [key]: !old[key] }))}
        >
          <ElementIcon name={column.icon} />
          {column.label || value || '선택'}
        </button>
      );
    if (column.type === 'checkbox')
      return (
        <input
          type="checkbox"
          aria-label={`${column.title} ${table.rows.findIndex((r) => r.id === rowId) + 1}행 값`}
          checked={checks[key] ?? truthy(value)}
          onChange={(e) => setChecks((old) => ({ ...old, [key]: e.target.checked }))}
        />
      );
    if (column.type === 'icon')
      return (
        <span role="img" aria-label={value || column.title}>
          <ElementIcon name={column.icon && column.icon !== 'none' ? column.icon : value} />
        </span>
      );
    if (column.type === 'image')
      return exportedAssets?.[`${node.id}:${rowId}:${column.id}`]?.src || safeImage(value) ? (
        <img
          className="table-cell-image"
          src={exportedAssets?.[`${node.id}:${rowId}:${column.id}`]?.src ?? value}
          alt={column.title}
        />
      ) : (
        <span>—</span>
      );
    if (column.type === 'badge') {
      const rule = column.rules?.find((rule) => rule.value === value);
      return (
        <span
          className="table-badge"
          style={rule ? { background: rule.color, color: textColor(rule.color) } : undefined}
        >
          <ElementIcon name={rule?.icon ?? column.icon} size={14} />
          {value || '—'}
        </span>
      );
    }
    return value;
  }
  function columnStyle(column: TableColumn, index: number): CSSProperties {
    const width = column.width ?? (column.fixed && column.fixed !== 'none' ? 160 : undefined);
    const before = visible
      .slice(0, index)
      .filter((c) => c.fixed === 'start')
      .reduce((sum, c) => sum + (c.width ?? 160), selection || numbers ? 80 : 0);
    const after = visible
      .slice(index + 1)
      .filter((c) => c.fixed === 'end')
      .reduce((sum, c) => sum + (c.width ?? 160), 0);
    return {
      textAlign: column.align ?? (column.type === 'number' ? 'right' : 'left'),
      width,
      minWidth: width,
      position: column.fixed && column.fixed !== 'none' ? 'sticky' : undefined,
      left: column.fixed === 'start' ? before : undefined,
      right: column.fixed === 'end' ? after : undefined,
    };
  }
  function auxiliary(id: string, index: number) {
    return (
      <div className="table-row-tools">
        {selection && (
          <input
            type="checkbox"
            aria-label={`${offset + index + 1}행 선택`}
            checked={selected.has(id)}
            onChange={(e) => select(id, e.target.checked)}
          />
        )}{' '}
        {numbers && <span>{(table.numbering === 'page' ? 0 : offset) + index + 1}</span>}
      </div>
    );
  }
  if (table.state === 'loading')
    return (
      <div className="table-state" role="status">
        표를 불러오는 중…
        <div className="table-skeleton" />
      </div>
    );
  if (table.state === 'error' && !retry)
    return (
      <div className="table-state" role="alert">
        데이터를 불러오지 못했습니다.
        <button type="button" onClick={() => setRetry(true)}>
          다시 보기
        </button>
      </div>
    );
  return (
    <div
      className={`element-table-wrapper configured-table density-${table.density ?? 'normal'} borders-${table.borders ?? 'horizontal'}${table.hover === false ? '' : ' hover-rows'}${table.stickyHeader ? ' sticky-header' : ''}`}
      style={
        {
          '--table-stripe': table.stripeColor ?? '#f3f6f3',
          '--table-header': table.headerColor ?? 'var(--page-surface, #f0f3ec)',
          '--table-header-text': table.headerColor
            ? textColor(table.headerColor)
            : 'var(--page-text, #253129)',
        } as CSSProperties
      }
    >
      {(table.searchable || table.filterable || selection) && (
        <div className="table-toolbar">
          {table.searchable && (
            <label className="table-search">
              <Search size={15} />
              <input
                type="search"
                aria-label="표 검색"
                placeholder="검색"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                  setLoaded(20);
                }}
              />
            </label>
          )}
          {table.filterable && (
            <>
              <select
                aria-label="표 필터 열"
                value={actualFilter ?? ''}
                onChange={(e) => {
                  setFilterColumn(e.target.value);
                  setPage(1);
                }}
              >
                {visible.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.title}
                  </option>
                ))}
              </select>
              <input
                aria-label="표 필터 값"
                placeholder="필터 값"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setPage(1);
                  setLoaded(20);
                }}
              />
            </>
          )}
          {selection && (
            <span role="status">
              {selectedCount}개 선택{' '}
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                disabled={!selectedCount}
              >
                해제
              </button>
            </span>
          )}
        </div>
      )}
      {!visible.length ? (
        <p className="table-state">이 화면에 표시할 열이 없습니다.</p>
      ) : cards ? (
        <div className="table-cards">
          {rows.map((row, i) => (
            <article key={row.id} className={selected.has(row.id) ? 'selected' : ''}>
              {(selection || numbers) && auxiliary(row.id, i)}
              <dl>
                {visible.map((column) => (
                  <div key={column.id}>
                    <dt>{column.title}</dt>
                    <dd>{cell(column, row.id, row.cells[column.id] ?? '')}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      ) : (
        <div className="element-table-scroll">
          <table
            style={{
              minWidth: visible.reduce(
                (sum, column) => sum + (column.width ?? 120),
                selection || numbers ? 80 : 0,
              ),
            }}
          >
            <colgroup>
              {(selection || numbers) && <col style={{ width: 80 }} />}
              {visible.map((column) => (
                <col
                  key={column.id}
                  style={{
                    width:
                      column.width ?? (column.fixed && column.fixed !== 'none' ? 160 : undefined),
                  }}
                />
              ))}
            </colgroup>
            {node.props.text && <caption>{node.props.text}</caption>}
            {node.props.showHeader !== false && (
              <thead>
                <tr>
                  {(selection || numbers) && (
                    <th className="table-auxiliary" scope="col">
                      {selection ? (
                        <input
                          ref={(input) => {
                            if (input) input.indeterminate = partiallyChecked;
                          }}
                          type="checkbox"
                          aria-label={
                            table.selectionScope === 'filtered'
                              ? '검색 결과 전체 선택'
                              : '현재 페이지 전체 선택'
                          }
                          checked={allChecked}
                          onChange={(e) =>
                            setSelected((old) => {
                              const next = new Set(old);
                              targets.forEach((row) =>
                                e.target.checked ? next.add(row.id) : next.delete(row.id),
                              );
                              return next;
                            })
                          }
                        />
                      ) : (
                        '번호'
                      )}
                    </th>
                  )}
                  {visible.map((column, i) => (
                    <th
                      key={column.id}
                      scope="col"
                      style={columnStyle(column, i)}
                      aria-sort={
                        sortColumn?.id === column.id
                          ? sort?.direction === 1
                            ? 'ascending'
                            : 'descending'
                          : column.sortable
                            ? 'none'
                            : undefined
                      }
                    >
                      {column.sortable ? (
                        <button
                          type="button"
                          className="table-sort"
                          onClick={() => {
                            setSort({
                              id: column.id,
                              direction: sort?.id === column.id && sort.direction === 1 ? -1 : 1,
                            });
                            setPage(1);
                          }}
                        >
                          {column.title}
                          {sort?.id === column.id ? (
                            sort.direction === 1 ? (
                              <ArrowUp size={13} />
                            ) : (
                              <ArrowDown size={13} />
                            )
                          ) : null}
                        </button>
                      ) : (
                        column.title
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {rows.map((row, i) => {
                const rule = table.rowRules?.find(
                  (rule) => row.cells[rule.columnId] === rule.value,
                );
                return (
                  <tr
                    key={row.id}
                    className={`${selected.has(row.id) ? 'selected ' : ''}${table.striped && i % 2 ? 'striped' : ''}`}
                    style={
                      rule
                        ? ({
                            '--row-color': rule.color,
                            '--row-text': textColor(rule.color),
                          } as CSSProperties)
                        : undefined
                    }
                  >
                    {(selection || numbers) && (
                      <td className="table-auxiliary">{auxiliary(row.id, i)}</td>
                    )}
                    {visible.map((column, j) => (
                      <td key={column.id} style={columnStyle(column, j)}>
                        <div
                          className={column.wrap ? 'cell-wrap' : 'cell-ellipsis'}
                          title={row.cells[column.id] ?? ''}
                        >
                          {cell(column, row.id, row.cells[column.id] ?? '')}
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!!visible.length && !rows.length && (
        <p className="table-state">
          {query || filter ? '검색 결과가 없습니다.' : '등록된 데이터가 없습니다.'}
        </p>
      )}
      <div className="table-footer">
        <span>
          {sorted.length ? `${offset + 1}–${offset + rows.length} / ${sorted.length}건` : '0건'}
        </span>
        {mode === 'pagination' && (
          <label>
            페이지당{' '}
            <select
              aria-label="표 페이지당 개수"
              value={pageSize}
              onChange={(e) => {
                setSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {Array.from(new Set([node.props.pageSize ?? 3, 10, 20, 50, 100]))
                .sort((a, b) => a - b)
                .map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
            </select>
          </label>
        )}
      </div>
      {mode === 'infinite' ? (
        <div ref={sentinel}>
          {loaded < sorted.length && (
            <button type="button" onClick={() => setLoaded((count) => count + 20)}>
              더 보기
            </button>
          )}
        </div>
      ) : (
        <PaginationControl
          mode={mode}
          design={node.props.paginationDesign}
          page={current}
          total={total}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
