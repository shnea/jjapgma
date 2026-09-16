import { useState } from 'react';
import {
  ArrowUp,
  ArrowDown,
  Copy,
  Plus,
  Trash2,
  Type,
  Hash,
  Calendar,
  Link,
  MousePointer2,
  Star,
  CheckSquare,
  Tag,
  Image,
} from 'lucide-react';
import {
  convertTable,
  createNode,
  type TableData,
  type TableColumn,
  type UiNode,
} from '@jjapgma/ui-spec';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { ChoiceField } from './ChoiceField';
import { IconPicker } from './IconPicker';
const types = [
  { value: 'text', label: '텍스트', icon: <Type size={17} /> },
  { value: 'number', label: '숫자', icon: <Hash size={17} /> },
  { value: 'date', label: '날짜', icon: <Calendar size={17} /> },
  { value: 'link', label: '링크', icon: <Link size={17} /> },
  { value: 'button', label: '버튼', icon: <MousePointer2 size={17} /> },
  { value: 'icon', label: '아이콘', icon: <Star size={17} /> },
  { value: 'checkbox', label: '체크', icon: <CheckSquare size={17} /> },
  { value: 'badge', label: '상태', icon: <Tag size={17} /> },
  { value: 'image', label: '이미지', icon: <Image size={17} /> },
];
const uid = () => createNode('text').id;
function parseClipboard(text: string) {
  const rows: string[][] = [[]];
  let cell = '',
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (ch === '\t' || ch === '\n')) {
      rows.at(-1)!.push(cell.replace(/\r$/, ''));
      cell = '';
      if (ch === '\n') rows.push([]);
    } else cell += ch;
  }
  rows.at(-1)!.push(cell.replace(/\r$/, ''));
  if (rows.length > 1 && rows.at(-1)!.every((cell) => !cell)) rows.pop();
  return rows;
}
export function TableEditor({
  node,
  onUpdate,
  disabled = false,
}: {
  node: UiNode;
  onUpdate: (edit: (node: UiNode) => void) => void;
  disabled?: boolean;
}) {
  const table = convertTable(node.props);
  const [tab, setTab] = useState('columns'),
    [dataOpen, setDataOpen] = useState(false),
    [dataPage, setDataPage] = useState(0),
    [error, setError] = useState('');
  const [dragged, setDragged] = useState<string>();
  const edit = (action: (table: TableData) => void) => {
    if (disabled) return;
    const next = convertTable(node.props);
    action(next);
    onUpdate((n) => {
      n.props.table = next;
    });
  };
  const columnEdit = (id: string, action: (column: TableColumn) => void) =>
    edit((table) => action(table.columns.find((column) => column.id === id)!));
  const reorder = (from: number, to: number) =>
    edit((t) => {
      const [column] = t.columns.splice(from, 1);
      t.columns.splice(Math.max(0, Math.min(t.columns.length, to)), 0, column);
    });
  const addColumn = () =>
    edit((t) => {
      if (t.columns.length < 24)
        t.columns.push({ id: uid(), title: `열 ${t.columns.length + 1}`, type: 'text' });
    });
  const removeColumn = (id: string) =>
    edit((t) => {
      t.columns = t.columns.filter((c) => c.id !== id);
      for (const row of t.rows) delete row.cells[id];
      t.rowRules = t.rowRules?.filter((rule) => rule.columnId !== id);
    });
  function paste(text: string, row: number, column: number) {
    const cells = parseClipboard(text);
    if (
      cells.length + row > 200 ||
      Math.max(...cells.map((r) => r.length)) + column > 24 ||
      cells.some((r) => r.some((cell) => cell.length > 2000))
    ) {
      setError('최대 200행·24열, 셀당 2,000자까지 붙여넣을 수 있습니다.');
      return;
    }
    setError('');
    edit((t) => {
      const width = Math.max(...cells.map((r) => r.length)) + column;
      while (t.columns.length < width)
        t.columns.push({ id: uid(), title: `열 ${t.columns.length + 1}`, type: 'text' });
      while (t.rows.length < row + cells.length) t.rows.push({ id: uid(), cells: {} });
      cells.forEach((values, i) =>
        values.forEach((value, j) => {
          t.rows[row + i].cells[t.columns[column + j].id] = value;
        }),
      );
    });
  }
  return (
    <div className="table-editor">
      <div className="table-editor-heading">
        <strong>표 편집</strong>
        <Button variant="secondary" disabled={disabled} onClick={() => setDataOpen(true)}>
          셀 데이터 편집
        </Button>
      </div>
      <ChoiceField
        label="표 설정"
        value={tab}
        options={[
          { value: 'columns', label: '열' },
          { value: 'appearance', label: '행·모양' },
          { value: 'behavior', label: '표시·동작' },
        ]}
        onChange={setTab}
      />
      {tab === 'columns' && (
        <>
          <p className="panel-help">열을 끌어서 순서를 바꾸세요. 숨긴 열의 데이터는 유지됩니다.</p>
          {table.columns.map((column, index) => (
            <details
              className="table-column-editor"
              key={column.id}
              open={table.columns.length === 1 || undefined}
              draggable={!disabled}
              onDragStart={(e) => {
                if ((e.target as HTMLElement).closest('input,select,button')) {
                  e.preventDefault();
                  return;
                }
                setDragged(column.id);
              }}
              onDragOver={(e) => {
                if (dragged) e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragged)
                  reorder(
                    table.columns.findIndex((c) => c.id === dragged),
                    index,
                  );
                setDragged(undefined);
              }}
              onDragEnd={() => setDragged(undefined)}
            >
              <summary>
                <span>{index + 1}</span>
                {column.title || '이름 없는 열'}
                <small>{types.find((t) => t.value === column.type)?.label}</small>
              </summary>
              <div className="table-column-body">
                <label>
                  열 제목
                  <input
                    maxLength={100}
                    value={column.title}
                    onChange={(e) =>
                      columnEdit(column.id, (c) => {
                        c.title = e.target.value;
                      })
                    }
                  />
                </label>
                <ChoiceField
                  label="열 종류"
                  value={column.type}
                  options={types}
                  onChange={(v) =>
                    columnEdit(column.id, (c) => {
                      c.type = v as TableColumn['type'];
                    })
                  }
                />
                <div className="device-visibility">
                  {(['desktop', 'tablet', 'mobile'] as const).map((device) => (
                    <label key={device}>
                      <input
                        type="checkbox"
                        checked={!column.hidden?.[device]}
                        onChange={(e) =>
                          columnEdit(column.id, (c) => {
                            c.hidden = { ...c.hidden, [device]: !e.target.checked };
                          })
                        }
                      />
                      {{ desktop: 'PC 표시', tablet: '태블릿 표시', mobile: '모바일 표시' }[device]}
                    </label>
                  ))}
                </div>
                <ChoiceField
                  label="셀 정렬"
                  value={column.align ?? (column.type === 'number' ? 'right' : 'left')}
                  options={[
                    { value: 'left', label: '왼쪽' },
                    { value: 'center', label: '가운데' },
                    { value: 'right', label: '오른쪽' },
                  ]}
                  onChange={(v) =>
                    columnEdit(column.id, (c) => {
                      c.align = v as TableColumn['align'];
                    })
                  }
                />
                <label>
                  열 너비 (px, 비우면 자동)
                  <input
                    type="number"
                    min={40}
                    max={800}
                    value={column.width ?? ''}
                    onChange={(e) =>
                      columnEdit(column.id, (c) => {
                        if (!e.target.value) delete c.width;
                        else c.width = Math.max(40, Math.min(800, Number(e.target.value)));
                      })
                    }
                  />
                </label>
                <ChoiceField
                  label="열 고정"
                  value={column.fixed ?? 'none'}
                  options={[
                    { value: 'none', label: '없음' },
                    { value: 'start', label: '왼쪽' },
                    { value: 'end', label: '오른쪽' },
                  ]}
                  onChange={(v) =>
                    columnEdit(column.id, (c) => {
                      c.fixed = v as TableColumn['fixed'];
                      if (v !== 'none') c.width ??= 160;
                    })
                  }
                />
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={column.wrap ?? false}
                    onChange={(e) =>
                      columnEdit(column.id, (c) => {
                        c.wrap = e.target.checked;
                      })
                    }
                  />
                  긴 내용 줄바꿈
                </label>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={column.sortable ?? false}
                    onChange={(e) =>
                      columnEdit(column.id, (c) => {
                        c.sortable = e.target.checked;
                      })
                    }
                  />
                  헤더를 눌러 정렬
                </label>
                {['button', 'link'].includes(column.type) && (
                  <label>
                    표시 문구 (비우면 셀 값)
                    <input
                      maxLength={100}
                      value={column.label ?? ''}
                      onChange={(e) =>
                        columnEdit(column.id, (c) => {
                          c.label = e.target.value;
                        })
                      }
                    />
                  </label>
                )}
                {['button', 'icon', 'badge'].includes(column.type) && (
                  <IconPicker
                    value={column.icon}
                    onChange={(v) =>
                      columnEdit(column.id, (c) => {
                        c.icon = v;
                      })
                    }
                  />
                )}
                {column.type === 'button' && (
                  <p className="panel-help">
                    셀 값이 안전한 주소이면 이동합니다. 주소가 없으면 미리보기에서 선택 표시만
                    바뀝니다.
                  </p>
                )}
                {column.type === 'image' && (
                  <p className="panel-help">같은 사이트의 이미지 경로를 셀에 입력하세요.</p>
                )}
                {column.type === 'badge' && (
                  <div>
                    <strong>값에 따른 색상</strong>
                    {(column.rules ?? []).map((rule, i) => (
                      <div className="rule-row" key={i}>
                        <input
                          aria-label="조건 값"
                          maxLength={100}
                          value={rule.value}
                          onChange={(e) =>
                            columnEdit(column.id, (c) => {
                              c.rules![i].value = e.target.value;
                            })
                          }
                        />
                        <input
                          type="color"
                          aria-label="조건 색상"
                          value={rule.color}
                          onChange={(e) =>
                            columnEdit(column.id, (c) => {
                              c.rules![i].color = e.target.value;
                            })
                          }
                        />
                        <Button
                          variant="ghost"
                          aria-label="조건 삭제"
                          onClick={() =>
                            columnEdit(column.id, (c) => {
                              c.rules!.splice(i, 1);
                            })
                          }
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      disabled={(column.rules?.length ?? 0) >= 20}
                      onClick={() =>
                        columnEdit(column.id, (c) => {
                          (c.rules ??= []).push({ value: '완료', color: '#24704b' });
                        })
                      }
                    >
                      조건 추가
                    </Button>
                  </div>
                )}
                <div className="column-actions">
                  <Button
                    variant="ghost"
                    aria-label="열 앞으로"
                    disabled={index === 0}
                    onClick={() => reorder(index, index - 1)}
                  >
                    <ArrowUp size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label="열 뒤로"
                    disabled={index === table.columns.length - 1}
                    onClick={() => reorder(index, index + 1)}
                  >
                    <ArrowDown size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label="열 복제"
                    disabled={table.columns.length >= 24}
                    onClick={() =>
                      edit((t) => {
                        const copy = {
                          ...structuredClone(column),
                          id: uid(),
                          title: `${column.title.slice(0, 94)} 복사`,
                        };
                        t.columns.splice(index + 1, 0, copy);
                        for (const row of t.rows) row.cells[copy.id] = row.cells[column.id] ?? '';
                      })
                    }
                  >
                    <Copy size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label="열 삭제"
                    disabled={table.columns.length <= 1}
                    onClick={() => removeColumn(column.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </details>
          ))}
          <Button variant="secondary" disabled={table.columns.length >= 24} onClick={addColumn}>
            <Plus size={14} />열 추가
          </Button>
        </>
      )}
      {tab === 'appearance' && (
        <>
          <ChoiceField
            label="행 간격"
            value={table.density ?? 'normal'}
            options={[
              { value: 'compact', label: '촘촘하게' },
              { value: 'normal', label: '기본' },
              { value: 'comfortable', label: '넉넉하게' },
            ]}
            onChange={(v) =>
              edit((t) => {
                t.density = v as TableData['density'];
              })
            }
          />
          <ChoiceField
            label="구분선"
            value={table.borders ?? 'horizontal'}
            options={[
              { value: 'horizontal', label: '가로선' },
              { value: 'all', label: '모든 선' },
              { value: 'none', label: '없음' },
            ]}
            onChange={(v) =>
              edit((t) => {
                t.borders = v as TableData['borders'];
              })
            }
          />
          <label className="check-field">
            <input
              type="checkbox"
              checked={table.striped ?? false}
              onChange={(e) =>
                edit((t) => {
                  t.striped = e.target.checked;
                })
              }
            />
            행 교차 색상
          </label>
          {table.striped && (
            <label>
              짝수 행 색상
              <input
                type="color"
                value={table.stripeColor ?? '#f3f6f3'}
                onChange={(e) =>
                  edit((t) => {
                    t.stripeColor = e.target.value;
                  })
                }
              />
            </label>
          )}
          <label>
            헤더 색상
            <input
              type="color"
              value={table.headerColor ?? '#f0f3ec'}
              onChange={(e) =>
                edit((t) => {
                  t.headerColor = e.target.value;
                })
              }
            />
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={table.hover ?? true}
              onChange={(e) =>
                edit((t) => {
                  t.hover = e.target.checked;
                })
              }
            />
            마우스를 올린 행 강조
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={table.stickyHeader ?? false}
              onChange={(e) =>
                edit((t) => {
                  t.stickyHeader = e.target.checked;
                })
              }
            />
            헤더 고정
          </label>
          <details>
            <summary>조건에 따른 행 색상</summary>
            {(table.rowRules ?? []).map((rule, i) => (
              <div className="rule-row" key={i}>
                <select
                  aria-label="조건 열"
                  value={rule.columnId}
                  onChange={(e) =>
                    edit((t) => {
                      t.rowRules![i].columnId = e.target.value;
                    })
                  }
                >
                  {table.columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="행 조건 값"
                  maxLength={100}
                  value={rule.value}
                  onChange={(e) =>
                    edit((t) => {
                      t.rowRules![i].value = e.target.value;
                    })
                  }
                />
                <input
                  type="color"
                  aria-label="행 조건 색상"
                  value={rule.color}
                  onChange={(e) =>
                    edit((t) => {
                      t.rowRules![i].color = e.target.value;
                    })
                  }
                />
                <Button
                  variant="ghost"
                  aria-label="행 조건 삭제"
                  onClick={() =>
                    edit((t) => {
                      t.rowRules!.splice(i, 1);
                    })
                  }
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              disabled={(table.rowRules?.length ?? 0) >= 20}
              onClick={() =>
                edit((t) => {
                  (t.rowRules ??= []).push({
                    columnId: t.columns[0].id,
                    value: '',
                    color: '#fff5d6',
                  });
                })
              }
            >
              행 조건 추가
            </Button>
          </details>
        </>
      )}
      {tab === 'behavior' && (
        <>
          <ChoiceField
            label="첫 번째 보조 열"
            value={table.firstColumn ?? 'none'}
            options={[
              { value: 'none', label: '없음' },
              { value: 'number', label: '번호' },
              { value: 'select', label: '체크박스' },
              { value: 'number-select', label: '번호+체크' },
            ]}
            onChange={(v) =>
              edit((t) => {
                t.firstColumn = v as TableData['firstColumn'];
              })
            }
          />
          {['number', 'number-select'].includes(table.firstColumn ?? '') && (
            <ChoiceField
              label="번호 방식"
              value={table.numbering ?? 'continuous'}
              options={[
                { value: 'continuous', label: '이어서 번호' },
                { value: 'page', label: '페이지마다' },
              ]}
              onChange={(v) =>
                edit((t) => {
                  t.numbering = v as TableData['numbering'];
                })
              }
            />
          )}
          {['select', 'number-select'].includes(table.firstColumn ?? '') && (
            <ChoiceField
              label="전체 선택 범위"
              value={table.selectionScope ?? 'page'}
              options={[
                { value: 'page', label: '현재 페이지' },
                { value: 'filtered', label: '검색 결과 전체' },
              ]}
              onChange={(v) =>
                edit((t) => {
                  t.selectionScope = v as TableData['selectionScope'];
                })
              }
            />
          )}
          {(['searchable', 'filterable'] as const).map((key) => (
            <label className="check-field" key={key}>
              <input
                type="checkbox"
                checked={table[key] ?? false}
                onChange={(e) =>
                  edit((t) => {
                    t[key] = e.target.checked;
                  })
                }
              />
              {key === 'searchable' ? '검색 표시' : '열 필터 표시'}
            </label>
          ))}
          <ChoiceField
            label="모바일 표"
            value={table.mobileLayout ?? 'scroll'}
            options={[
              { value: 'scroll', label: '표·가로 스크롤' },
              { value: 'cards', label: '행을 카드로' },
            ]}
            onChange={(v) =>
              edit((t) => {
                t.mobileLayout = v as TableData['mobileLayout'];
              })
            }
          />
          <ChoiceField
            label="표 상태 미리보기"
            value={table.state ?? 'normal'}
            options={[
              { value: 'normal', label: '기본' },
              { value: 'loading', label: '로딩' },
              { value: 'error', label: '오류' },
            ]}
            onChange={(v) =>
              edit((t) => {
                t.state = v as TableData['state'];
              })
            }
          />
        </>
      )}
      {dataOpen && (
        <Dialog title="표 데이터 편집" onClose={() => setDataOpen(false)}>
          <fieldset disabled={disabled}>
            <p>
              셀을 직접 수정하거나 엑셀에서 복사한 영역을 붙여넣으세요. 변경은 캔버스에 즉시
              반영되며 실행 취소할 수 있습니다.
            </p>
            {error && <p role="alert">{error}</p>}
            <div className="table-data-scroll">
              <table className="table-data-grid">
                <thead>
                  <tr>
                    <th>행</th>
                    {table.columns.map((c) => (
                      <th key={c.id}>{c.title || '열'}</th>
                    ))}
                    <th>삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {table.rows.slice(dataPage * 20, dataPage * 20 + 20).map((row, i) => (
                    <tr key={row.id}>
                      <th>
                        {dataPage * 20 + i + 1}
                        <label className="check-field">
                          <input
                            type="checkbox"
                            aria-label={`${dataPage * 20 + i + 1}행 표시`}
                            checked={!row.hidden}
                            onChange={(e) =>
                              edit((t) => {
                                t.rows.find((r) => r.id === row.id)!.hidden = !e.target.checked;
                              })
                            }
                          />
                          표시
                        </label>
                      </th>
                      {table.columns.map((column, j) => (
                        <td key={column.id}>
                          <input
                            aria-label={`${dataPage * 20 + i + 1}행 ${column.title || `${j + 1}열`}`}
                            maxLength={2000}
                            value={row.cells[column.id] ?? ''}
                            onChange={(e) =>
                              edit((t) => {
                                t.rows.find((r) => r.id === row.id)!.cells[column.id] =
                                  e.target.value;
                              })
                            }
                            onPaste={(e) => {
                              const text = e.clipboardData.getData('text/plain');
                              if (text.includes('\t') || text.includes('\n')) {
                                e.preventDefault();
                                paste(text, dataPage * 20 + i, j);
                              }
                            }}
                          />
                        </td>
                      ))}
                      <td>
                        <Button
                          variant="ghost"
                          aria-label={`${dataPage * 20 + i + 1}행 삭제`}
                          onClick={() => {
                            edit((t) => {
                              t.rows = t.rows.filter((r) => r.id !== row.id);
                            });
                            setDataPage(
                              Math.max(
                                0,
                                Math.min(dataPage, Math.ceil((table.rows.length - 1) / 20) - 1),
                              ),
                            );
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="data-actions">
              <Button
                variant="secondary"
                disabled={table.rows.length >= 200}
                onClick={() => {
                  edit((t) => {
                    t.rows.push({ id: uid(), cells: {} });
                  });
                  setDataPage(Math.floor(table.rows.length / 20));
                }}
              >
                행 추가
              </Button>
              <Button variant="secondary" disabled={table.columns.length >= 24} onClick={addColumn}>
                열 추가
              </Button>
              <Button
                variant="ghost"
                disabled={dataPage === 0}
                onClick={() => setDataPage((p) => p - 1)}
              >
                이전 행
              </Button>
              <span>{table.rows.length}행</span>
              <Button
                variant="ghost"
                disabled={(dataPage + 1) * 20 >= table.rows.length}
                onClick={() => setDataPage((p) => p + 1)}
              >
                다음 행
              </Button>
            </div>
          </fieldset>
        </Dialog>
      )}
    </div>
  );
}
