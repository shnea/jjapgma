import type { Meta, StoryObj } from '@storybook/react-vite';
import { NodeRenderer } from './NodeRenderer';
import { mobileLayoutFixture } from './mobile-layout.fixture';

const meta = {
  title: '빌더/모바일 기본 배치',
  component: NodeRenderer,
  parameters: { layout: 'fullscreen' },
  args: { node: mobileLayoutFixture().root, breakpoint: 'mobile', preview: true, root: true },
  decorators: [
    (Story) => (
      <div style={{ width: '100%', maxWidth: 960 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NodeRenderer>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Mobile: Story = {};
export const Desktop: Story = { args: { breakpoint: 'desktop' } };
const explicit = mobileLayoutFixture().root;
explicit.children[1].responsive.mobile = { gridColumns: 2 };
export const TwoColumns: Story = { args: { node: explicit } };
