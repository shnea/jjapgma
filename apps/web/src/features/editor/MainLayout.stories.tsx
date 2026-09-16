import { useState, type CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  createTemplate,
  createNode,
  findNode,
  type Breakpoint,
  type UiNode,
} from '@jjapgma/ui-spec';
import { NodeRenderer } from './NodeRenderer';
import { Inspector } from './Inspector';
import { CarouselEditingProvider } from './CarouselEditing';

function demo() {
  const spec = createTemplate('main');
  const panel = spec.root.children[1].children[0];
  panel.children[0].props.menuItems![2].children = [
    {
      id: 'recent',
      label: '최근 프로젝트',
      icon: 'folder',
      children: [{ id: 'design', label: '디자인 프로젝트', icon: 'folder' }],
    },
    { id: 'archived', label: '보관함', icon: 'folder' },
  ];
  const carousel = createNode('carousel');
  carousel.id = 'demo-carousel';
  carousel.props.text = '소식';
  carousel.children = [
    '프로젝트를 시작하세요',
    '팀과 함께 작업하세요',
    '새로운 소식을 확인하세요',
  ].map((text, i) => {
    const card = createNode('card');
    card.style = {
      direction: 'column',
      background: ['#eef2ff', '#ecfdf5', '#fff7ed'][i],
      padding: 32,
      minHeight: '180px',
    };
    const title = createNode('heading');
    title.props.text = text;
    const input = createNode('input');
    input.props.text = `슬라이드 ${i + 1} 입력`;
    card.children = [title, input];
    return card;
  });
  const field = createNode('input');
  field.props.text = '본문 입력';
  spec.root.children[1].children[1].children.push(field, carousel);
  return spec;
}
function MainExample() {
  return (
    <CarouselEditingProvider>
      <MainContent />
    </CarouselEditingProvider>
  );
}
function MainContent() {
  const [spec, setSpec] = useState(demo);
  const [device, setDevice] = useState<Breakpoint>('desktop');
  const [preview, setPreview] = useState(true);
  const [inspect, setInspect] = useState(false);
  const [subject, setSubject] = useState('panel');
  const [selected, setSelected] = useState<string>();
  const [zoom, setZoom] = useState(1);
  const panel = spec.root.children[1].children[0];
  const inspected =
    subject === 'carousel'
      ? spec.root.children[1].children[1].children.at(-1)!
      : subject === 'menu'
        ? panel.children[0]
        : panel;
  const setPanel = (fn: (n: UiNode) => void) =>
    setSpec((old) => {
      const next = structuredClone(old);
      fn(next.root.children[1].children[0]);
      return next;
    });
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: 12 }}>
        <label>
          배율
          <select aria-label="배율" value={zoom} onChange={(e) => setZoom(Number(e.target.value))}>
            <option value={1}>100%</option>
            <option value={0.5}>50%</option>
            <option value={1.5}>150%</option>
          </select>
        </label>
        <button
          onClick={() =>
            setSpec((old) => ({
              ...old,
              theme: {
                ...old.theme!,
                primary: '#a78bfa',
                onPrimary: '#171127',
                background: '#111827',
                surface: '#1f2937',
                text: '#f9fafb',
                muted: '#cbd5e1',
                border: '#64748b',
              },
            }))
          }
        >
          어두운 테마
        </button>
        <button onClick={() => setDevice(device === 'mobile' ? 'desktop' : 'mobile')}>
          {device === 'mobile' ? '데스크톱 보기' : '모바일 보기'}
        </button>
        <label>
          <input type="checkbox" checked={preview} onChange={(e) => setPreview(e.target.checked)} />
          미리보기
        </label>
        <label>
          <input
            type="checkbox"
            checked={panel.props.panelSide === 'right'}
            onChange={(e) =>
              setPanel((n) => {
                n.props.panelSide = e.target.checked ? 'right' : 'left';
              })
            }
          />
          오른쪽 패널
        </label>
        <label>
          <input
            type="checkbox"
            checked={panel.props.panelMode === 'fixed'}
            onChange={(e) =>
              setPanel((n) => {
                n.props.panelMode = e.target.checked ? 'fixed' : 'collapsible';
              })
            }
          />
          항상 펼침
        </label>
        <label>
          <input
            type="checkbox"
            checked={panel.props.collapseMode === 'hidden'}
            onChange={(e) =>
              setPanel((n) => {
                n.props.collapseMode = e.target.checked ? 'hidden' : 'rail';
              })
            }
          />
          완전히 접기
        </label>
        <label>
          <input
            type="checkbox"
            checked={panel.responsive.mobile?.hidden ?? false}
            onChange={(e) =>
              setPanel((n) => {
                n.responsive.mobile = { ...n.responsive.mobile, hidden: e.target.checked };
              })
            }
          />
          모바일 패널 숨김
        </label>
        <label>
          <input type="checkbox" checked={inspect} onChange={(e) => setInspect(e.target.checked)} />
          속성 편집
        </label>
        <label>
          <input
            type="checkbox"
            onChange={(e) =>
              setPanel((n) => {
                n.children[0].props.menuItems = e.target.checked
                  ? [
                      ...demo().root.children[1].children[0].children[0].props.menuItems!,
                      ...Array.from({ length: 40 }, (_, i) => ({
                        id: 'extra-' + i,
                        label: '추가 메뉴 ' + i,
                        icon: 'folder',
                      })),
                    ]
                  : demo().root.children[1].children[0].children[0].props.menuItems;
              })
            }
          />
          긴 메뉴
        </label>
        <label>
          편집 대상
          <select value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="panel">패널</option>
            <option value="menu">메뉴</option>
            <option value="carousel">캐러셀</option>
          </select>
        </label>
      </div>
      <div
        className="main-story-viewport"
        style={
          {
            position: 'relative',
            width: (device === 'mobile' ? 390 : 1000) * zoom,
            maxWidth: '100%',
            height: 650,
            overflow: 'auto',
            border: '1px solid #e2e8f0',
            '--page-viewport-height': '648px',
          } as CSSProperties
        }
      >
        <div style={{ zoom }}>
          <NodeRenderer
            root
            node={spec.root}
            theme={spec.theme}
            breakpoint={device}
            preview={preview}
            selectedId={selected}
            onSelect={setSelected}
          />
        </div>
      </div>
      {inspect && (
        <div style={{ width: 360 }}>
          <Inspector
            node={inspected}
            pageRoot={spec.root}
            breakpoint={device}
            disabled={false}
            root={false}
            onUpdate={(fn) =>
              setSpec((old) => {
                const next = structuredClone(old);
                fn(findNode(next.root, inspected.id)!);
                return next;
              })
            }
            onDuplicate={() => {}}
            onDelete={() => {}}
            onReorder={() => {}}
          />
        </div>
      )}
    </div>
  );
}
function DrawerExample() {
  const [spec] = useState(() => {
    const root = createNode('container');
    root.style = { minHeight: '450px', padding: 24 };
    const drawer = createNode('drawer');
    drawer.props.text = '필터 서랍';
    drawer.children = [createNode('input')];
    const trigger = createNode('button');
    trigger.props = { text: '필터 열기', overlayAction: { type: 'open', targetId: drawer.id } };
    root.children = [trigger, drawer];
    return root;
  });
  return (
    <div style={{ width: 700, maxWidth: '100%' }}>
      <NodeRenderer root node={spec} preview breakpoint="desktop" />
    </div>
  );
}
const meta = { title: '빌더/메인 레이아웃', component: MainExample } satisfies Meta<
  typeof MainExample
