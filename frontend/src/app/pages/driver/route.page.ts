import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonRefresher, IonRefresherContent, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircle, closeCircle, cubeOutline, logOutOutline } from 'ionicons/icons';
import { Subscription, firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { utc } from '../../core/dates';
import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import { DeliveryDto, RouteDto } from '../../core/models';
import { TourService, TourStep } from '../../core/tour.service';
import { TrackingService } from '../../core/tracking.service';
import { DemoGuideComponent } from '../../shared/demo-guide.component';
import { LangPillComponent } from '../../shared/lang-pill.component';
import { RoleBadgeComponent } from '../../shared/role-badge.component';

/** Driver home: today's route with ordered stops and progress (mockup phone 1). */
@Component({
  selector: 'app-route',
  templateUrl: './route.page.html',
  styleUrl: './route.page.scss',
  imports: [DatePipe, IonContent, IonRefresher, IonRefresherContent, IonSpinner, IonButton, IonIcon,
    LangPillComponent, RoleBadgeComponent, DemoGuideComponent],
})
export class RoutePage implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly tracking = inject(TrackingService);
  private readonly tour = inject(TourService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly lang = inject(LanguageService);

  readonly utc = utc;
  readonly route = signal<RouteDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);

  private sub: Subscription | null = null;

  constructor() {
    addIcons({ checkmarkCircle, closeCircle, cubeOutline, logOutOutline });
  }

  async ngOnInit(): Promise<void> {
    await this.load();
    await this.tracking.connect();
    this.sub = this.tracking.deliveryUpdated$.subscribe(e => {
      if (e.routeId === this.route()?.id) this.load(true);
    });
    // First-run guided tour, once the route (and its targets) are on screen.
    if (this.route()) setTimeout(() => this.tour.start('driver', this.driverSteps()), 700);
  }

  private driverSteps(): TourStep[] {
    const s = this.lang.t().tour.driver;
    return [
      { target: '[data-tour="driver-progress"]', title: s[0].title, body: s[0].body, placement: 'bottom' },
      { target: '[data-tour="driver-next"]', title: s[1].title, body: s[1].body },
      { target: '[data-tour="driver-help"]', title: s[2].title, body: s[2].body, placement: 'bottom' },
    ];
  }

  replayTour(): void {
    this.tour.start('driver', this.driverSteps(), { force: true });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.tracking.disconnect();
  }

  async load(silent = false): Promise<void> {
    if (!silent) {
      this.loading.set(true);
      this.error.set(false);
    }
    try {
      this.route.set(await firstValueFrom(this.api.todayRoute()));
    } catch {
      if (!silent) this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  async refresh(event: CustomEvent): Promise<void> {
    await this.load(true);
    (event.target as HTMLIonRefresherElement).complete();
  }

  open(delivery: DeliveryDto): void {
    this.router.navigate(['/driver/delivery', delivery.id]);
  }

  /** First pending stop in sequence — highlighted as UP NEXT. */
  nextId(): string | null {
    return this.route()?.deliveries.find(d => d.status === 'Pending')?.id ?? null;
  }

  progressPct(): number {
    const r = this.route();
    return r && r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0;
  }

  initials(): string {
    const name = this.auth.user()?.fullName ?? '';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }
}
