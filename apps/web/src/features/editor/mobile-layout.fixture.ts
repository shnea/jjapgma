import { createNode, createSpec } from '@jjapgma/ui-spec';

export function mobileLayoutFixture() {
  const spec = createSpec();
  spec.root.id = 'mobile-page';
  spec.root.style = { direction: 'column', align: 'center', padding: 16, gap: 16 };
  const hero = createNode('card');
  hero.id = 'mobile-hero';
  hero.style = { ...hero.style, direction: 'row', width: '900px', gap: 32 };
  const image = createNode('image');
  image.style = { width: '220px', height: '160px' };
  const details = createNode('container');
  details.id = 'mobile-details';
  details.style = { direction: 'column', padding: 0, gap: 16, grow: true, minWidth: '400px' };
  const heading = createNode('heading');
  heading.props.text = '10년 차 개발자입니다';
  const text = createNode('text');
  text.props.text = 'Java 및 Spring 기반 백엔드 개발자로 다양한 프로젝트를 설계합니다.';
  const actions = createNode('container');
  actions.id = 'mobile-actions';
  actions.style = { direction: 'row', padding: 0, gap: 12 };
  for (const label of [
    'very.long.contact.address@example.com',
    '포트폴리오 다운로드 및 자세히 보기',
  ]) {
    const button = createNode('button');
    button.props.text = label;
    actions.children.push(button);
  }
  details.children.push(heading, text, actions);
  hero.children.push(image, details);
  const grid = createNode('grid');
  grid.id = 'mobile-grid';
  grid.style = { gridColumns: 5, padding: 0, gap: 16 };
  for (const name of ['FRONTEND', 'BACKEND', 'DATABASE', 'LANGUAGES', 'DEVOPS']) {
    const card = createNode('card');
    const title = createNode('heading');
    title.props.text = name;
    const body = createNode('text');
    body.props.text = 'LongUnbrokenContentThatMustRemainWithinTheCardWithoutClipping';
    card.children.push(title, body);
    grid.children.push(card);
  }
  spec.root.children.push(hero, grid);
  return spec;
}
