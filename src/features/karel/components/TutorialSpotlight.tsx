import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { TUTORIAL_COPY, TUTORIAL_STEPS } from '../editor/tutorial';
import type { TutorialStep } from '../editor/tutorial';
import './TutorialSpotlight.css';

interface TutorialSpotlightProps {
  step: TutorialStep;
  isMobile: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onDismiss: () => void;
}

interface SpotlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function TutorialSpotlight({ step, isMobile, onNext, onPrevious, onDismiss }: TutorialSpotlightProps) {
  const panelRef = useRef<HTMLElement>(null);
  const maskId = useId();
  const visibleSteps: readonly TutorialStep[] = step === 'quickCommands' ? ['quickCommands'] : TUTORIAL_STEPS;
  const [layout, setLayout] = useState<{
    rects: SpotlightRect[];
    left: number;
    top: number;
    maxHeight: number;
    placement: 'above' | 'below' | 'left' | 'right';
  } | null>(null);
  const selector = `[data-tutorial-target~="${step}"]`;

  useLayoutEffect(() => {
    const targets = [...document.querySelectorAll<HTMLElement>(selector)];
    const panel = panelRef.current;
    if (!panel || !targets.length) return;
    const first = targets[0];
    if (!isMobile && first) {
      const bounds = first.getBoundingClientRect();
      if (step === 'runner' || step === 'reset') {
        first.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      } else if (bounds.top > window.innerHeight - 120) {
        window.scrollBy({ top: bounds.top - 260 });
      }
    }

    const measure = () => {
      const width = document.documentElement.clientWidth;
      const height = window.innerHeight;
      const margin = 12;
      const gap = 16;
      const rects = targets.map((target) => {
        const bounds = target.getBoundingClientRect();
        const x = Math.max(3, bounds.left - 4);
        const y = Math.max(3, bounds.top - 4);
        return {
          x, y,
          width: Math.max(0, Math.min(width - 3, bounds.right + 4) - x),
          height: Math.max(0, Math.min(height - 3, bounds.bottom + 4) - y),
        };
      }).filter((rect) => rect.width > 0 && rect.height > 0);
      if (!rects.length) return;
      const left = Math.min(...rects.map((rect) => rect.x));
      const top = Math.min(...rects.map((rect) => rect.y));
      const right = Math.max(...rects.map((rect) => rect.x + rect.width));
      const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
      const panelWidth = panel.offsetWidth;
      const copy = panel.querySelector<HTMLElement>('.spotlight-copy');
      const naturalHeight = panel.offsetHeight + (copy ? copy.scrollHeight - copy.clientHeight : 0);

      let placement: 'above' | 'below' | 'left' | 'right';
      let panelLeft: number;
      let panelTop: number;
      let maxHeight: number;
      if (left >= panelWidth + margin + gap || width - right >= panelWidth + margin + gap) {
        placement = left >= panelWidth + margin + gap ? 'left' : 'right';
        maxHeight = height - margin * 2;
        panelLeft = placement === 'left' ? left - gap - panelWidth : right + gap;
        panelTop = Math.max(margin, Math.min(height - margin - Math.min(naturalHeight, maxHeight), (top + bottom - naturalHeight) / 2));
      } else {
        const above = top - margin - gap;
        const below = height - bottom - margin - gap;
        placement = above >= naturalHeight || above >= below ? 'above' : 'below';
        maxHeight = Math.max(140, placement === 'above' ? above : below);
        panelLeft = Math.max(margin, Math.min(width - margin - panelWidth, (left + right - panelWidth) / 2));
        panelTop = placement === 'above'
          ? Math.max(margin, top - gap - Math.min(naturalHeight, maxHeight))
          : bottom + gap;
      }
      setLayout({ rects, left: panelLeft, top: panelTop, maxHeight, placement });
    };

    measure();
    const observer = new ResizeObserver(measure);
    targets.forEach((target) => observer.observe(target));
    observer.observe(panel);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [selector, step, isMobile]);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const frame = window.requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));
    return () => {
      window.cancelAnimationFrame(frame);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || panelRef.current?.contains(target) || target.closest(selector)) return;
      event.preventDefault();
      event.stopPropagation();
      onDismiss();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [onDismiss, selector]);

  return createPortal(
    <div className="tutorial-spotlight" data-step={step}>
      {layout && (
        <svg className="spotlight-overlay" aria-hidden="true">
          <defs>
            <mask id={maskId}>
              <rect width="100%" height="100%" fill="white" />
              {layout.rects.map((rect, index) => <rect key={index} {...rect} rx="12" fill="black" />)}
            </mask>
          </defs>
          <rect className="spotlight-dimmer" width="100%" height="100%" mask={`url(#${maskId})`} />
          {layout.rects.map((rect, index) => <rect className="spotlight-neon" key={index} {...rect} rx="12" />)}
        </svg>
      )}
      <section
        ref={panelRef}
        className="spotlight-panel"
        data-placement={layout?.placement}
        style={{ left: layout?.left ?? 12, top: layout?.top ?? 12, maxHeight: layout?.maxHeight, visibility: layout ? 'visible' : 'hidden' }}
        role="dialog"
        aria-labelledby="spotlight-title"
        aria-describedby="spotlight-description"
        tabIndex={-1}
      >
        <header className="spotlight-header">
          <span>Paso {visibleSteps.indexOf(step) + 1} de {visibleSteps.length}</span>
          <button type="button" aria-label="Cerrar tutorial" onClick={onDismiss}><X size={18} /></button>
        </header>
        <div className="spotlight-copy" aria-live="polite">
          <h2 id="spotlight-title">{TUTORIAL_COPY[step].title}</h2>
          <p id="spotlight-description">{TUTORIAL_COPY[step].body}</p>
        </div>
        <div className="spotlight-actions">
          <button className="spotlight-secondary" type="button" onClick={onDismiss}>Omitir</button>
          {step !== 'chat' && step !== 'quickCommands' && <button className="spotlight-secondary" type="button" onClick={onPrevious}>Anterior</button>}
          <button className="spotlight-next" type="button" onClick={onNext}>{step === 'reset' || step === 'quickCommands' ? 'Finalizar' : 'Siguiente'}</button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
