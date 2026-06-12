// Mirrors the backend DTOs (FleetGo.Application). Enums travel as strings.

export type Role = 'Courier' | 'Coordinator';
export type RouteStatus = 'Planned' | 'Active' | 'Completed';
export type DeliveryStatus = 'Pending' | 'Delivered' | 'Failed';
export type FailReason = 'CustomerAbsent' | 'WrongAddress' | 'Rejected' | 'Other';

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  unitCode: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  user: UserDto;
}

export interface DeliveryDto {
  id: string;
  sequence: number;
  packageCode: string;
  customerName: string;
  address: string;
  lat: number;
  lng: number;
  windowEndUtc: string | null;
  parcels: number;
  signatureRequired: boolean;
  status: DeliveryStatus;
  deliveredAtUtc: string | null;
  failReason: FailReason | null;
  failNote: string | null;
  signaturePng: string | null;
}

export interface RouteDto {
  id: string;
  routeCode: string;
  unitCode: string;
  courierName: string;
  date: string;
  status: RouteStatus;
  startLat: number;
  startLng: number;
  total: number;
  completed: number;
  deliveries: DeliveryDto[];
}

export interface RouteSummaryDto {
  id: string;
  routeCode: string;
  unitCode: string;
  courierName: string;
  date: string;
  status: RouteStatus;
  total: number;
  completed: number;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface DispatchSummaryDto {
  unitsActive: number;
  deliveredToday: number;
  onTimePct: number;
  delays: number;
  queuedRoutes: number;
}

export interface UnitStatusDto {
  unitCode: string;
  courierName: string;
  routeId: string;
  routeCode: string;
  lat: number | null;
  lng: number | null;
  heading: number;
  stopsRemaining: number;
  total: number;
  completed: number;
  etaUtc: string | null;
  status: RouteStatus;
}

// SignalR hub payloads (TrackingHub)
export interface UnitMovedEvent {
  unitCode: string;
  lat: number;
  lng: number;
  heading: number;
  atUtc: string;
}

export interface DeliveryUpdatedEvent {
  deliveryId: string;
  routeId: string;
  unitCode: string;
  status: DeliveryStatus;
}
