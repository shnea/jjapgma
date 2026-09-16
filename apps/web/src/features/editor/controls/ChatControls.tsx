import type { UiNode } from '@jjapgma/ui-spec';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export function ChatControls({
  node,
  onUpdate,
}: {
  node: UiNode;
  onUpdate: (change: (node: UiNode) => void) => void;
}) {
  const messages = node.props.chatMessages ?? [];
  return (
    <div className="chat-controls">
      <label className="check-field">
        <input
          type="checkbox"
          checked={node.props.showTimestamps !== false}
          onChange={(e) =>
            onUpdate((n) => {
              n.props.showTimestamps = e.target.checked;
            })
          }
        />
        대화 시간 표시
      </label>
      <label className="check-field">
        <input
          type="checkbox"
          checked={!!node.props.chatLoading}
          onChange={(e) =>
            onUpdate((n) => {
              n.props.chatLoading = e.target.checked;
            })
          }
        />
        응답 대기 표시
      </label>
      <p className="panel-help">
        예시 메시지를 편집하세요. 실제 AI 연결은 우측 AI 탭에서 사용합니다.
      </p>
      {messages.map((message, i) => (
        <fieldset key={i} style={{ marginTop: 12 }}>
          <legend>메시지 {i + 1}</legend>
          <div className="choice-buttons" role="group" aria-label={`메시지 ${i + 1} 위치`}>
            <Button
              variant={message.role === 'assistant' ? 'secondary' : 'ghost'}
              aria-pressed={message.role === 'assistant'}
              onClick={() =>
                onUpdate((n) => {
                  n.props.chatMessages![i].role = 'assistant';
                })
              }
            >
              답변 · 왼쪽
            </Button>
            <Button
              variant={message.role === 'user' ? 'secondary' : 'ghost'}
              aria-pressed={message.role === 'user'}
              onClick={() =>
                onUpdate((n) => {
                  n.props.chatMessages![i].role = 'user';
                })
              }
            >
              나 · 오른쪽
            </Button>
          </div>
          <label>
            메시지 내용
            <textarea
              rows={3}
              maxLength={6000}
              value={message.content}
              onChange={(e) =>
                onUpdate((n) => {
                  n.props.chatMessages![i].content = e.target.value;
                })
              }
            />
          </label>
          <label>
            표시 시간
            <input
              maxLength={40}
              value={message.time ?? ''}
              placeholder="오후 2:30"
              onChange={(e) =>
                onUpdate((n) => {
                  n.props.chatMessages![i].time = e.target.value;
                })
              }
            />
          </label>
          <Button
            variant="ghost"
            aria-label={`메시지 ${i + 1} 삭제`}
            onClick={() =>
              onUpdate((n) => {
                n.props.chatMessages!.splice(i, 1);
              })
            }
          >
            <Trash2 size={14} />
            삭제
          </Button>
        </fieldset>
      ))}
      <Button
        variant="secondary"
        disabled={messages.length >= 50}
        onClick={() =>
          onUpdate((n) => {
            (n.props.chatMessages ??= []).push({
              role: 'assistant',
              content: '새 메시지',
              time: '오후 2:32',
            });
          })
        }
      >
        <Plus size={14} />
        메시지 추가
      </Button>
    </div>
  );
}
