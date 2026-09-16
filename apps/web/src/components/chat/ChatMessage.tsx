import { useState, type ReactNode } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LoaderCircle, Copy, Check } from 'lucide-react';
import './chat.css';

export function ChatMessage({
  role,
  content,
  time,
  pending,
  failed,
  children,
  copyable = false,
}: {
  role: 'user' | 'assistant';
  content: string;
  time?: string | null;
  pending?: boolean;
  failed?: boolean;
  children?: ReactNode;
  copyable?: boolean;
}) {
  const [copyState, setCopyState] = useState('');
  async function copy() {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(content);
      else {
        const focused = document.activeElement as HTMLElement | null;
        const input = document.createElement('textarea');
        input.value = content;
        input.readOnly = true;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.append(input);
        input.select();
        try {
          if (!document.execCommand('copy')) throw new Error('copy');
        } finally {
          input.remove();
          focused?.focus();
        }
      }
      setCopyState('복사됨');
    } catch {
      setCopyState('복사하지 못했습니다. 텍스트를 선택해 복사해 주세요.');
    }
  }
  const date = time ? new Date(time) : undefined;
  const validDate = date && Number.isFinite(date.getTime());
  return (
    <article
      className={`chat-message chat-message-${role}${failed ? ' chat-message-failed' : ''}`}
      aria-label={role === 'user' ? '내 메시지' : '답변'}
    >
      <div className="chat-bubble">
        {children}
        {pending ? (
          <div className="chat-pending" role="status">
            <LoaderCircle size={16} aria-hidden="true" />
            <span>답변을 준비하고 있습니다…</span>
          </div>
        ) : role === 'assistant' ? (
          <div className="chat-markdown">
            <Markdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ children, ...props }) => (
                  <a {...props} target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
                table: ({ children }) => (
                  <div className="chat-table-scroll">
                    <table>{children}</table>
                  </div>
                ),
              }}
            >
              {content}
            </Markdown>
          </div>
        ) : (
          <p className="chat-plain">{content}</p>
        )}
      </div>
      {copyable && !pending && content && (
        <div className="chat-copy-row">
          <button
            type="button"
            className="chat-copy"
            aria-label={role === 'user' ? '내 메시지 복사' : '답변 복사'}
            title="Markdown 원문 복사"
            onClick={() => void copy()}
          >
            {copyState === '복사됨' ? <Check size={13} /> : <Copy size={13} />}복사
          </button>
          {copyState && <small role="status">{copyState}</small>}
        </div>
      )}
      {time && !pending && (
        <time
          dateTime={validDate ? date.toISOString() : undefined}
          title={validDate ? date.toLocaleString('ko-KR') : time}
        >
          {validDate
            ? date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
            : time}
        </time>
      )}
    </article>
  );
}
