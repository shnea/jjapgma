import { Children, useEffect, useRef, useState, type ReactNode } from 'react';
import { findNode, type UiNode } from '@jjapgma/ui-spec';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import './wizard.css';

export function Wizard({
  node,
  selectedId,
  preview,
  children,
}: {
  node: UiNode;
  selectedId?: string;
  preview: boolean;
  children: ReactNode;
}) {
  const [step, setStep] = useState(0);
  const [complete, setComplete] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const count = node.children.length;
  const current = Math.max(0, Math.min(step, count - 1));
  const selectedStep = selectedId
    ? node.children.findIndex((child) => !!findNode(child, selectedId))
    : -1;
  useEffect(() => {
    if (!preview && selectedStep >= 0) {
      setStep(selectedStep);
      setComplete(false);
    }
  }, [selectedId, selectedStep, preview]);
  function next() {
    if (preview && panel.current) {
      const fields = panel.current.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >(`[data-wizard-step="${current}"] :is(input,select,textarea)`);
      for (const field of fields) if (!field.reportValidity()) return;
    }
    if (current < count - 1) setStep(current + 1);
    else setComplete(true);
  }
  return (
    <section className="element-wizard" aria-label={node.props.text || '단계별 입력'}>
      {!count ? (
        <p>컨테이너를 추가하면 하나의 입력 단계가 됩니다.</p>
      ) : (
        <>
          <ol className="wizard-steps">
            {node.children.map((child, index) => (
              <li key={child.id}>
                <button
                  type="button"
                  aria-current={!complete && current === index ? 'step' : undefined}
                  disabled={preview && index > current}
                  onClick={(event) => {
                    event.stopPropagation();
                    setStep(index);
                    setComplete(false);
                  }}
                >
                  <span>{index < current || complete ? <Check size={14} /> : index + 1}</span>
                  {child.name || `단계 ${index + 1}`}
                </button>
              </li>
            ))}
          </ol>
          {complete && (
            <div className="wizard-complete" role="status">
              <Check size={32} />
              <p>{node.props.wizardCompletionText || '입력 단계를 모두 확인했습니다.'}</p>
            </div>
          )}
          <div ref={panel} hidden={complete}>
            {Children.toArray(children).map((child, index) => (
              <div
                key={node.children[index]?.id ?? index}
                data-wizard-step={index}
                hidden={current !== index}
              >
                {child}
              </div>
            ))}
          </div>
          <div className="wizard-actions" onClick={(event) => event.stopPropagation()}>
            {complete ? (
              <button type="button" onClick={() => setComplete(false)}>
                입력 다시 확인
              </button>
            ) : (
              <>
                <button type="button" disabled={current === 0} onClick={() => setStep(current - 1)}>
                  <ArrowLeft size={16} />
                  이전
                </button>
                <span>
                  {current + 1} / {count}
                </span>
                <button type="button" className="wizard-next" onClick={next}>
                  {current === count - 1 ? '완료' : '다음'}
                  <ArrowRight size={16} />
                </button>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
