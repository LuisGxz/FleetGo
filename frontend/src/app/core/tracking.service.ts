import { Injectable, inject } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { HUB_URL } from './config';
import { DeliveryUpdatedEvent, UnitMovedEvent } from './models';

/**
 * Client for the SignalR tracking hub. Pages call connect() on enter and
 * disconnect() on leave; events fan out through the subjects.
 */
@Injectable({ providedIn: 'root' })
export class TrackingService {
  private readonly auth = inject(AuthService);
  private connection: HubConnection | null = null;
  private listeners = 0;

  readonly unitMoved$ = new Subject<UnitMovedEvent>();
  readonly deliveryUpdated$ = new Subject<DeliveryUpdatedEvent>();

  async connect(): Promise<void> {
    this.listeners++;
    if (this.connection) return;

    const connection = new HubConnectionBuilder()
      .withUrl(HUB_URL, { accessTokenFactory: () => this.auth.accessToken ?? '' })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on('UnitMoved', (e: UnitMovedEvent) => this.unitMoved$.next(e));
    connection.on('DeliveryUpdated', (e: DeliveryUpdatedEvent) => this.deliveryUpdated$.next(e));

    this.connection = connection;
    try {
      await connection.start();
    } catch {
      // withAutomaticReconnect only kicks in after a successful start — retry once shortly.
      setTimeout(() => {
        if (this.connection?.state === HubConnectionState.Disconnected)
          this.connection.start().catch(() => undefined);
      }, 3000);
    }
  }

  async disconnect(): Promise<void> {
    this.listeners = Math.max(0, this.listeners - 1);
    if (this.listeners > 0 || !this.connection) return;

    const connection = this.connection;
    this.connection = null;
    await connection.stop().catch(() => undefined);
  }
}
