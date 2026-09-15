import type { Meta, StoryObj } from '@storybook/react-vite';
import { createNode } from '@jjapgma/ui-spec';
import { NodeRenderer } from './NodeRenderer';
const input = createNode('input');
input.id = 'story-input';
input.props.text = '이메일';
input.props.placeholder = 'hello@example.com';
input.props.required = true;
const meta = {
  title: '빌더/화면 요소',
  component: NodeRenderer,
  args: { node: input, breakpoint: 'desktop', preview: true },
  decorators: [
    (Story) => (
      <div style={{ padding: 32, width: 360 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NodeRenderer>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Input: Story = {};
export const Disabled: Story = {
  args: { node: { ...input, props: { ...input.props, disabled: true } } },
};
export const MobileHidden: Story = {
  args: { breakpoint: 'mobile', node: { ...input, responsive: { mobile: { hidden: true } } } },
};
export const Selected: Story = { args: { preview: false, selectedId: input.id } };
