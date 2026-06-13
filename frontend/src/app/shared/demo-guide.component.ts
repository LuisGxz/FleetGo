import { Component, Input, computed, inject, output, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, helpBuoyOutline, sparklesOutline } from 'ionicons/icons';
import { LanguageService } from '../core/language.service';
import { Role } from '../core/models';

/**
 * Always-available "How to explore" affordance: a help button that opens a sheet of
 * concrete, role-specific scenarios to try — with the cross-role live scenario flagged —
 * and a button to replay the guided tour. The page owns the tour, so replay is emitted.
 */
@Component({
  selector: 'app-demo-guide',
  imports: [IonIcon],
  template: `
    <button type="button" class="help-btn" (click)="open.set(true)" [attr.aria-label]="t().guide.helpLabel">
      <ion-icon name="help-buoy-outline" />
    </button>

    @if (open()) {
      <div class="backdrop" (click)="open.set(false)"></div>
      <div class="sheet" role="dialog" aria-modal="true">
        <header>
          <h2>{{ t().guide.title }}</h2>
          <button type="button" class="x" (click)="open.set(false)" [attr.aria-label]="t().common.close">
            <ion-icon name="close-outline" />
          </button>
        </header>

        <p class="subtitle">{{ t().guide.subtitle }}</p>

        <ol class="scenarios">
          @for (s of scenarios(); track s; let last = $last) {
            <li [class.aha]="last">
              @if (last) { <span class="tag mono"><ion-icon name="sparkles-outline" /> {{ t().guide.ahaTag }}</span> }
              <span class="text">{{ s }}</span>
            </li>
          }
        </ol>

        <button type="button" class="replay" (click)="replay.emit(); open.set(false)">
          {{ t().guide.replayTour }}
        </button>
      </div>
    }
  `,
  styles: [`
    .help-btn {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: var(--deep-800);
      border: 1px solid var(--deep-700);
      color: var(--fleet-400);
      display: grid;
      place-items: center;
      cursor: pointer;
      transition: border-color 0.15s, color 0.15s;

      &:hover { border-color: var(--fleet-500); color: var(--fleet-500); }
      ion-icon { font-size: 21px; }
    }

    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 8000;
      background: rgba(8, 12, 20, 0.6);
      animation: fade 0.2s ease;
    }

    .sheet {
      position: fixed;
      z-index: 8001;
      background: var(--deep-900);
      border: 1px solid var(--deep-600);
      box-shadow: 0 -10px 40px -10px rgba(0, 0, 0, 0.6);
      animation: slide-up 0.24s ease;

      /* Mobile: bottom sheet */
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: 20px 20px 0 0;
      padding: 18px 20px calc(18px + env(safe-area-inset-bottom));
      max-height: 85vh;
      overflow-y: auto;
    }

    /* Desktop: centered card */
    @media (min-width: 720px) {
      .sheet {
        left: 50%;
        right: auto;
        bottom: auto;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 440px;
        max-width: 92vw;
        border-radius: 18px;
        animation: pop 0.2s ease;
      }
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;

      h2 { font-size: 17px; font-weight: 700; color: #fff; margin: 0; }

      .x {
        background: none;
        border: none;
        color: var(--deep-300);
        cursor: pointer;
        padding: 4px;
        ion-icon { font-size: 22px; }
      }
    }

    .subtitle { font-size: 13px; color: var(--deep-300); margin: 0 0 16px; }

    .scenarios {
      list-style: none;
      counter-reset: step;
      margin: 0 0 18px;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;

      li {
        counter-increment: step;
        position: relative;
        padding: 12px 14px 12px 44px;
        border-radius: 12px;
        background: var(--deep-800);
        border: 1px solid var(--deep-700);
        font-size: 13.5px;
        line-height: 1.5;
        color: var(--deep-100);

        &::before {
          content: counter(step);
          position: absolute;
          left: 12px;
          top: 12px;
          width: 22px;
          height: 22px;
          border-radius: 999px;
          background: var(--deep-700);
          color: var(--deep-200);
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 700;
          display: grid;
          place-items: center;
        }

        &.aha {
          background: rgba(249, 115, 22, 0.1);
          border-color: var(--fleet-500);

          &::before { background: var(--fleet-500); color: var(--deep-950); }

          .tag {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 9.5px;
            font-weight: 800;
            letter-spacing: 0.1em;
            color: var(--fleet-400);
            margin-bottom: 3px;

            ion-icon { font-size: 11px; }
          }

          .text { display: block; }
        }
      }
    }

    .replay {
      width: 100%;
      border-radius: 12px;
      background: var(--fleet-500);
      border: none;
      color: var(--deep-950);
      font-size: 14px;
      font-weight: 800;
      padding: 13px;
      min-height: 48px;
      cursor: pointer;
      transition: background-color 0.15s, transform 0.1s;

      &:hover { background: var(--fleet-400); }
      &:active { transform: scale(0.99); }
    }

    @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
    @keyframes pop {
      from { opacity: 0; transform: translate(-50%, -48%); }
      to { opacity: 1; transform: translate(-50%, -50%); }
    }

    @media (prefers-reduced-motion: reduce) {
      .backdrop, .sheet { animation: none; }
    }
  `],
})
export class DemoGuideComponent {
  @Input({ required: true }) role!: Role;
  readonly replay = output<void>();

  private readonly language = inject(LanguageService);
  readonly t = this.language.t;
  readonly open = signal(false);

  readonly scenarios = computed(() =>
    this.role === 'Coordinator' ? this.t().guide.dispatchScenarios : this.t().guide.driverScenarios);

  constructor() {
    addIcons({ closeOutline, helpBuoyOutline, sparklesOutline });
  }
}
