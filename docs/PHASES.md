# FleetGo — Estado de fases

> Leer al iniciar sesión. Detalle en REQUIREMENTS.md. Mockup: `../../docs/portfolio-designs/04-fleetgo.html`.

| Fase | Alcance | Estado |
|------|---------|--------|
| F1 | Fundaciones backend (solución, Domain, EF Core, migración) | ✅ |
| F2 | Auth (login/refresh/lockout, roles Courier/Coordinator) | ✅ |
| F3 | Núcleo logístico (rutas, deliver/fail con firma, eventos) | ✅ |
| F4 | Tiempo real (IPositionStore, hub SignalR, dispatch API, simulador, seed) | ✅ |
| F5 | App Ionic base (scaffold, tema dark, i18n, auth, shells driver/dispatch) | ✅ |
| F6 | Features (lista+detalle+firma driver, mapa Leaflet vivo dispatch) + E2E | ✅ |
| F7 | Entrega (about, README, TECHNICAL, CI, PWA, deploy, card) | ✅ DEMO FULL EN VIVO |

## Phase 1-2 — Fundaciones + Auth ✅
**Files to read**: REQUIREMENTS §2 · referencia: `../meditrack/backend/` (mismo patrón: entidades, configs, AuthService sin registro público, JwtTokenService, GlobalExceptionHandler, rate limit 30/min)
**Files to create**: `backend/FleetGo.sln` + 4 proyectos + tests, entidades/enums/configs, migración InitialCreate, Auth completo (sin register), controllers Auth/Me
**Model**: Sonnet · **Criteria**: build+tests verdes, migración aplica en SQL local, login/refresh/lockout testeados

## Phase 3 — Núcleo logístico ✅
**Files to create**: `Application/{Routes,Deliveries}/` (servicios+DTOs+validadores), GeoMath (haversine/ETA), controllers
**Criteria**: courier solo SU ruta (403 ajeno), deliver exige firma si SignatureRequired e inmutable después, fail con motivo, DeliveryEvent append-only, progreso correcto, tests dominio+app

## Phase 4 — Tiempo real + simulador + seed ✅
**Files to create**: `Application/Dispatch/`, `Infrastructure/Tracking/{InMemoryPositionStore,TrackingHub,FleetSimulatorBackgroundService}`, `Infrastructure/Seed/DemoDataSeeder` (Seattle, 6 unidades, ~60 entregas, nombres del mockup), controllers Dispatch/Positions
**Criteria**: ping→store→broadcast, simulador mueve unidades y completa entregas, KPIs correctos, smoke E2E con curl + wscat/SignalR

## Phase 5-6 — App Ionic ✅
**Files to read**: mockup (tokens), `../meditrack/frontend/src/app/core/` (i18n/auth/api-error — adaptar)
**Files to create**: `frontend/` (Ionic 8 standalone + Angular 20), tema dark del mockup, core (config/models/i18n/auth/interceptor/guards/api/signalr), `/driver` (lista con progreso, detalle con mini-mapa+firma canvas+MARCAR ENTREGADO+incidencia), `/dispatch` (KPIs, lista unidades, Leaflet vivo con popups), `/about`
**Criteria**: build verde, E2E Playwright (courier entrega con firma → dispatch lo ve en vivo; RBAC; i18n; F5), 0 errores consola

## Phase 7 — Entrega ✅
**Criteria**: repo GitHub+CI, PWA manifest, deploy Azure (`fleetgo-rg`, WebSockets ON) + Pages, E2E en PROD, card en site.ts, CLAUDE.md workspace actualizado (siguiente: DocuMind)

## ✅ Entrega completada (2026-06-12) — DEMO FULL EN VIVO
- Repo: https://github.com/LuisGxz/FleetGo (CI verde: backend build+20 tests, frontend build).
- Frontend: GitHub Pages — https://luisgxz.github.io/FleetGo/ (deploy-pages.yml inyecta `window.FLEETGO_API_BASE` ANTES del build para no romper los hashes del service worker; SPA fallback 404.html; PWA instalable con ngsw).
- Backend: Azure — https://fleetgo-api-luisgxz.azurewebsites.net (App Service F1 Linux `fleetgo-api-luisgxz` con **WebSockets ON** + Azure SQL serverless free `fleetgo-db-luisgxz/FleetGo`, rg `fleetgo-rg`, centralus). Migra+seed al arrancar (`SeedDemoData=true`, `Simulator__Enabled=true`). Secretos en app settings; copia local en `.azure-secrets.local` (gitignored).
- E2E verificado EN PRODUCCIÓN: login dispatch desde Pages → 6 unidades, 6 markers moviéndose en el Leaflet, KPIs vivos, 0 pageerrors.
- Card FleetGo en `website/src/data/site.ts` (pusheada).
- ⚠️ Trampas nuevas: (1) zip de deploy — `tar.exe` de git-bash falla con rutas `C:`/`tmp` (genera archivo corrupto o "Cannot connect to C:"); usar `/c/Windows/System32/tar.exe` con salida relativa y verificar con `unzip -l` antes de `az webapp deploy`. (2) Habilitar Pages por API crea el environment `github-pages` apuntando a `master` → permitir `main` en deployment-branch-policies y re-run. (3) KPI "on time" arranca bajo en prod porque las ventanas del seed quedan en el pasado respecto al deploy.

