import { Component, Input, computed, inject, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmark, closeOutline, informationCircleOutline } from 'ionicons/icons';
import { LanguageService } from '../core/language.service';
import { Role } from '../core/models';

/**
 * "Demo · {Role}" chip. Tapping it reveals what the current role can and can't do —
 * the RBAC story is the whole point of the app, so it's surfaced front and center.
 */
@Component({
  selector: 'app-role-badge',
  imports: [IonIcon],
  template: `
    <div class="badge-wrap">
      <button type="button" class="badge mono" (click)="open.set(!open())" [attr.aria-expanded]="open()">
        {{ t().roleBadge.demo }} · {{ roleName() }}
        <ion-icon name="information-circle-outline" />
      </button>

      @if (open()) {
        <div class="backdrop" (click)="open.set(false)"></div>
        <div class="pop" role="dialog">
          <header>
            <span class="role mono">{{ roleName() }}</span>
            <button type="button" class="x" (click)="open.set(false)" aria-label="close">
              <ion-icon name="close-outline" />
            </button>
          </header>
          <p class="cap-title">{{ t().roleBadge.canTitle }}</p>
          <ul>
            @for (c of can(); track c) {
              <li><ion-icon name="checkmark" /> {{ c }}</li>
            }
          </ul>
          <p class="cant">{{ cant() }}</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .badge-wrap { position: relative; }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--deep-800);
      border: 1px solid var(--deep-600);
      border-radius: 999px;
      color: var(--deep-100);
      font-size: 11px;
      font-weight: 700;
      padding: 6px 10px;
      min-height: 30px;
      cursor: pointer;
      transition: border-color 0.15s;

      &:hover { border-color: var(--fleet-500); }
      ion-icon { font-size: 14px; color: var(--fleet-400); }
    }

    .backdrop { position: fixed; inset: 0; z-index: 40; }

    .pop {
      position: absolute;
      top: calc(100% + 8px);
      /* Driver (mobile): badge sits on the left, so open left-aligned to stay on screen. */
      left: 0;
      right: auto;
      z-index: 50;
      width: 250px;
      max-width: calc(100vw - 32px);
      background: var(--deep-900);
      border: 1px solid var(--deep-600);
      border-radius: 14px;
      padding: 14px 16px;
      box-shadow: 0 16px 44px -14px rgba(0, 0, 0, 0.7);
      animation: pop-in 0.16s ease;

      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;

        .role { color: var(--fleet-400); font-size: 12px; font-weight: 700; }

        .x {
          background: none;
          border: none;
          color: var(--deep-300);
          cursor: pointer;
          padding: 2px;
          ion-icon { font-size: 18px; }
        }
      }

      .cap-title {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--deep-300);
        margin: 0 0 8px;
      }

      ul {
        list-style: none;
        margin: 0 0 10px;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 7px;

        li {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          font-size: 12.5px;
          color: var(--deep-100);
          line-height: 1.4;

          ion-icon { color: var(--ok-500); font-size: 14px; margin-top: 2px; flex-shrink: 0; }
        }
      }

      .cant {
        font-size: 12px;
        color: var(--deep-300);
        margin: 0;
        padding-top: 8px;
        border-top: 1px solid var(--deep-700);
      }
    }

    /* Dispatch (desktop): badge sits on the right cluster, so open right-aligned. */
    @media (min-width: 720px) {
      .pop { left: auto; right: 0; }
    }

    @keyframes pop-in {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (prefers-reduced-motion: reduce) {
      .pop { animation: none; }
    }
  `],
})
export class RoleBadgeComponent {
  @Input({ required: true }) role!: Role;

  private readonly language = inject(LanguageService);
  readonly t = this.language.t;
  readonly open = signal(false);

  readonly roleName = computed(() =>
    this.role === 'Coordinator' ? this.t().roleBadge.coordinator : this.t().roleBadge.courier);
  readonly can = computed(() =>
    this.role === 'Coordinator' ? this.t().roleBadge.coordinatorCan : this.t().roleBadge.courierCan);
  readonly cant = computed(() =>
    this.role === 'Coordinator' ? this.t().roleBadge.coordinatorCant : this.t().roleBadge.courierCant);

  constructor() {
    addIcons({ checkmark, closeOutline, informationCircleOutline });
  }
}