>;
export default meta;
export const Workspace: StoryObj<typeof meta> = {};
export const Drawer: StoryObj<typeof meta> = { render: DrawerExample };
function CarouselExample() {
  const [node, setNode] = useState(() => {
    const n = createNode('carousel');
    n.children = [1, 2, 3].map((i) => {
      const img = createNode('image');
      img.name = '이미지 ' + i;
      img.props.text = '이미지 ' + i;
      img.props.src = '/placeholder.svg';
      return img;
    });
    return n;
  });
  const [preview, setPreview] = useState(false);
  return (
    <CarouselEditingProvider>
      <div style={{ display: 'flex', gap: 24, alignItems: 'start' }}>
        <div style={{ width: 640 }}>
          <label>
            <input
              type="checkbox"
              checked={preview}
              onChange={(e) => setPreview(e.target.checked)}
            />
            미리보기
          </label>
          <NodeRenderer node={node} breakpoint="desktop" preview={preview} />
        </div>
        <div style={{ width: 360 }}>
          <Inspector
            node={node}
            pageRoot={node}
            breakpoint="desktop"
            disabled={false}
            root={false}
            onUpdate={(fn) =>
              setNode((old) => {
                const next = structuredClone(old);
                fn(next);
                return next;
              })
            }
            onDuplicate={() => {}}
            onDelete={() => {}}
            onReorder={() => {}}
          />
        </div>
      </div>
    </CarouselEditingProvider>
  );
}
export const CarouselImages: StoryObj<typeof meta> = { render: CarouselExample };
function StandalonePanel() {
  const [node] = useState(() => {
    const root = createNode('container');
    root.style = { direction: 'row', minHeight: '300px', padding: 0 };
    const nested = createNode('container');
    nested.style = { padding: 0, direction: 'row' };
    const panel = createNode('sidePanel');
    const menu = createNode('navbar');
    menu.props.menuItems = [{ id: 'home', label: '독립 메뉴', icon: 'home' }];
    panel.children = [menu];
    nested.children = [panel];
    root.children = [nested];
    return root;
  });
  return (
    <div style={{ width: 700 }}>
      <NodeRenderer node={node} root preview breakpoint="desktop" />
    </div>
  );
}
export const PanelOnly: StoryObj<typeof meta> = { render: StandalonePanel };

