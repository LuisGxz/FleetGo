import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './config';
import {
  DeliveryDto, DispatchSummaryDto, FailReason, PagedResult,
  RouteDto, RouteSummaryDto, UnitStatusDto
} from './models';

/** Typed facade over the FleetGo REST API. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  // Courier
  todayRoute(): Observable<RouteDto | null> {
    return this.http.get<RouteDto | null>(`${API_URL}/routes/today`);
  }

  deliver(id: string, body: { signaturePng: string | null; lat: number; lng: number }): Observable<DeliveryDto> {
    return this.http.patch<DeliveryDto>(`${API_URL}/deliveries/${id}/deliver`, body);
  }

  fail(id: string, body: { reason: FailReason; note: string | null; lat: number; lng: number }): Observable<DeliveryDto> {
    return this.http.patch<DeliveryDto>(`${API_URL}/deliveries/${id}/fail`, body);
  }

  ping(body: { lat: number; lng: number; heading: number }): Observable<void> {
    return this.http.post<void>(`${API_URL}/positions`, body);
  }

  // Coordinator
  route(id: string): Observable<RouteDto> {
    return this.http.get<RouteDto>(`${API_URL}/routes/${id}`);
  }

  routes(date: string | null, page: number, pageSize = 20): Observable<PagedResult<RouteSummaryDto>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (date) params = params.set('date', date);
    return this.http.get<PagedResult<RouteSummaryDto>>(`${API_URL}/routes`, { params });
  }

  dispatchSummary(): Observable<DispatchSummaryDto> {
    return this.http.get<DispatchSummaryDto>(`${API_URL}/dispatch/summary`);
  }

  dispatchUnits(): Observable<UnitStatusDto[]> {
    return this.http.get<UnitStatusDto[]>(`${API_URL}/dispatch/units`);
  }
}
