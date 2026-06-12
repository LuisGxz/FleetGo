# FleetGo — Requerimientos y Arquitectura

> Logística y tracking en tiempo real. Proyecto flagship #3 — el diferenciador **Ionic/móvil** del portfolio.
> Stack: **Ionic 8 + Angular 20** (una sola app, dos experiencias por rol) · .NET 9 Web API · SQL Server · SignalR · Leaflet · JWT.
> Diseño: mockup `../../docs/portfolio-designs/04-fleetgo.html` — operativo nocturno, naranja #F97316 sobre deep navy #0C1320, Archivo + JetBrains Mono, botones grandes táctiles.

---

## 1. Requerimientos funcionales

### RF-01 Autenticación y roles
- Roles: `Courier` (repartidor) y `Coordinator` (despacho). **Sin registro self-service** (los usuarios los provisiona la operación → seed). Login + refresh rotativo + lockout (patrón MediTrack, sin 2FA).
- JWT con rol; el courier solo ve SU ruta; el coordinator ve toda la operación.

### RF-02 Rutas y entregas (courier)
- Ruta diaria por courier (`R-07`): lista ordenada de entregas con código `#PKG-#####`, cliente, dirección, lat/lng, ventana horaria, nº de bultos, flag firma requerida.
- Estados de entrega: `Pending → Delivered` | `Failed` (con motivo). La ruta muestra progreso (n de m completadas).
- **Marcar entregado**: requiere firma (canvas → PNG base64) si `SignatureRequired`; guarda `DeliveredAtUtc` + posición actual. Inmutable después.
- **Reportar incidencia**: marca `Failed` con motivo (catálogo: ausente, dirección errónea, rechazado, otro).
- Detalle con mini-mapa (posición del courier → destino) y distancia/ETA aproximada (haversine + velocidad media).

### RF-03 Tracking en tiempo real
- El courier publica su posición cada ~5 s (Geolocation API; en demo, un **simulador** server-side mueve las unidades por sus rutas).
- Posiciones en **store en memoria** (`IPositionStore`) — *trade-off documentado*: el doc maestro pide Redis; la interfaz está lista para un `RedisPositionStore`, pero el tier gratuito de Azure no incluye Redis y una instancia única no lo necesita. No se persiste cada ping en SQL.
- Hub SignalR `/hubs/tracking` (JWT): eventos `UnitMoved {unitCode, lat, lng, heading}` y `DeliveryUpdated {deliveryId, status}`. Coordinator se suscribe a todo; courier a su ruta.

### RF-04 Panel de despacho (coordinator)
- KPIs: entregadas hoy, % a tiempo, retrasos, unidades activas.
- **Mapa Leaflet** (tiles oscuros CARTO) con pin por unidad activa, movimiento en vivo, popup con unidad/courier/paradas restantes/ETA/progreso. Click en unidad de la lista → centra el mapa.
- Lista lateral de unidades con tabs Activos/En cola/Cerrados, barra de progreso por ruta.
- Detalle de ruta: paradas con estado, hora de entrega, ver firma de las entregadas.

### RF-05 Historial y métricas
- Rutas pasadas con métricas (entregas, % éxito, duración). Listado paginado server-side.
- `DeliveryEvent` (auditoría de transiciones: quién, cuándo, posición).

### RF-06 Estándares de entrega (sección 2 del doc maestro)
- App **bilingüe EN/ES** (patrón `core/i18n.ts` de MediTrack), `/about` pública bilingüe, README + TECHNICAL.md, CI, seed realista (los nombres del mockup: UNIT-07 Luis C., Rachel Donovan…), deploy Azure + Pages, **PWA instalable** (manifest + service worker), errores de formulario legibles (estándar nuevo: `api-error.ts`).

## 2. Modelo de datos (SQL Server)

```
User            (Id PK, Email UQ, PasswordHash, FullName, Role [Courier|Coordinator], FailedLoginCount, LockoutEndUtc?, CreatedAtUtc)
RefreshToken    (igual a MediTrack)
CourierProfile  (Id PK, UserId FK UQ, UnitCode UQ ['UNIT-07'], VehicleType, IsActive)
Route           (Id PK, CourierProfileId FK, RouteCode ['R-07'], Date date, Status [Planned|Active|Completed],
                 StartLat/Lng, CreatedAtUtc)  -- UQ(CourierProfileId, Date)
Delivery        (Id PK, RouteId FK, Sequence int, PackageCode UQ ['PKG-88412'], CustomerName, Address,
                 Lat, Lng decimal(9,6), WindowEndUtc?, Parcels int, SignatureRequired bit,
                 Status [Pending|Delivered|Failed], DeliveredAtUtc?, FailReason?, SignaturePng? nvarchar(max),
                 DeliveredLat/Lng?)  -- INDEX (RouteId, Sequence)
DeliveryEvent   (Id PK bigint, DeliveryId FK, UserId, FromStatus, ToStatus, Lat?, Lng?, Note?, OccurredAtUtc)  -- append-only
```
Posiciones en vivo: `IPositionStore` en memoria (ConcurrentDictionary por UnitCode), NO tabla SQL.

## 3. API (`/api/v1`, paginación estándar, ProblemDetails)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | /auth/login · refresh · logout | público/auth | Patrón MediTrack |
| GET | /me | auth | Perfil + rol + unitCode |
| GET | /routes/today | Courier | Mi ruta de hoy con entregas ordenadas |
| GET | /routes?date&page · /routes/{id} | Coordinator | Listado/detalle (con firma) |
| PATCH | /deliveries/{id}/deliver | Courier (su ruta) | Body: signaturePng?, lat, lng — valida firma si requerida |
| PATCH | /deliveries/{id}/fail | Courier (su ruta) | Body: reason, lat, lng |
| POST | /positions | Courier | Ping {lat, lng, heading} → store + broadcast |
| GET | /dispatch/summary | Coordinator | KPIs del día |
| GET | /dispatch/units | Coordinator | Unidades activas: posición, paradas restantes, ETA, progreso |
| Hub | /hubs/tracking | auth | UnitMoved, DeliveryUpdated |

## 4. Arquitectura y decisiones

- Backend Clean Architecture (Domain/Application/Infrastructure/Api), capa de servicios, patrón Actor de MediTrack simplificado.
- **Simulador de demo** (`FleetSimulatorBackgroundService`): mueve las unidades activas a lo largo de su secuencia de paradas (interpolación entre puntos, ~cada 3 s), publica al store + SignalR y completa entregas aleatoriamente — la demo viva sin repartidores reales. Solo si `Simulator:Enabled=true`.
- **Una sola app Ionic** con dos experiencias: rutas `/driver/*` (tabs móviles, dark, botones 44px+) y `/dispatch/*` (layout desktop con Leaflet). *Trade-off documentado*: en producción real serían apps separadas; aquí un deploy único demuestra Ionic + panel web compartiendo auth/i18n/core.
- Mapas: **Leaflet** + tiles oscuros CARTO (gratis, sin API key). Firma: canvas propio (sin libs).
- Geo: ciudad demo = **Seattle** (coords reales para que Leaflet luzca). Distancias haversine.
- Tests: dominio (transiciones de entrega, firma requerida, progreso de ruta, haversine) + aplicación (RBAC courier/coordinator, deliver/fail E2E, position store).
- Deploy: Azure F1 + SQL serverless (`fleetgo-rg`) con WebSockets, Pages con `window.FLEETGO_API_BASE`.

## 5. Plan de fases — ver PHASES.md
