import type { Meta, StoryObj } from '@storybook/react-vite';
import { AiChatPanel } from './AiChatPanel';
export default {
  title: '빌더/AI 채팅',
  component: AiChatPanel,
  args: {
    projectId: 'demo',
    pageId: 'page',
    pageName: '회원 목록',
    selectedId: 'button',
    selectedName: '검색 버튼',
    revision: 1,
    breakpoint: 'desktop',
    dirty: false,
    readOnly: false,
    busy: false,
    onSave: async () => true,
    onApply: async () => {},
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: 380,
          maxWidth: '100%',
          height: 'min(800px, calc(100dvh - 32px))',
          overflow: 'hidden',
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AiChatPanel>;
export const Default: StoryObj<typeof AiChatPanel> = {};
export const Unsaved: StoryObj<typeof AiChatPanel> = { args: { dirty: true } };
export const Viewer: StoryObj<typeof AiChatPanel> = { args: { readOnly: true } };
export const NewerPage: StoryObj<typeof AiChatPanel> = { args: { revision: 3 } };
