import type { Meta, StoryObj } from '@storybook/react-vite';
import { createNode } from '@jjapgma/ui-spec';
import { ChatElement } from './ChatElement';
const node = createNode('chat');
export default {
  title: '요소/채팅',
  component: ChatElement,
  args: { node },
  decorators: [
    (Story) => (
      <div style={{ width: '100%', maxWidth: 420, height: 600 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ChatElement>;
export const Default: StoryObj<typeof ChatElement> = {};
export const Waiting: StoryObj<typeof ChatElement> = {
  args: { node: { ...node, props: { ...node.props, chatLoading: true } } },
};
export const LongConversation: StoryObj<typeof ChatElement> = {
  args: {
    node: {
      ...node,
      props: {
        ...node.props,
        chatMessages: Array.from({ length: 24 }, (_, i) => ({
          role: i % 2 ? ('assistant' as const) : ('user' as const),
          time: '오후 2:30',
          content:
            i % 2
              ? '### 화면 구성\n\n**좋은 생각이에요.** 다음 내용을 확인해 주세요.\n\n| 요소 | 역할 |\n| --- | --- |\n| 입력창 | 메시지 작성 |\n| 버튼 | 전송 |\n\n```ts\nconst ready = true;\n```'
              : '대화 화면을 만들어 주세요.',
        })),
      },
    },
  },
};
