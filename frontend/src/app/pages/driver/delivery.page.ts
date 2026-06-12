import { DatePipe } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonModal, IonSpinner, IonTextarea } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, checkmarkCircleOutline, cubeOutline, timeOutline, warningOutline } from 'ionicons/icons';
import * as L from 'leaflet';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessages } from '../../core/api-error';
import { ApiService } from '../../core/api.service';
import { distanceEtaLabel } from '../../core/geo';
import { LanguageService } from '../../core/language.service';
import { DeliveryDto, FailReason, RouteDto } from '../../core/models';
import { PositionService } from '../../core/position.service';
import { SignaturePadComponent } from '../../shared/signature-pad.component';

const TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILES_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
const FAIL_REASONS: FailReason[] = ['CustomerAbsent', 'WrongAddress', 'Rejected', 'Other'];

/** Delivery detail: mini-map, signature capture, deliver / report issue (mockup phone 2). */
@Component({
  selector: 'app-delivery',
  templateUrl: './delivery.page.html',
  styleUrl: './delivery.page.scss',
  imports: [DatePipe, FormsModule, IonContent, IonButton, IonIcon, IonSpinner, IonModal, IonTextarea, SignaturePadComponent],
})
export class DeliveryPage implements OnInit, AfterViewInit, OnDestroy {
  @Input() id = '';
  @ViewChild('map') mapRef!: ElementRef<HTMLDivElement>;
  @ViewChild(SignaturePadComponent) pad?: SignaturePadComponent;

  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly positions = inject(PositionService);
  readonly lang = inject(LanguageService);

  readonly route = signal<RouteDto | null>(null);
  readonly delivery = signal<DeliveryDto | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly errors = signal<string[]>([]);
  readonly distanceEta = signal('');
  readonly issueOpen = signal(false);
  readonly issueReason = signal<FailReason>('CustomerAbsent');
  issueNote = '';

  readonly failReasons = FAIL_REASONS;

  private map: L.Map | null = null;

  constructor() {
    addIcons({ arrowBack, checkmarkCircleOutline, cubeOutline, timeOutline, warningOutline });
  }

  async ngOnInit(): Promise<void> {
    this.positions.start();
    try {
      const route = await firstValueFrom(this.api.todayRoute());
      this.route.set(route);
      this.delivery.set(route?.deliveries.find(d => d.id === this.id) ?? null);
    } finally {
      this.loading.set(false);
    }
    // The #map div appears on the next change-detection pass — defer until it exists.
    setTimeout(() => this.renderMap());
  }

  ngAfterViewInit(): void {
    this.renderMap();
  }

  ngOnDestroy(): void {
    this.positions.stop();
    this.map?.remove();
    this.map = null;
  }

  /** Courier origin: live GPS when granted, else the route start point. */
  private origin(): { lat: number; lng: number } {
    const live = this.positions.last();
    if (live) return live;
    const r = this.route();
    return { lat: r?.startLat ?? 0, lng: r?.startLng ?? 0 };
  }

  private renderMap(): void {
    const d = this.delivery();
    if (!d || !this.mapRef?.nativeElement || this.map) return;

    const from = this.origin();
    const map = L.map(this.mapRef.nativeElement, { zoomControl: false, attributionControl: true });
    L.tileLayer(TILES, { attribution: TILES_ATTR, maxZoom: 19 }).addTo(map);

    const courierDot = L.circleMarker([from.lat, from.lng], {
      radius: 7, color: '#0c1320', weight: 2, fillColor: '#f97316', fillOpacity: 1,
    }).addTo(map);
    const destDot = L.circleMarker([d.lat, d.lng], {
      radius: 7, color: '#0c1320', weight: 2, fillColor: '#22c55e', fillOpacity: 1,
    }).addTo(map);
    const line = L.polyline([[from.lat, from.lng], [d.lat, d.lng]], {
      color: '#f97316', weight: 3, dashArray: '8 6',
    }).addTo(map);

    map.fitBounds(L.latLngBounds([from.lat, from.lng], [d.lat, d.lng]).pad(0.25));
    this.map = map;
    this.distanceEta.set(distanceEtaLabel(from.lat, from.lng, d.lat, d.lng));

    // ion-content settles its layout after init — re-measure or tiles render in a sliver.
    setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(L.latLngBounds([from.lat, from.lng], [d.lat, d.lng]).pad(0.25));
    }, 250);

    // marker refs kept alive by the map; explicit no-op to appease lint
    void courierDot; void destDot; void line;
  }

  isPending(): boolean {
    return this.delivery()?.status === 'Pending';
  }

  signatureBlocked(): boolean {
    const d = this.delivery();
    return !!d && d.signatureRequired && !(this.pad?.hasInk() ?? false);
  }

  async deliver(): Promise<void> {
    const d = this.delivery();
    if (!d || this.busy()) return;

    if (d.signatureRequired && !this.pad?.value()) {
      this.errors.set([this.lang.t().driver.signatureMissing]);
      return;
    }

    this.busy.set(true);
    this.errors.set([]);
    try {
      const pos = this.origin();
      const updated = await firstValueFrom(
        this.api.deliver(d.id, { signaturePng: this.pad?.value() ?? null, lat: pos.lat, lng: pos.lng }));
      this.delivery.set(updated);
    } catch (e) {
      this.errors.set(apiErrorMessages(e, this.lang.t().driver.deliverErrorFallback));
    } finally {
      this.busy.set(false);
    }
  }

  async submitIssue(): Promise<void> {
    const d = this.delivery();
    if (!d || this.busy()) return;

    this.busy.set(true);
    this.errors.set([]);
    try {
      const pos = this.origin();
      const updated = await firstValueFrom(
        this.api.fail(d.id, { reason: this.issueReason(), note: this.issueNote.trim() || null, lat: pos.lat, lng: pos.lng }));
      this.delivery.set(updated);
      this.issueOpen.set(false);
    } catch (e) {
      this.errors.set(apiErrorMessages(e, this.lang.t().driver.failErrorFallback));
      this.issueOpen.set(false);
    } finally {
      this.busy.set(false);
    }
  }

  back(): void {
    this.router.navigate(['/driver']);
  }
}