## Log
- 2026-06-12 · Repo creado. Requerimientos y plan definidos. Decisiones: una app Ionic dual-rol, IPositionStore en memoria (Redis-ready), simulador de flota para demo viva, Seattle como ciudad demo.
- 2026-06-12 · F1–F4 ✅. Backend completo: build verde, 20/20 tests, smoke E2E OK (login ambos roles, /routes/today courier, /dispatch/summary+units, simulador moviendo flota). Rutas API bajo `api/v1/`. Commit inicial.
- 2026-06-12 · F5–F6 ✅. App Ionic 8 + Angular 20 standalone completa: tema dark del mockup, core portado de MediTrack (auth/i18n/api-error/guards), driver (lista con progreso, detalle con mini-mapa Leaflet + firma canvas propia + deliver/fail), dispatch (KPIs, tabs Activos/En cola/Cerrados, mapa Leaflet vivo por SignalR, detalle de ruta con firmas), /about bilingüe. E2E Playwright 5/5 (entrega con firma → dispatch lo ve en vivo, RBAC ambos sentidos, i18n, F5-reload, 0 pageerrors). Trampas: quitar `@angular/animations` (ya no se publica en paridad con Angular 20.3); tsconfig `lib: es2022` (starter trae es2018); `allowedCommonJsDependencies: [leaflet]`.

## Post-entrega — pase de calidad (2026-06-12, feedback del usuario)
- **Login fallaba en frío con mensaje engañoso** ("revisa tus credenciales" ante errores de infraestructura). Fix: retry de cold start ampliado (9×8 s ≈ 70 s), mensajes propios bilingües para infra (status 0/5xx/408) y 429; `keep-warm.yml` cada 15 min al App Service (la SQL serverless DEBE seguir pausándose o quema la cuota mensual). Backend: `UseForwardedHeaders` para que el rate limit particione por IP real del cliente, no por el gateway compartido.
- **Bug NG02100**: la API mezcla DateTime kinds — `EtaUtc` (computado) serializa CON `Z`, los leídos de BD SIN ella; concatenar `+ 'Z'` a ciegas generaba fechas inválidas. Fix: helper `core/dates.ts#utc()` en todos los templates.
- **/about reescrita a paridad FinPulse** (era 2 párrafos + lista): lead, chips, botones, credenciales, Alcance, Arquitectura con diagrama, tabla de patrones, Auth/seguridad, Integridad de datos, Tiempo real, Performance, Testing, Trade-offs, link a TECHNICAL. Bilingüe, copy autocontenido en el componente (patrón FinPulse).
- **E2E endurecido**: cualquier `console.error` falla el test (antes solo `pageerror` — así se escapó el NG02100). SignalR a `LogLevel.None` (los fallos ya los maneja el reconnect propio; los negotiate abortados por unload ensuciaban la consola). Favicon.ico añadido. 5/5 verde, verificado en PROD.
- Estándar nuevo en el doc maestro: **"Quality gate de entrega — FinPulse es la vara"** (estructura exacta de /about, console.error = fallo, mensajes de error que no mienten, checklist final).
- Nota: en Pages, las rutas profundas devuelven el documento con status 404 (fallback SPA) — la app funciona; es la limitación documentada de GitHub Pages.

## Post-entrega — Capa de Demo Guiada (2026-06-13, feedback del usuario)
- Nuevo estándar del portfolio: **onboarding role-aware** para que un reclutador entienda qué es la app, qué puede hacer y cómo cambia según el rol. 6 piezas: login orientador, badge "Demo · Rol" con capacidades (popover), tour spotlight de primer ingreso (coach-marks), panel "Cómo explorar" con escenarios + replay, estados vacíos que enseñan, hint del "aha" cross-rol.
- Arquitectura reutilizable: `core/tour.service.ts` (signals + localStorage por tour id, replay con `{force}`) + `shared/coach-mark.component.ts` (overlay global montado en el root, spotlight por `[data-tour]`, reposiciona en scroll/resize, salta targets ausentes, `prefers-reduced-motion`) + `shared/role-badge.component.ts` + `shared/demo-guide.component.ts`. Tours: `driver` (3), `driver-delivery` (3), `dispatch` (4, último = aha "entrega como courier y míralo en vivo aquí").
- **Bug real cazado por el E2E estricto**: el `signature-pad` borraba el trazo — su `ResizeObserver` disparaba `resize()` en reflows espurios (incluido tras firmar), limpiando el canvas y reseteando el ink. Fix: ignorar resizes sin cambio real de dimensiones y preservar el dibujo (snapshot→restore) en resizes reales. El test ahora dibuja tras esperar que asiente el mini-mapa y aserta que el ink registró.
- E2E 6/6 (test dedicado del tour: auto-arranque, pasos, badge, panel, replay) + 0 console.error. Estándar documentado en `../docs/PORTFOLIO_PROJECTS.md` (sección 2 → "Capa de Demo Guiada" + checklist de entrega).
- ⚠️ El backend de Azure crasheaba (503) al pasar a 2026-06-13: el bug del seeder (PackageCode determinista duplicado en regeneración diaria) tumbaba el contenedor al arrancar. Desplegado el fix (contador de PKG arranca sobre el máximo existente) + `UseForwardedHeaders` (rate limit por IP real del cliente tras el gateway).

## Cómo correr (dev)
- API: `dotnet run --project backend/FleetGo.Api --urls http://localhost:5200` (migra+seed en Development; simulador ON).
- App: `npm start` en frontend/ (http://localhost:4200).
- Demo: `courier@fleetgo.dev` (UNIT-07) · `dispatch@fleetgo.dev` / `Demo1234!`
