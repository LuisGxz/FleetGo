# FleetGo — Logística & tracking en tiempo real

Proyecto flagship #3 del portfolio (el diferenciador **Ionic/móvil**). Repo git propio en el workspace `C:\Emprendimiento\Portfolio`.

## Al iniciar sesión
1. Leer `docs/PHASES.md`. No releer fases ✅.
2. Mockup: `../docs/portfolio-designs/04-fleetgo.html` · Estándares: sección 2 de `../docs/PORTFOLIO_PROJECTS.md`.
3. Reutilizar patrones de **MediTrack** (auth sin 2FA, i18n, api-error, deploy) — los archivos de referencia están listados en cada fase.

## Stack real
- **Backend:** .NET 9 (paquetes Microsoft a 9.0.x), Clean Architecture + service layer, EF Core + SQL Server local (`Server=localhost;Database=FleetGo;Trusted_Connection=True;TrustServerCertificate=True`), SignalR, puerto dev **5200**.
- **Frontend:** **Ionic 8 + Angular 20** standalone — UNA app, dos experiencias: `/driver` (móvil dark) y `/dispatch` (desktop + Leaflet). PWA.
- **Posiciones:** `IPositionStore` en memoria (sin Redis — trade-off documentado; interfaz Redis-ready). Nunca persistir pings en SQL.
- **Mapas:** Leaflet + tiles CARTO dark (sin API key). **Firma:** canvas propio.
- **Simulador:** `FleetSimulatorBackgroundService` mueve la flota en demo (`Simulator:Enabled`).
- **Deploy:** Azure F1 + SQL serverless (rg `fleetgo-rg`, WebSockets ON) + GitHub Pages (`window.FLEETGO_API_BASE`).

## Reglas del dominio
- Courier solo accede a SU ruta del día (403 en ajenas). Coordinator no modifica entregas.
- `Delivered` exige firma PNG si `SignatureRequired`; tras entregar/fallar la entrega es inmutable.
- `DeliveryEvent` append-only con posición. Pings ~5 s; el simulador no pisa unidades con courier real activo.

## Comandos
```bash
dotnet build backend/FleetGo.sln && dotnet test backend/FleetGo.sln
dotnet run --project backend/FleetGo.Api --urls http://localhost:5200   # migra + seed + simulador
npm start --prefix frontend                                             # http://localhost:4200
```
Demo: `courier@fleetgo.dev` (UNIT-07) · `dispatch@fleetgo.dev` / `Demo1234!`

## Convenciones
- Las de MediTrack (TS estricto, estados loading/empty/error, i18n EN/ES a mano en TODA pantalla, errores de formulario legibles vía `api-error.ts`, paginación server-side, evitar `cd X && escritura`).
- Touch targets ≥44px en /driver; mono (JetBrains Mono) para códigos y números.
- Al cerrar cada fase: actualizar `docs/PHASES.md`.
