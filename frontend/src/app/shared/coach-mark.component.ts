import { Component, OnDestroy, effect, inject, signal } from '@angular/core';
import { LanguageService } from '../core/language.service';
import { TourService } from '../core/tour.service';

interface Box { top: number; left: number; width: number; height: number; }

/**
 * Global spotlight overlay for guided tours. Mounted once at the app root; renders the
 * TourService's active step — dims the page, cuts a hole around the step's target element
 * and floats a tooltip card with Skip / Back / Next. Repositions on scroll & resize and
 * skips a step whose target is missing. Respects prefers-reduced-motion via CSS.
 */
@Component({
  selector: 'app-coach-mark',
  template: `
    @if (tour.active() && spot(); as s) {
      <div class="tour-overlay" role="dialog" aria-modal="true">
        <div class="spotlight" [style.top.px]="s.top" [style.left.px]="s.left"
             [style.width.px]="s.width" [style.height.px]="s.height"></div>

        <div class="coach-card" [class.above]="cardAbove()"
             [style.top.px]="cardTop()" [style.left.px]="cardLeft()" [style.width.px]="cardWidth()">
          <div class="step-count mono">{{ tour.stepNumber() }} / {{ tour.stepCount() }}</div>
          <h3>{{ tour.currentStep()?.title }}</h3>
          <p>{{ tour.currentStep()?.body }}</p>
          <div class="dots">
            @for (n of dotArray(); track n) {
              <span class="dot" [class.on]="n === tour.stepNumber()"></span>
            }
          </div>
          <div class="actions">
            <button type="button" class="skip" (click)="tour.skip()">{{ t().tour.skip }}</button>
            <div class="nav">
              @if (tour.stepNumber() > 1) {
                <button type="button" class="ghost" (click)="tour.prev()">{{ t().tour.back }}</button>
              }
              <button type="button" class="primary" (click)="tour.next()">
                {{ tour.isLast() ? t().tour.done : t().tour.next }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .tour-overlay {
      position: fixed;
      inset: 0;
      z-index: 9000;
      pointer-events: auto;
    }

    .spotlight {
      position: absolute;
      border-radius: 14px;
      box-shadow: 0 0 0 9999px rgba(8, 12, 20, 0.8), 0 0 0 2px var(--fleet-500) inset;
      transition: top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease;
      pointer-events: none;
    }

    .coach-card {
      position: absolute;
      background: var(--deep-900);
      border: 1px solid var(--deep-600);
      border-radius: 16px;
      padding: 16px 18px;
      box-shadow: 0 18px 50px -12px rgba(0, 0, 0, 0.7);
      pointer-events: auto;
      animation: card-in 0.22s ease;

      .step-count {
        font-size: 11px;
        color: var(--fleet-400);
        letter-spacing: 0.06em;
        margin-bottom: 6px;
      }

      h3 {
        font-size: 16px;
        font-weight: 700;
        color: #fff;
        margin: 0 0 6px;
      }

      p {
        font-size: 13.5px;
        line-height: 1.55;
        color: var(--deep-200);
        margin: 0 0 14px;
      }
    }

    .dots {
      display: flex;
      gap: 6px;
      margin-bottom: 14px;

      .dot {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: var(--deep-600);
        transition: background-color 0.2s, width 0.2s;

        &.on { background: var(--fleet-500); width: 18px; }
      }
    }

    .actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;

      .nav { display: flex; gap: 8px; }

      button {
        border-radius: 10px;
        font-size: 13px;
        font-weight: 700;
        padding: 9px 16px;
        min-height: 40px;
        cursor: pointer;
        transition: background-color 0.15s, border-color 0.15s, color 0.15s, transform 0.1s;

        &:active { transform: scale(0.97); }
      }

      .skip {
        background: none;
        border: none;
        color: var(--deep-300);
        padding: 9px 6px;

        &:hover { color: var(--deep-100); }
      }

      .ghost {
        background: none;
        border: 1px solid var(--deep-600);
        color: var(--deep-100);

        &:hover { border-color: var(--fleet-500); }
      }

      .primary {
        background: var(--fleet-500);
        border: none;
        color: var(--deep-950);

        &:hover { background: var(--fleet-400); }
      }
    }

    @keyframes card-in {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (prefers-reduced-motion: reduce) {
      .spotlight { transition: none; }
      .coach-card { animation: none; }
      .dots .dot { transition: none; }
    }
  `],
})
export class CoachMarkComponent implements OnDestroy {
  readonly tour = inject(TourService);
  private readonly language = inject(LanguageService);
  readonly t = this.language.t;

  readonly spot = signal<Box | null>(null);
  readonly cardTop = signal(0);
  readonly cardLeft = signal(0);
  readonly cardWidth = signal(320);
  readonly cardAbove = signal(false);

  private readonly onViewportChange = () => this.reposition();
  private retry = 0;

  constructor() {
    // React to step changes: scroll the target into view, then measure.
    effect(() => {
      const step = this.tour.currentStep();
      if (!step) {
        this.spot.set(null);
        return;
      }
      this.retry = 0;
      // Defer so the page (and any just-rendered element) is laid out before we measure.
      setTimeout(() => this.locate(step.target, step.placement ?? 'auto'));
    });

    addEventListener('resize', this.onViewportChange, { passive: true });
    addEventListener('scroll', this.onViewportChange, { passive: true, capture: true });
  }

  ngOnDestroy(): void {
    removeEventListener('resize', this.onViewportChange);
    removeEventListener('scroll', this.onViewportChange, { capture: true } as EventListenerOptions);
  }

  dotArray(): number[] {
    return Array.from({ length: this.tour.stepCount() }, (_, i) => i + 1);
  }

  private locate(selector: string, placement: 'auto' | 'top' | 'bottom'): void {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) {
      // The element may still be rendering — retry a few times before giving up.
      if (this.retry++ < 8) { setTimeout(() => this.locate(selector, placement), 150); return; }
      this.tour.targetMissing();
      return;
    }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setTimeout(() => this.measure(el, placement), 260);
  }

  private currentTarget(): { el: HTMLElement; placement: 'auto' | 'top' | 'bottom' } | null {
    const step = this.tour.currentStep();
    if (!step) return null;
    const el = document.querySelector(step.target) as HTMLElement | null;
    return el ? { el, placement: step.placement ?? 'auto' } : null;
  }

  private reposition(): void {
    const t = this.currentTarget();
    if (t) this.measure(t.el, t.placement);
  }

  private measure(el: HTMLElement, placement: 'auto' | 'top' | 'bottom'): void {
    const r = el.getBoundingClientRect();
    const pad = 8;
    const box: Box = {
      top: r.top - pad,
      left: r.left - pad,
      width: r.width + pad * 2,
      height: r.height + pad * 2,
    };
    this.spot.set(box);

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 14;
    const cardW = Math.min(340, vw - margin * 2);
    this.cardWidth.set(cardW);

    // Estimated card height for placement maths; clamped after the fact anyway.
    const cardH = 190;
    const spaceBelow = vh - (box.top + box.height);
    const above = placement === 'top' || (placement === 'auto' && spaceBelow < cardH + margin);
    this.cardAbove.set(above);

    let left = box.left + box.width / 2 - cardW / 2;
    left = Math.max(margin, Math.min(left, vw - cardW - margin));
    this.cardLeft.set(left);

    const top = above
      ? Math.max(margin, box.top - cardH - 6)
      : Math.min(box.top + box.height + 12, vh - cardH - margin);
    this.cardTop.set(Math.max(margin, top));
  }
}
