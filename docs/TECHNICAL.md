# FleetGo — Technical deep-dive

Audience: technical interviewers. Honest about what is demonstrated, simplified, and deliberately out of scope.

## 1. Scope

Last-mile logistics demo with two roles: **Courier** (mobile driver app: daily route, deliver with signature, report incidents) and **Coordinator** (dispatch panel: KPIs, unit list, live map). The differentiator vs. the other portfolio projects is **Ionic + real-time**: one hybrid app with two experiences, positions streaming over SignalR, and a server-side fleet simulator so the demo is alive 24/7.

## 2. Stack (versions)

| Layer | Tech |
|---|---|
| API | .NET 9 (ASP.NET Core), packages pinned 9.0.x |
| Data | EF Core 9 + SQL Server (local dev) / Azure SQL serverless (prod) |
| Real-time | SignalR (WebSockets, JWT via query string on the hub path) |
| App | Ionic 8 + Angular 20 standalone (signals, lazy routes, `withComponentInputBinding`) |
| Maps | Leaflet 1.9 + CARTO dark tiles (no API key) |
| Auth | JWT 15 min + rotating refresh 7 d + lockout, PBKDF2 password hashing |
| Tests | xUnit (20) on SQLite in-memory + Playwright E2E (5 flows) |
| Delivery | GitHub Actions → GitHub Pages (app) + Azure App Service F1 (API, WebSockets ON) |

## 3. Architecture

```
backend/
  FleetGo.Domain          entities (state machines), enums, domain exceptions
  FleetGo.Application     services + DTOs + validators, GeoMath, interfaces (IPositionStore, ITrackingNotifier, IClock)
  FleetGo.Infrastructure  EF Core (DbContext, configs, migrations), JWT, position store, SignalR notifier, simulator, seeder
  FleetGo.Api             controllers (thin), ProblemDetails handler, rate limiting, DI, hub endpoint
frontend/src/app/
  core/                   config, models, i18n EN/ES, auth (service/interceptor/guards), api client, tracking (SignalR), positions, geo
  pages/                  login · driver (route, delivery) · dispatch · about
  shared/                 lang pill, signature pad (hand-rolled canvas)
```

### Patterns — where and why

- **Service layer, no MediatR** — same deliberate choice as MediTrack: FinPulse already demonstrates vertical-slice; here the focus is real-time and mobile.
- **Actor pattern**: every service method takes an `Actor(UserId, Role, CourierProfileId, UnitCode)` resolved once from the JWT. RBAC decisions are explicit, testable, and never depend on `HttpContext`.
- **Domain state machines**: `Delivery.MarkDelivered/MarkFailed` validate status, signature requirement and immutability inside the entity; `Route.RefreshStatus()` derives Active/Completed from its stops. Invalid transitions throw domain exceptions → ProblemDetails.

## 4. The real-time differentiator

```
courier ping / simulator tick
        │
        ▼
IPositionStore (in-memory, ConcurrentDictionary by UnitCode)
        │
        ▼
ITrackingNotifier → SignalR hub /hubs/tracking → UnitMoved {unitCode, lat, lng, heading}
                                               → DeliveryUpdated {deliveryId, routeId, unitCode, status}
```

- **Positions never touch SQL.** A ping is ephemeral state; persisting ~0.2 writes/s/unit into a relational table buys nothing for the product. What *is* durable — delivery transitions with position — goes to the append-only `DeliveryEvent` table.
- **Why in-memory instead of Redis:** the master plan said Redis; the Azure free tier doesn't include it and a single F1 instance doesn't need it. `IPositionStore` is the documented seam: a `RedisPositionStore` slots in without touching callers. This trade-off is stated in `/about` and here — it's a decision, not a shortcut.
- **Fleet simulator** (`FleetSimulatorBackgroundService`): every 3 s, moves each unit with pending stops ~180 m toward its next stop, broadcasts, and on arrival resolves the stop (60 % chance per tick: 93 % delivered, 7 % failed with reason). `UNIT-07` is excluded from auto-resolution — that's the interactive demo courier; a human closes its deliveries. SignalR-only side effects; DB writes happen only on stop resolution.
- **JWT over WebSockets:** browsers can't send headers on WS upgrade, so the hub accepts `access_token` via query string, scoped to `/hubs` only.

## 5. Domain rules (enforced server-side, all tested)

- Courier requests for another courier's route/delivery → **403** (`Actor.CourierProfileId` checked in every query).
- `Deliver` with `SignatureRequired` and no PNG → **400**; signature is a data-URL PNG capped at ~200 KB by validation.
- Delivered/Failed deliveries are **immutable** — second transition throws.
- `DeliveryEvent` is append-only (no update/delete paths exist in the application layer).
- Coordinator is read-only over deliveries (no mutation endpoints accept that role).
- ETA/distance via haversine + average urban speed — approximation, stated as such.

## 6. Security

- JWT 15 min, refresh rotation with hashed tokens in DB, lockout after repeated failures, rate limiting on `/auth` (30/min/IP — SPA reloads refresh tokens, 10/min broke E2E in MediTrack).
- No self-service registration: fleet users are provisioned by operations (seed). Reduces attack surface and matches the domain.
- CORS pinned to the Pages origin in prod; secrets live in Azure app settings (never in the repo).

## 7. The one-app trade-off

`/driver` (mobile-first, dark, 44 px+ targets, signature canvas) and `/dispatch` (desktop grid + Leaflet) ship in one Ionic app sharing core services. In a real operation these would be separate deployables (different release cadence, different stores). One deploy here demonstrates Ionic + web panel + shared core in a single reviewable codebase — the role guards make the boundary explicit.

## 8. i18n

Same hand-written pattern as the rest of the portfolio: a typed `AppCopy` object per language (EN/ES), a `LanguageService` with signals, toggle on every screen including login/about. Enum values from the API translate through lookup maps. No translation framework — deliberate: full control over typing, zero runtime cost.

## 9. Testing

- **Domain (xUnit):** delivery transitions (deliver/fail/immutability/signature rule), route progress derivation, haversine sanity.
- **Application (xUnit on SQLite in-memory):** RBAC (courier blocked from foreign routes, coordinator blocked from mutations), deliver/fail end-to-end with events, position store.
- **E2E (Playwright, 5 flows):** courier delivers with a drawn signature → dispatch sees the unit row change live (two browser contexts, SignalR round-trip); RBAC redirects both directions; EN/ES toggle; F5 session restore via refresh token; zero page errors on the dispatch panel.

## 10. Honest trade-offs

- In-memory positions (single instance) — Redis seam documented above.
- Simulator moves units in straight lines between stops, not road-snapped routes — road routing (OSRM/Valhalla) is out of scope for a demo and would dominate the infra budget.
- ETA = haversine / average speed, not traffic-aware.
- One Ionic app for two roles (see §7).
- Driver geolocation pings work when the browser grants permission; the demo doesn't depend on them (simulator covers the map).

## 11. What I would build next

- `RedisPositionStore` + scale-out SignalR backplane (Azure SignalR Service).
- Road-snapped simulator paths and ETAs (OSRM).
- Offline-first driver app: queue deliver/fail mutations in IndexedDB and replay on reconnect (the PWA shell is already installable).
- Push notifications to dispatch on failed deliveries.
- Route optimization (TSP heuristic) when building daily routes.
