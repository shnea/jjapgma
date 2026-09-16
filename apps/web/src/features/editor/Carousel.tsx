import { Children, useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { findNode, type UiNode } from '@jjapgma/ui-spec';
import { useCarouselEditing } from './CarouselEditing';

export function Carousel({
  node,
  preview,
  selectedId,
  children,
}: {
  node: UiNode;
  preview: boolean;
  selectedId?: string;
  children: ReactNode;
}) {
  const slides = Children.toArray(children);
  const count = node.children.length;
  const editing = useCarouselEditing();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [reduced, setReduced] = useState(false);
  const pointer = useRef<number | null>(null);
  const swiped = useRef(false);
  const editedIndex = node.children.findIndex((n) => n.id === editing.slides[node.id]);
  const previousPreview = useRef(preview);
  useEffect(() => {
    if (previousPreview.current !== preview && preview && editedIndex >= 0) setIndex(editedIndex);
    previousPreview.current = preview;
  }, [preview, editedIndex]);
  const selectedSlide =
    !preview && selectedId ? node.children.findIndex((n) => findNode(n, selectedId)) : -1;
  const current =
    !preview && editedIndex >= 0 ? editedIndex : Math.min(index, Math.max(0, count - 1));
  const loop = node.props.carouselLoop !== false;
  const variant = node.props.carouselVariant ?? 'controls';
  const select = (next: number) => {
    setIndex(next);
    if (!preview && node.children[next]) editing.select(node.id, node.children[next].id);
    setPaused(true);
  };
  const move = (step: number) => {
    if (count)
      select(
        loop ? (current + step + count) % count : Math.max(0, Math.min(count - 1, current + step)),
      );
  };
  const selectionRef = useRef(selectedId);
  useEffect(() => {
    if (selectionRef.current === selectedId) return;
    selectionRef.current = selectedId;
    if (selectedSlide >= 0) {
      setIndex(selectedSlide);
      editing.select(node.id, node.children[selectedSlide].id);
    }
  }, [selectedId, selectedSlide, editing, node.id, node.children]);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (
      !preview ||
      count < 2 ||
      !node.props.carouselAutoplay ||
      paused ||
      hover ||
      focus ||
      reduced
    )
      return;
    const timer = window.setInterval(
      () => setIndex((old) => (loop ? (old + 1) % count : Math.min(count - 1, old + 1))),
      node.props.carouselInterval ?? 5000,
    );
    return () => clearInterval(timer);
  }, [
    preview,
    count,
    node.props.carouselAutoplay,
    node.props.carouselInterval,
    paused,
    hover,
    focus,
    reduced,
    loop,
  ]);
  const arrow = (step: number, position: string) => (
    <button
      type="button"
      className={'carousel-arrow ' + position}
      aria-label={step < 0 ? '이전 슬라이드' : '다음 슬라이드'}
      disabled={!loop && current === (step < 0 ? 0 : count - 1)}
      onClick={(e) => {
        e.stopPropagation();
        move(step);
      }}
    >
      {step < 0 ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
    </button>
  );
  const interactive = (target: EventTarget) =>
    target instanceof Element &&
    !!target.closest('button,a,input,textarea,select,[contenteditable=true]');
  return (
    <section
      className={'carousel carousel-variant-' + variant}
      role="region"
      aria-roledescription="캐러셀"
      aria-label={node.props.text || node.name}
      style={{ '--carousel-fit': node.props.carouselFit ?? 'cover' } as CSSProperties}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocusCapture={() => setFocus(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocus(false);
      }}
    >
      <div
        className="carousel-viewport"
        tabIndex={variant === 'regions' ? 0 : undefined}
        aria-label={
          variant === 'regions' ? '좌우 영역 클릭 또는 방향키로 슬라이드 이동' : undefined
        }
        style={
          node.props.carouselSizing === 'fixed'
            ? { height: node.props.carouselHeight ?? 320 }
            : { aspectRatio: node.props.carouselRatio ?? '16/9' }
        }
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && ['ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            e.stopPropagation();
            move(e.key === 'ArrowLeft' ? -1 : 1);
          }
        }}
        onPointerDown={(e) => {
          swiped.current = false;
          if (!interactive(e.target)) pointer.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (
            preview &&
            pointer.current !== null &&
            count > 1 &&
            Math.abs(e.clientX - pointer.current) > 45
          ) {
            move(e.clientX < pointer.current ? 1 : -1);
            swiped.current = true;
          }
          pointer.current = null;
        }}
        onPointerCancel={() => {
          pointer.current = null;
        }}
        onClick={(e) => {
          if (variant !== 'regions' || !preview || interactive(e.target) || swiped.current) return;
          const rect = e.currentTarget.getBoundingClientRect();
          move(e.clientX < rect.left + rect.width / 2 ? -1 : 1);
        }}
      >
        {count ? (
          slides.map((slide, i) => (
            <div
              className="carousel-slide"
              key={node.children[i].id}
              role="group"
              aria-roledescription="슬라이드"
              aria-label={i + 1 + ' / ' + count}
              hidden={i !== current}
              inert={i !== current}
            >
              {slide}
            </div>
          ))
        ) : (
          <div className="carousel-empty">
            {preview
              ? '슬라이드가 없습니다.'
              : '오른쪽에서 이미지를 추가하거나 요소를 여기에 끌어오세요.'}
          </div>
        )}
        {count > 1 && variant === 'arrows' && node.props.carouselArrows !== false && (
          <>
            {arrow(-1, 'carousel-edge-prev')}
            {arrow(1, 'carousel-edge-next')}
          </>
        )}
      </div>
      {count > 1 && (
        <div className="carousel-controls" onClick={(e) => e.stopPropagation()}>
          {variant === 'controls' && node.props.carouselArrows !== false && arrow(-1, '')}
          {node.props.carouselDots !== false && (
            <div className="carousel-dots">
              {node.children.map((n, i) => (
                <button
                  key={n.id}
                  type="button"
                  aria-label={i + 1 + '번 슬라이드'}
                  aria-current={i === current ? 'true' : undefined}
                  onClick={() => select(i)}
                />
              ))}
            </div>
          )}
          {node.props.carouselCounter !== false && (
            <span
              className="carousel-counter"
              aria-live={node.props.carouselAutoplay && !paused ? 'off' : 'polite'}
            >
              {current + 1} / {count}
            </span>
          )}
          {variant === 'controls' && node.props.carouselArrows !== false && arrow(1, '')}
          {node.props.carouselAutoplay && (
            <button
              type="button"
              aria-label={paused ? '자동 재생' : '자동 재생 멈춤'}
              onClick={() => setPaused((v) => !v)}
            >
              {paused ? <Play size={16} /> : <Pause size={16} />}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
