import { Injectable, computed, signal } from '@angular/core';

/** One spotlight step: highlights `target` (a CSS selector) with a titled tooltip. */
export interface TourStep {
  target: string;
  title: string;
  body: string;
  /** Where to place the card relative to the target; 'auto' picks the side with room. */
  placement?: 'auto' | 'top' | 'bottom';
}

const SEEN_PREFIX = 'fleetgo.tour.';

/**
 * Drives the guided demo tours (coach-marks). One CoachMarkComponent at the app root
 * renders whatever step is active. Tours are first-run per id, persisted in localStorage,
 * and replayable on demand via start(id, steps, { force: true }).
 */
@Injectable({ providedIn: 'root' })
export class TourService {
  private readonly steps = signal<TourStep[]>([]);
  private readonly index = signal(0);
  private activeId: string | null = null;

  readonly active = signal(false);
  readonly currentStep = computed<TourStep | null>(() =>
    this.active() ? this.steps()[this.index()] ?? null : null);
  readonly stepNumber = computed(() => this.index() + 1);
  readonly stepCount = computed(() => this.steps().length);
  readonly isLast = computed(() => this.index() === this.stepCount() - 1);

  hasSeen(id: string): boolean {
    try { return localStorage.getItem(SEEN_PREFIX + id) === '1'; } catch { return false; }
  }

  /** Starts a tour. No-op if already seen, unless `force` (the "replay" path). */
  start(id: string, steps: TourStep[], opts: { force?: boolean } = {}): void {
    if (steps.length === 0) return;
    if (!opts.force && this.hasSeen(id)) return;
    this.activeId = id;
    this.steps.set(steps);
    this.index.set(0);
    this.active.set(true);
  }

  next(): void {
    if (this.index() + 1 < this.stepCount()) this.index.update(i => i + 1);
    else this.finish();
  }

  prev(): void {
    if (this.index() > 0) this.index.update(i => i - 1);
  }

  /** Skip = finish; both mark the tour as seen so it won't auto-start again. */
  skip(): void {
    this.finish();
  }

  /** Called by the overlay when a step's target can't be found — advance gracefully. */
  targetMissing(): void {
    this.next();
  }

  private finish(): void {
    if (this.activeId) {
      try { localStorage.setItem(SEEN_PREFIX + this.activeId, '1'); } catch { /* ignore */ }
    }
    this.active.set(false);
    this.steps.set([]);
    this.activeId = null;
  }
}
