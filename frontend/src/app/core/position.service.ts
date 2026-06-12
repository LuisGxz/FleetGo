import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

const PING_MS = 5000;

/**
 * Publishes the courier's position every ~5 s while the driver UI is open.
 * Uses the Geolocation API when granted; otherwise stays silent (the demo
 * simulator keeps units moving server-side) and pages fall back to the
 * route start coordinates.
 */
@Injectable({ providedIn: 'root' })
export class PositionService {
  private readonly api = inject(ApiService);

  readonly last = signal<{ lat: number; lng: number; heading: number } | null>(null);

  private watchId: number | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private users = 0;

  start(): void {
    this.users++;
    if (this.timer || !('geolocation' in navigator)) return;

    this.watchId = navigator.geolocation.watchPosition(
      pos => this.last.set({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        heading: pos.coords.heading ?? 0,
      }),
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 10_000 });

    this.timer = setInterval(() => {
      const p = this.last();
      if (p) firstValueFrom(this.api.ping(p)).catch(() => undefined);
    }, PING_MS);
  }

  stop(): void {
    this.users = Math.max(0, this.users - 1);
    if (this.users > 0) return;

    if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId);
    if (this.timer) clearInterval(this.timer);
    this.watchId = null;
    this.timer = null;
  }
}
