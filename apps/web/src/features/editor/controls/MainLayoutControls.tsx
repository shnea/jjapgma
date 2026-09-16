import { Button } from '../../../components/ui/Button';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  PanelLeft,
  PanelRight,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
} from 'lucide-react';
import { createNode, type UiNode, type MenuItem } from '@jjapgma/ui-spec';
import { useCarouselEditing } from '../CarouselEditing';
import { ChoiceField } from './ChoiceField';
import { IconPicker } from './IconPicker';
import { AddressField } from '../AddressField';

export function MainLayoutControls({
  node,
  pageRoot,
  onUpdate,
}: {
  node: UiNode;
  pageRoot?: UiNode;
  onUpdate: (fn: (n: UiNode) => void) => void;
}) {
  const carouselEditing = useCarouselEditing();
  const set = (key: keyof UiNode['props'], value: unknown) =>
    onUpdate((n) => Object.assign(n.props, { [key]: value }));
  const toggle = (key: keyof UiNode['props'], label: string, fallback = false) => (
    <label className="check-field">
      <input
        type="checkbox"
        checked={Boolean(node.props[key] ?? fallback)}
        onChange={(e) => set(key, e.target.checked)}
      />
      {label}
    </label>
  );
  const number = (
    key: keyof UiNode['props'],
    label: string,
    fallback: number,
    min: number,
    max: number,
  ) => (
    <label>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={Number(node.props[key] ?? fallback)}
        onChange={(e) => set(key, Math.min(max, Math.max(min, Math.round(Number(e.target.value)))))}
      />
    </label>
  );
  const targets: UiNode[] = [];
  const visit = (n: UiNode) => {
    if (n.type === 'navbar') targets.push(n);
    n.children.forEach(visit);
  };
  if (pageRoot) visit(pageRoot);
  const mutateMenu = (fn: (items: MenuItem[]) => void) =>
    onUpdate((n) => {
      n.props.menuItems ??= [];
      fn(n.props.menuItems);
    });
  const makeItem = (): MenuItem => ({ id: crypto.randomUUID(), label: '새 메뉴', icon: 'home' });
  const itemDepth = (item: MenuItem): number =>
    1 + Math.max(0, ...(item.children ?? []).map(itemDepth));
  const contains = (item: MenuItem, id: string): boolean =>
    item.id === id || !!item.children?.some((child) => contains(child, id));
  const menuParents: { item: MenuItem; depth: number }[] = [];
  const collect = (items: MenuItem[], depth = 1) =>
    items.forEach((item) => {
      menuParents.push({ item, depth });
      collect(item.children ?? [], depth + 1);
    });
  collect(node.props.menuItems ?? []);
  function itemEditor(item: MenuItem, index: number, parents: number[] = []) {
    const listAt = (items: MenuItem[]) => parents.reduce((list, i) => list[i].children!, items);
    const change = (fn: (i: MenuItem) => void) => mutateMenu((items) => fn(listAt(items)[index]));
    const listChange = (fn: (items: MenuItem[]) => void) =>
      mutateMenu((items) => fn(listAt(items)));
    return (
      <details className="menu-item-editor" key={item.id}>
        <summary>{item.label || '구분선'}</summary>
        <label>
          항목 종류
          <select
            value={item.kind ?? 'item'}
            onChange={(e) =>
              change((v) => {
                v.kind = e.target.value as MenuItem['kind'];
                if (v.kind !== 'item') delete v.children;
              })
            }
          >
            <option value="item">메뉴</option>
            <option value="group">그룹 제목</option>
            <option value="divider">구분선</option>
          </select>
        </label>
        {item.kind !== 'divider' && (
          <label>
            메뉴 이름
            <input
              maxLength={120}
              value={item.label}
              onChange={(e) =>
                change((v) => {
                  v.label = e.target.value;
                })
              }
            />
          </label>
        )}
        {(!item.kind || item.kind === 'item') && (
          <>
            <IconPicker
              value={item.icon}
              onChange={(icon) =>
                change((v) => {
                  v.icon = icon;
                })
              }
            />
            <label>
              <AddressField
                field="href"
                label="이동 주소"
                value={item.href ?? ''}
                onCommit={(href) =>
                  change((v) => {
                    v.href = href;
                  })
                }
              />
            </label>
            <label>
              배지
              <input
                maxLength={20}
                value={item.badge ?? ''}
                onChange={(e) =>
                  change((v) => {
                    v.badge = e.target.value;
                  })
                }
              />
            </label>
            <label className="check-field">
              <input
                type="checkbox"
                checked={item.disabled ?? false}
                onChange={(e) =>
                  change((v) => {
                    v.disabled = e.target.checked;
                  })
                }
              />
              비활성화
            </label>
            <label className="check-field">
              <input
                type="checkbox"
                checked={item.hiddenOnMobile ?? false}
                onChange={(e) =>
                  change((v) => {
                    v.hiddenOnMobile = e.target.checked;
                  })
                }
              />
              모바일에서 숨기기
            </label>
            <Button variant="secondary" type="button" onClick={() => set('activeMenuId', item.id)}>
              시작 선택 항목으로 지정
            </Button>
            {parents.length < 2 && (
              <>
                <Button
                  variant="secondary"
                  type="button"
                  disabled={(item.children?.length ?? 0) >= 30}
                  onClick={() =>
                    change((v) => {
                      (v.children ??= []).push(makeItem());
                    })
                  }
                >
                  <Plus size={13} />
                  하위 메뉴 추가
                </Button>
                {item.children?.map((child, i) => itemEditor(child, i, [...parents, index]))}
              </>
            )}
          </>
        )}
        <div className="menu-item-actions">
          <Button
            variant="secondary"
            type="button"
            aria-label="메뉴 위로"
            disabled={index === 0}
            onClick={() =>
              listChange((items) => {
                [items[index - 1], items[index]] = [items[index], items[index - 1]];
              })
            }
          >
            <ArrowUp size={14} />
          </Button>
          <Button
            variant="secondary"
            type="button"
            aria-label="메뉴 아래로"
            onClick={() =>
              listChange((items) => {
                if (index < items.length - 1)
                  [items[index + 1], items[index]] = [items[index], items[index + 1]];
              })
            }
          >
            <ArrowDown size={14} />
          </Button>
          <Button
            variant="secondary"
            type="button"
            aria-label="메뉴 삭제"
            onClick={() =>
              listChange((items) => {
                items.splice(index, 1);
              })
            }
          >
            <Trash2 size={14} />
          </Button>
        </div>
        <label>
          상위 메뉴 변경
          <select
            value=""
            onChange={(e) => {
              const target = e.target.value;
              if (!target) return;
              mutateMenu((items) => {
                const moving = listAt(items).splice(index, 1)[0];
                const find = (list: MenuItem[]): MenuItem | undefined => {
                  for (const entry of list) {
                    if (entry.id === target) return entry;
                    const child = find(entry.children ?? []);
                    if (child) return child;
                  }
                };
                if (target === '__root') items.push(moving);
                else {
                  const parent = find(items);
                  if (parent) (parent.children ??= []).push(moving);
                }
              });
            }}
          >
            <option value="">이동할 위치 선택</option>
            {parents.length > 0 && (node.props.menuItems?.length ?? 0) < 100 && (
              <option value="__root">최상위</option>
            )}
            {menuParents
              .filter(
                (p) =>
                  (!p.item.kind || p.item.kind === 'item') &&
                  !contains(item, p.item.id) &&
                  p.depth + itemDepth(item) <= 3 &&
                  (p.item.children?.length ?? 0) < 30,
              )
              .map((p) => (
                <option key={p.item.id} value={p.item.id}>
                  {p.item.label} ({p.depth}단계)
                </option>
              ))}
          </select>
        </label>
      </details>
    );
  }
  return (
    <>
      {['sidePanel', 'drawer', 'searchBox', 'carousel'].includes(node.type) && (
        <label>
          표시 이름
          <input
            maxLength={100}
            value={node.props.text}
            onChange={(e) => set('text', e.target.value)}
          />
        </label>
      )}
      <ChoiceField
        label="패널이 접혔을 때"
        value={node.props.collapseVisibility ?? 'always'}
        options={[
          { value: 'always', label: '항상 표시' },
          { value: 'expanded', label: '펼칠 때만' },
          { value: 'collapsed', label: '접힐 때만' },
        ]}
        onChange={(v) => set('collapseVisibility', v)}
      />
      {['sidePanel', 'drawer'].includes(node.type) && (
        <>
          <ChoiceField
            label="패널 위치"
            value={node.props.panelSide ?? 'left'}
            options={[
              { value: 'left', label: '왼쪽', icon: <PanelLeft size={18} /> },
              { value: 'right', label: '오른쪽', icon: <PanelRight size={18} /> },
            ]}
            onChange={(v) => set('panelSide', v)}
          />
          <ChoiceField
            label="서랍이 덮는 영역"
            value={node.props.drawerScope ?? 'parent'}
            options={[
              { value: 'parent', label: '부모 영역' },
              { value: 'page', label: '화면 전체' },
            ]}
            onChange={(v) => set('drawerScope', v)}
          />
        </>
      )}
      {node.type === 'sidePanel' && (
        <>
          <ChoiceField
            label="접기 사용"
            value={node.props.panelMode ?? 'collapsible'}
            options={[
              { value: 'fixed', label: '항상 펼침' },
              { value: 'collapsible', label: '접기 가능' },
            ]}
            onChange={(v) => set('panelMode', v)}
          />
          {node.props.panelMode !== 'fixed' && (
            <>
              <ChoiceField
                label="접힌 모습"
                value={node.props.collapseMode ?? 'rail'}
                options={[
                  { value: 'rail', label: '아이콘 유지' },
                  { value: 'hidden', label: '완전히 숨김' },
                ]}
                onChange={(v) => set('collapseMode', v)}
              />
              {number('collapsedWidth', '접힌 너비', 64, 40, 120)}
              {toggle('defaultCollapsed', '처음에는 접기')}
            </>
          )}
          {toggle('mobileDrawer', '모바일에서는 서랍으로 표시', true)}
          <ChoiceField
            label="모바일 메뉴 열기"
            value={node.props.mobileTrigger ?? 'auto'}
            options={[
              { value: 'auto', label: '패널 기본 버튼' },
              { value: 'external', label: '헤더 등 별도 버튼' },
            ]}
            onChange={(v) => set('mobileTrigger', v)}
          />
          {node.props.mobileTrigger === 'external' && (
            <p className="panel-help">
              헤더에 버튼을 넣고 창 액션 대상을 이 패널로 지정하세요. 모바일에서만 표시하도록 설정할
              수 있습니다.
            </p>
          )}
        </>
      )}
      {node.type === 'drawer' && (
        <>
          {toggle('isOpen', '처음부터 열기')}
          {toggle('closeOnBackdrop', '배경 클릭으로 닫기', true)}
        </>
      )}
      {node.type === 'searchBox' && (
        <>
          <label>
            검색 안내
            <input
              maxLength={300}
              value={node.props.placeholder ?? '메뉴 검색'}
              onChange={(e) => set('placeholder', e.target.value)}
            />
          </label>
          <label>
            검색할 메뉴
            <select
              value={node.props.searchTargetId ?? ''}
              onChange={(e) =>
                onUpdate((n) => {
                  if (e.target.value) n.props.searchTargetId = e.target.value;
                  else delete n.props.searchTargetId;
                })
              }
            >
              <option value="">연결 안 함</option>
              {targets.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </label>
          <ChoiceField
            label="검색창 정렬"
            value={node.props.searchAlign ?? 'right'}
            options={[
              { value: 'left', label: '왼쪽', icon: <AlignLeft size={18} /> },
              { value: 'center', label: '가운데', icon: <AlignCenter size={18} /> },
              { value: 'right', label: '오른쪽', icon: <AlignRight size={18} /> },
            ]}
            onChange={(v) => set('searchAlign', v)}
          />
          {number('searchWidth', '검색창 너비', 240, 120, 800)}
          <ChoiceField
            label="모바일 검색창"
            value={node.props.mobileSearch ?? 'icon'}
            options={[
              { value: 'input', label: '입력창 유지' },
              { value: 'icon', label: '아이콘으로 접기' },
            ]}
            onChange={(v) => set('mobileSearch', v)}
          />
        </>
      )}
      {node.type === 'navbar' && (
        <>
          {!node.props.menuItems ? (
            <Button
              variant="secondary"
              type="button"
              onClick={() =>
                set(
                  'menuItems',
                  (node.props.items ?? '')
                    .split('\n')
                    .filter(Boolean)
                    .map((label) => ({ ...makeItem(), label })),
                )
              }
            >
              아이콘·하위 메뉴 편집 사용
            </Button>
          ) : (
            <>
              {node.props.menuItems.map((item, i) => itemEditor(item, i))}
              <Button
                variant="secondary"
                type="button"
                disabled={node.props.menuItems.length >= 100}
                onClick={() => mutateMenu((items) => items.push(makeItem()))}
              >
                <Plus size={14} />
                메뉴 추가
              </Button>
            </>
          )}
        </>
      )}
      {node.type === 'carousel' && (
        <>
          <p className="panel-help">
            한 요소가 한 장입니다. 아래 목록에서 선택한 슬라이드만 캔버스에 표시됩니다. 카드 내부는
            레이어에서 선택해 편집하세요.
          </p>
          <ChoiceField
            label="캐러셀 조작 방식"
            value={node.props.carouselVariant ?? 'controls'}
            options={[
              { value: 'controls', label: '하단 버튼' },
              { value: 'arrows', label: '이미지 위 화살표' },
              { value: 'regions', label: '좌우 영역 클릭' },
            ]}
            onChange={(v) => set('carouselVariant', v)}
          />
          <ChoiceField
            label="슬라이드 크기"
            value={node.props.carouselSizing ?? 'ratio'}
            options={[
              { value: 'ratio', label: '비율 유지' },
              { value: 'fixed', label: '높이 고정' },
            ]}
            onChange={(v) => set('carouselSizing', v)}
          />
          {node.props.carouselSizing === 'fixed' ? (
            number('carouselHeight', '슬라이드 높이', 320, 80, 1600)
          ) : (
            <ChoiceField
              label="이미지 비율"
              value={node.props.carouselRatio ?? '16/9'}
              options={['16/9', '4/3', '1/1', '21/9'].map((value) => ({
                value,
                label: value.replace('/', ':'),
              }))}
              onChange={(v) => set('carouselRatio', v)}
            />
          )}
          <ChoiceField
            label="이미지 맞춤"
            value={node.props.carouselFit ?? 'cover'}
            options={[
              { value: 'cover', label: '영역 채우기' },
              { value: 'contain', label: '전체 이미지' },
            ]}
            onChange={(v) => set('carouselFit', v)}
          />
          {toggle('carouselLoop', '마지막에서 처음으로 반복', true)}
          {node.props.carouselVariant !== 'regions' &&
            toggle('carouselArrows', '이전·다음 버튼', true)}
          {toggle('carouselDots', '페이지 점 표시', true)}
          {toggle('carouselCounter', '장수 표시', true)}
          {toggle('carouselAutoplay', '자동 재생')}
          {node.props.carouselAutoplay &&
            number('carouselInterval', '전환 간격 (밀리초)', 5000, 2000, 30000)}
          <div className="carousel-slide-list">
            {node.children.map((slide, index) => (
              <div className="carousel-slide-editor" key={slide.id}>
                <Button
                  variant="secondary"
                  type="button"
                  aria-pressed={
                    (carouselEditing.slides[node.id] ?? node.children[0]?.id) === slide.id
                  }
                  onClick={() => carouselEditing.select(node.id, slide.id)}
                >
                  {slide.type === 'image' && slide.props.src && (
                    <img src={slide.props.src} alt="" />
                  )}
                  슬라이드 {index + 1} · {slide.name}
                </Button>
                {slide.type === 'image' && (
                  <fieldset disabled={slide.locked}>
                    <label>
                      <AddressField
                        field="src"
                        label={'슬라이드 ' + (index + 1) + ' 이미지 URL'}
                        value={slide.props.src ?? ''}
                        onCommit={(src) =>
                          onUpdate((n) => {
                            n.children[index].props.src = src;
                            delete n.children[index].props.attachment;
                          })
                        }
                      />
                    </label>
                  </fieldset>
                )}
                <div className="menu-item-actions">
                  <Button
                    variant="secondary"
                    type="button"
                    aria-label={'슬라이드 ' + (index + 1) + ' 앞으로'}
                    disabled={index === 0 || slide.locked}
                    onClick={() =>
                      onUpdate((n) => {
                        [n.children[index - 1], n.children[index]] = [
                          n.children[index],
                          n.children[index - 1],
                        ];
                      })
                    }
                  >
                    <ArrowUp size={14} />
                  </Button>
                  <Button
                    variant="secondary"
                    type="button"
                    aria-label={'슬라이드 ' + (index + 1) + ' 뒤로'}
                    disabled={index === node.children.length - 1 || slide.locked}
                    onClick={() =>
                      onUpdate((n) => {
                        [n.children[index + 1], n.children[index]] = [
                          n.children[index],
                          n.children[index + 1],
                        ];
                      })
                    }
                  >
                    <ArrowDown size={14} />
                  </Button>
                  <Button
                    variant="secondary"
                    type="button"
                    aria-label={'슬라이드 ' + (index + 1) + ' 삭제'}
                    disabled={slide.locked}
                    onClick={() =>
                      onUpdate((n) => {
                        n.children.splice(index, 1);
                      })
                    }
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                const image = createNode('image');
                image.props.text = '슬라이드 이미지';
                onUpdate((n) => {
                  n.children.push(image);
                });
                carouselEditing.select(node.id, image.id);
              }}
            >
              <Plus size={14} />
              이미지 슬라이드 추가
            </Button>
          </div>
        </>
      )}
    </>
  );
}
