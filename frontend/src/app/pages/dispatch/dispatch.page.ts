import { DatePipe, DecimalPipe } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { IonButton, IonContent, IonIcon, IonModal, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { busOutline, checkmarkCircle, closeCircle, closeOutline, logOutOutline } from 'ionicons/icons';
import * as L from 'leaflet';
import { Subscription, firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import { DeliveryDto, DispatchSummaryDto, RouteDto, RouteStatus, UnitStatusDto } from '../../core/models';
import { TrackingService } from '../../core/tracking.service';
import { LangPillComponent } from '../../shared/lang-pill.component';

const TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILES_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
const SEATTLE: L.LatLngTuple = [47.609, -122.333];
const TRUCK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>';

type Tab = 'Active' | 'Planned' | 'Completed';

/** Coordinator panel: KPIs, unit list and the live Leaflet map (mockup screen 3). */
@Component({
  selector: 'app-dispatch',
  templateUrl: './dispatch.page.html',
  styleUrl: './dispatch.page.scss',
  imports: [DatePipe, DecimalPipe, IonContent, IonSpinner, IonButton, IonIcon, IonModal, LangPillComponent],
})
export class DispatchPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('map') mapRef!: ElementRef<HTMLDivElement>;

  private readonly api = inject(ApiService);
  private readonly tracking = inject(TrackingService);
  readonly auth = inject(AuthService);
  readonly lang = inject(LanguageService);

  readonly summary = signal<DispatchSummaryDto | null>(null);
  readonly units = signal<UnitStatusDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly tab = signal<Tab>('Active');
  readonly selected = signal<string | null>(null);
  readonly detail = signal<RouteDto | null>(null);
  readonly detailOpen = signal(false);
  readonly signatureView = signal<string | null>(null);

  readonly visibleUnits = computed(() =>
    this.units().filter(u => u.status === this.tab()));

  readonly counts = computed(() => {
    const byStatus = (s: RouteStatus) => this.units().filter(u => u.status === s).length;
    return { Active: byStatus('Active'), Planned: byStatus('Planned'), Completed: byStatus('Completed') };
  });

  private map: L.Map | null = null;
  private markers = new Map<string, L.Marker>();
  private subs: Subscription[] = [];
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    addIcons({ busOutline, checkmarkCircle, closeCircle, closeOutline, logOutOutline });
  }

  async ngOnInit(): Promise<void> {
    await this.load();
    await this.tracking.connect();

    this.subs.push(this.tracking.unitMoved$.subscribe(e => {
      this.moveMarker(e.unitCode, e.lat, e.lng);
      this.units.update(units => units.map(u =>
        u.unitCode === e.unitCode ? { ...u, lat: e.lat, lng: e.lng, heading: e.heading } : u));
    }));
    // Delivery transitions change progress/KPIs — refresh cheaply, throttled by the interval below.
    this.subs.push(this.tracking.deliveryUpdated$.subscribe(() => this.scheduleRefresh()));
    this.refreshTimer = setInterval(() => this.refreshData(), 15_000);
  }

  private resizeObserver: ResizeObserver | null = null;

  ngAfterViewInit(): void {
    const map = L.map(this.mapRef.nativeElement, { zoomControl: true });
    L.tileLayer(TILES, { attribution: TILES_ATTR, maxZoom: 19 }).addTo(map);
    map.setView(SEATTLE, 12);
    this.map = map;
    this.syncMarkers();

    // ion-content/grid settle after init — keep Leaflet's measurements in sync.
    this.resizeObserver = new ResizeObserver(() => map.invalidateSize());
    this.resizeObserver.observe(this.mapRef.nativeElement);
    setTimeout(() => map.invalidateSize(), 300);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.resizeObserver?.disconnect();
    this.tracking.disconnect();
    this.map?.remove();
    this.map = null;
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try {
      await this.refreshData();
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  private pendingRefresh = false;
  private scheduleRefresh(): void {
    if (this.pendingRefresh) return;
    this.pendingRefresh = true;
    setTimeout(() => {
      this.pendingRefresh = false;
      this.refreshData().catch(() => undefined);
    }, 1500);
  }

  private async refreshData(): Promise<void> {
    const [summary, units] = await Promise.all([
      firstValueFrom(this.api.dispatchSummary()),
      firstValueFrom(this.api.dispatchUnits()),
    ]);
    this.summary.set(summary);
    this.units.set(units);
    this.syncMarkers();
  }

  select(unit: UnitStatusDto): void {
    this.selected.set(unit.unitCode);
    this.syncMarkers();
    if (unit.lat !== null && unit.lng !== null && this.map) {
      this.map.setView([unit.lat, unit.lng], Math.max(this.map.getZoom(), 13), { animate: true });
      this.markers.get(unit.unitCode)?.openPopup();
    }
  }

  async openDetail(unit: UnitStatusDto): Promise<void> {
    this.detail.set(null);
    this.detailOpen.set(true);
    try {
      this.detail.set(await firstValueFrom(this.api.route(unit.routeId)));
    } catch {
      this.detailOpen.set(false);
    }
  }

  closeDetail(): void {
    this.detailOpen.set(false);
    this.signatureView.set(null);
  }

  showSignature(d: DeliveryDto): void {
    this.signatureView.set(d.signaturePng);
  }

  progressPct(u: { total: number; completed: number }): number {
    return u.total > 0 ? Math.round((u.completed / u.total) * 100) : 0;
  }

  statusTag(status: RouteStatus): string {
    const t = this.lang.t().dispatch;
    return status === 'Active' ? t.enRoute : status === 'Planned' ? t.queuedTag : t.closedTag;
  }

  private syncMarkers(): void {
    if (!this.map) return;

    for (const u of this.units()) {
      if (u.lat === null || u.lng === null) {
        const stale = this.markers.get(u.unitCode);
        if (stale) {
          stale.remove();
          this.markers.delete(u.unitCode);
        }
        continue;
      }

      const existing = this.markers.get(u.unitCode);
      if (existing) {
        existing.setLatLng([u.lat, u.lng]);
        existing.setIcon(this.icon(u.unitCode));
        existing.setPopupContent(this.popupHtml(u));
      } else {
        const marker = L.marker([u.lat, u.lng], { icon: this.icon(u.unitCode) })
          .addTo(this.map)
          .bindPopup(this.popupHtml(u), { closeButton: false, offset: [0, -6] });
        marker.on('click', () => this.selected.set(u.unitCode));
        this.markers.set(u.unitCode, marker);
      }
    }
  }

  private moveMarker(unitCode: string, lat: number, lng: number): void {
    this.markers.get(unitCode)?.setLatLng([lat, lng]);
  }

  private icon(unitCode: string): L.DivIcon {
    const selected = this.selected() === unitCode ? ' selected' : '';
    return L.divIcon({
      className: '',
      html: `<div class="unit-marker${selected}">${TRUCK_SVG}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  }

  private popupHtml(u: UnitStatusDto): string {
    const t = this.lang.t().dispatch;
    const eta = u.etaUtc
      ? new Date(u.etaUtc + 'Z').toLocaleTimeString(this.lang.dateLocale(), { hour: '2-digit', minute: '2-digit' })
      : t.never;
    return `
      <div class="unit-popup">
        <p class="head">${u.unitCode} · ${u.courierName}</p>
        <p class="stops">${u.stopsRemaining} ${t.stopsRemaining}</p>
        <p class="eta">ETA ${eta} · ${u.completed}/${u.total}</p>
        <div class="bar"><div style="width:${this.progressPct(u)}%"></div></div>
      </div>`;
  }
}
