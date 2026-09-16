import { useEffect, useRef, useState } from 'react';
import type { UiNode } from '@jjapgma/ui-spec';
import { ChatMessage } from '../../../components/chat/ChatMessage';
import { ChatComposer } from '../../../components/chat/ChatComposer';

export function ChatElement({ node }: { node: UiNode }) {
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState<NonNullable<UiNode['props']['chatMessages']>>([]);
  const transcript = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [sent, node.props.chatLoading]);
  const messages = [...(node.props.chatMessages ?? []), ...sent];
  return (
    <div className="element-chat">
      <header className="element-chat-header">
        <strong>{node.props.text}</strong>
      </header>
      <div
        className="element-chat-transcript"
        ref={transcript}
        tabIndex={0}
        role="log"
        aria-label="채팅 메시지"
      >
        {messages.map((message, i) => (
          <ChatMessage
            key={i}
            {...message}
            time={node.props.showTimestamps === false ? undefined : message.time}
          />
        ))}
        {node.props.chatLoading && <ChatMessage role="assistant" content="" pending />}
      </div>
      {sent.length > 0 && (
        <p className="chat-sample-note" role="status">
          미리보기 메시지입니다. 실제 답변은 채팅 서비스 연결 후 제공됩니다.
        </p>
      )}
      <ChatComposer
        value={draft}
        onChange={setDraft}
        placeholder={node.props.placeholder}
        disabled={node.props.disabled || sent.length >= 50}
        pending={node.props.chatLoading}
        onSend={() => {
          if (!draft.trim()) return;
          setSent((items) => [
            ...items,
            { role: 'user', content: draft, time: new Date().toISOString() },
          ]);
          setDraft('');
        }}
      />
    </div>
  );
}
