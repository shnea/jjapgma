import { useRef, type ReactNode } from 'react';
import { Send, LoaderCircle } from 'lucide-react';
import './chat.css';

export function ChatComposer({
  value,
  onChange,
  onSend,
  disabled,
  pending,
  label = '메시지',
  placeholder = '메시지를 입력하세요',
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  pending?: boolean;
  label?: string;
  placeholder?: string;
  children?: ReactNode;
}) {
  const composing = useRef(false);
  function submit() {
    if (!disabled && !pending && value.trim()) onSend();
  }
  return (
    <form
      className="chat-composer"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {children}
      <textarea
        aria-label={label}
        rows={3}
        maxLength={6000}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={() => {
          composing.current = false;
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (
            e.key === 'Enter' &&
            !e.shiftKey &&
            !e.ctrlKey &&
            !e.metaKey &&
            !e.nativeEvent.isComposing &&
            !composing.current &&
            e.nativeEvent.keyCode !== 229
          ) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <div className="chat-composer-actions">
        <small>Enter 전송 · Shift+Enter 줄바꿈</small>
        <button type="submit" className="chat-send" disabled={disabled || pending || !value.trim()}>
          {pending ? (
            <LoaderCircle size={16} className="chat-spinning" aria-hidden="true" />
          ) : (
            <Send size={16} aria-hidden="true" />
          )}
          보내기
        </button>
      </div>
    </form>
  );
}