function ScrollExample() {
  const [spec, setSpec] = useState(() => {
    const spec = createTemplate('main');
    const content = spec.root.children[1].children[1];
    content.style = {
      ...content.style,
      height: '400px',
      overflowX: 'auto',
      overflowY: 'auto',
      minWidth: '0px',
    };
    const block = createNode('container');
    block.style = { width: '1400px', height: '900px', shrink: false, background: 'theme:surface' };
    const text = createNode('text');
    text.props.text = '스크롤 영역';
    block.children = [text];
    content.children = [block];
    const menu = spec.root.children[1].children[0].children[0];
    menu.props.menuItems = Array.from({ length: 40 }, (_, i) => ({
      id: 'menu' + i,
      label: '메뉴 ' + i,
    }));
    return spec;
  });
  const content = spec.root.children[1].children[1];
  return (
    <div style={{ display: 'flex', gap: 20 }}>
      <div
        style={{ width: 700, flexShrink: 0, '--page-viewport-height': '400px' } as CSSProperties}
      >
        <NodeRenderer node={spec.root} root theme={spec.theme} preview breakpoint="desktop" />
      </div>
      <div style={{ width: 360 }}>
        <Inspector
          node={content}
          pageRoot={spec.root}
          breakpoint="desktop"
          disabled={false}
          root={false}
          onUpdate={(fn) =>
            setSpec((old) => {
              const next = structuredClone(old);
              fn(next.root.children[1].children[1]);
              return next;
            })
          }
          onDuplicate={() => {}}
          onDelete={() => {}}
          onReorder={() => {}}
        />
      </div>
    </div>
  );
}
export const IndependentScroll: StoryObj<typeof meta> = { render: ScrollExample };
