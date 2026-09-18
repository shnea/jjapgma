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
const feedback = createNode('container');
feedback.style = { direction: 'column', padding: 0, gap: 20 };
feedback.children = (['info', 'success', 'warning', 'error'] as const).map((stateType) => {
  const node = createNode('alert');
  node.props.stateType = stateType;
  node.props.text = {
    info: '변경 내용을 확인한 뒤 저장해 주세요.',
    success: '변경 사항을 저장했습니다.',
    warning: '저장하지 않은 변경 사항이 있습니다.',
    error: '저장하지 못했습니다. 다시 시도해 주세요.',
  }[stateType];
  return node;
});
export const Feedback: Story = { args: { node: feedback } };
