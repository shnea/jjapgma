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
export const CloseConversation: StoryObj<typeof AiChatPanel> = {
  parameters: {
    docs: {
      description: {
        story:
          '현재 대화의 닫기 버튼으로 목록에서 제외합니다. 새 대화와 응답 진행 중에는 닫기가 비활성화되며 실패하면 대화를 유지합니다. 상호작용 검사는 chat.spec.ts의 API fixture를 사용합니다.',
      },
    },
  },
};
