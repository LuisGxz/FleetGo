import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { busOutline, logoGithub, openOutline } from 'ionicons/icons';
import { LanguageService } from '../../core/language.service';
import { LangPillComponent } from '../../shared/lang-pill.component';

interface PatternRow { pattern: string; where: string; why: string; }

interface AboutCopy {
  back: string;
  title: string;
  leadHtml: string;
  tryDemo: string;
  sourceCode: string;
  demoCreds: string;
  scopeTitle: string;
  scope: string[];
  archTitle: string;
  archIntro: string;
  archBullets: string[];
  patternsTitle: string;
  patternsHead: [string, string, string];
  patterns: PatternRow[];
  authTitle: string;
  auth: string[];
  dataTitle: string;
  data: string[];
  rtTitle: string;
  rt: string[];
  perfTitle: string;
  perf: string[];
  testTitle: string;
  test: string[];
  tradeTitle: string;
  trade: string[];
  deepDive: string;
  footer: string;
}

const EN: AboutCopy = {
  back: '← FleetGo',
  title: 'About this project',
  leadHtml: `FleetGo is a <strong>portfolio project</strong> built end-to-end by
    <a href="https://github.com/LuisGxz" target="_blank" rel="noreferrer">Luis Chiquito Vera</a> —
    a last-mile logistics platform with live fleet tracking, engineered with production practices.
    This page is the technical summary for reviewers and interviewers.`,
  tryDemo: 'Try the live demo',
  sourceCode: 'Source code',
  demoCreds: 'Demo credentials:',
  scopeTitle: 'Scope',
  scope: [
    'Mobile driver app: daily route, ordered stops with progress and time windows',
    'Mark delivered with hand-drawn signature capture (canvas → PNG) when required',
    'Incident reporting with reason catalog — failed stops close immutably',
    'Dispatch panel: day KPIs, unit list with tabs, route detail with signatures',
    'Live Leaflet map — every unit moves in real time over SignalR',
    'Server-side fleet simulator so the demo is alive 24/7 without real drivers',
    'JWT auth + rotating refresh tokens + lockout · Courier/Coordinator RBAC',
    'Bilingual EN/ES, installable PWA, 20 unit tests + 5 Playwright E2E flows + CI'
  ],
  archTitle: 'Architecture',
  archIntro: 'Clean Architecture with a service layer and a strict inward dependency rule — one Ionic app serves two role-based experiences:',
  archBullets: [
    '<strong>Domain</strong> — state machines, not anemic data: <code>Delivery.MarkDelivered()</code> enforces signature and immutability, <code>Route.RefreshStatus()</code> derives progress. Zero dependencies.',
    '<strong>Application</strong> — one service per area (Routes, Deliveries, Dispatch, Auth) taking an explicit <code>Actor</code>; FluentValidation on every request; ports (<code>IPositionStore</code>, <code>ITrackingNotifier</code>, <code>IClock</code>) implemented by Infrastructure.',
    '<strong>Frontend</strong> — Ionic 8 + Angular 20 standalone with signals; <code>/driver</code> (mobile, 44px+ touch targets) and <code>/dispatch</code> (desktop + map) share auth, i18n, API client and the SignalR core.'
  ],
  patternsTitle: 'Design patterns',
  patternsHead: ['Pattern', 'Where', 'Why'],
  patterns: [
    { pattern: 'Actor pattern', where: 'Every Application service method', why: 'RBAC decisions are explicit and testable — never read from HttpContext' },
    { pattern: 'Domain state machine', where: 'Delivery / Route entities', why: 'Invalid transitions are unrepresentable; rules live with the data' },
    { pattern: 'Ports & adapters', where: 'IPositionStore, ITrackingNotifier, IClock', why: 'Unit tests run with fakes; Redis/SignalR slot in without touching callers' },
    { pattern: 'Background service', where: 'FleetSimulatorBackgroundService', why: 'Demo-life engine isolated from request handling' },
    { pattern: 'Append-only event log', where: 'DeliveryEvent', why: 'Full audit of who/when/where for every transition — never updated' },
    { pattern: 'Options pattern', where: 'JwtOptions', why: 'The app refuses to boot misconfigured' },
    { pattern: 'Interceptor + silent refresh', where: 'Angular authInterceptor', why: '401 → refresh → transparent retry; session survives expiry and F5' }
  ],
  authTitle: 'Authentication & security',
  auth: [
    '<strong>Access token</strong> JWT, 15 min · <strong>refresh token</strong> rotating, 7 days, stored only as a hash.',
    '<strong>No self-service registration</strong> — fleet users are provisioned by operations (seed). Smaller attack surface, matches the domain.',
    'Account lockout after repeated failures · PBKDF2 password hashing · per-client-IP rate limiting on <code>/auth</code> (ForwardedHeaders honored behind the Azure gateway).',
    '<strong>RBAC in the service layer</strong>: a courier requesting another courier’s route or delivery gets <strong>403</strong>; the coordinator has no mutation endpoints at all.',
    'JWT over WebSockets via query string scoped to <code>/hubs</code> only · errors as RFC 7807 ProblemDetails · CORS locked to the frontend origin.'
  ],
  dataTitle: 'Domain rules & data integrity',
  data: [
    '<strong>Signature enforcement</strong> — <code>Delivered</code> requires a PNG data-URL (≤200 KB, validated) when the stop demands it.',
    '<strong>Closed deliveries are immutable</strong> — a second transition throws in the domain; nothing persists.',
    '<strong>DeliveryEvent is append-only</strong> — every transition records actor, timestamp and position; no update/delete paths exist.',
    '<code>decimal(9,6)</code> coordinates · UTC everywhere with injectable <code>IClock</code> · unique index per courier+date route.'
  ],
  rtTitle: 'Real-time',
  rt: [
    'Positions are <strong>ephemeral</strong>: pings go to an in-memory <code>IPositionStore</code> and broadcast over SignalR — they never touch SQL. The interface is the documented seam for a <code>RedisPositionStore</code>.',
    '<code>UnitMoved</code> moves map markers live; <code>DeliveryUpdated</code> triggers a throttled KPI/unit refresh on open dispatch panels.',
    'The fleet simulator interpolates every active unit toward its next stop (~3 s ticks) and resolves stops on arrival — except UNIT-07, reserved for the interactive demo courier.'
  ],
  perfTitle: 'Performance',
  perf: [
    'Lazy route per page (verified chunk splitting) · signals over zones-heavy state.',
    'Single round-trip per dispatch refresh (summary + units in parallel), SignalR instead of polling.',
    'Leaflet markers updated in place (no re-render); tiles cached by the service worker.'
  ],
  testTitle: 'Testing',
  test: [
    '<strong>20 unit tests</strong>: delivery transitions (signature rule, immutability), route progress, haversine, RBAC (foreign-route 403, coordinator read-only) and the position store — application tests on SQLite in-memory.',
    '<strong>5 Playwright E2E flows</strong>: courier delivers with a drawn signature and a second browser context (dispatch) sees the unit row change live; RBAC redirects both ways; EN/ES; session survives F5; zero console errors.',
    'CI on every push: backend build + tests, frontend production build.'
  ],
  tradeTitle: 'Trade-offs (made consciously)',
  trade: [
    'In-memory position store instead of Redis — the Azure free tier has no Redis and one instance doesn’t need it; the port makes the swap a one-class change.',
    'One Ionic app for two roles — real operations would ship separate apps; a single deploy demonstrates Ionic + web panel + shared core in one reviewable codebase.',
    'Straight-line simulator movement and haversine ETAs — road-snapped routing (OSRM) is out of scope for a demo.',
    'Refresh token in <code>localStorage</code> — XSS window accepted for the SPA demo; mitigated by 15-min tokens + rotation.'
  ],
  deepDive: 'Full deep-dive:',
  footer: 'Built by <a href="https://github.com/LuisGxz" target="_blank" rel="noreferrer">Luis Chiquito Vera</a> · Software Engineer · Guayaquil, Ecuador'
};

const ES: AboutCopy = {
  back: '← FleetGo',
  title: 'Sobre este proyecto',
  leadHtml: `FleetGo es un <strong>proyecto de portafolio</strong> construido de punta a punta por
    <a href="https://github.com/LuisGxz" target="_blank" rel="noreferrer">Luis Chiquito Vera</a> —
    una plataforma de logística de última milla con tracking de flota en vivo, desarrollada con prácticas de producción.
    Esta página es el resumen técnico para revisores y entrevistadores.`,
  tryDemo: 'Probar la demo',
  sourceCode: 'Código fuente',
  demoCreds: 'Credenciales de demo:',
  scopeTitle: 'Alcance',
  scope: [
    'App móvil del repartidor: ruta diaria, paradas ordenadas con progreso y ventanas horarias',
    'Marcar entregado con captura de firma a mano (canvas → PNG) cuando se requiere',
    'Reporte de incidencias con catálogo de motivos — las paradas fallidas se cierran inmutables',
    'Panel de despacho: KPIs del día, lista de unidades con tabs, detalle de ruta con firmas',
    'Mapa Leaflet en vivo — cada unidad se mueve en tiempo real por SignalR',
    'Simulador de flota server-side para que la demo viva 24/7 sin repartidores reales',
    'Auth JWT + refresh tokens rotativos + bloqueo · RBAC Courier/Coordinator',
    'Bilingüe EN/ES, PWA instalable, 20 tests unitarios + 5 flujos E2E con Playwright + CI'
  ],
  archTitle: 'Arquitectura',
  archIntro: 'Clean Architecture con capa de servicios y regla estricta de dependencias hacia adentro — una sola app Ionic sirve dos experiencias por rol:',
  archBullets: [
    '<strong>Domain</strong> — máquinas de estado, no datos anémicos: <code>Delivery.MarkDelivered()</code> exige la firma e impone inmutabilidad, <code>Route.RefreshStatus()</code> deriva el progreso. Cero dependencias.',
    '<strong>Application</strong> — un servicio por área (Routes, Deliveries, Dispatch, Auth) que recibe un <code>Actor</code> explícito; FluentValidation en cada request; puertos (<code>IPositionStore</code>, <code>ITrackingNotifier</code>, <code>IClock</code>) implementados por Infrastructure.',
    '<strong>Frontend</strong> — Ionic 8 + Angular 20 standalone con signals; <code>/driver</code> (móvil, touch targets de 44px+) y <code>/dispatch</code> (escritorio + mapa) comparten auth, i18n, cliente API y el core de SignalR.'
  ],
  patternsTitle: 'Patrones de diseño',
  patternsHead: ['Patrón', 'Dónde', 'Por qué'],
  patterns: [
    { pattern: 'Patrón Actor', where: 'Cada método de servicio de Application', why: 'Las decisiones RBAC son explícitas y testeables — nunca se lee de HttpContext' },
    { pattern: 'Máquina de estados de dominio', where: 'Entidades Delivery / Route', why: 'Las transiciones inválidas son irrepresentables; las reglas viven con los datos' },
    { pattern: 'Puertos y adaptadores', where: 'IPositionStore, ITrackingNotifier, IClock', why: 'Tests unitarios con fakes; Redis/SignalR se conectan sin tocar a los llamadores' },
    { pattern: 'Background service', where: 'FleetSimulatorBackgroundService', why: 'El motor de la demo aislado del manejo de requests' },
    { pattern: 'Log de eventos append-only', where: 'DeliveryEvent', why: 'Auditoría completa de quién/cuándo/dónde por cada transición — nunca se edita' },
    { pattern: 'Patrón Options', where: 'JwtOptions', why: 'La app se niega a arrancar mal configurada' },
    { pattern: 'Interceptor + renovación silenciosa', where: 'authInterceptor de Angular', why: '401 → refresh → reintento transparente; la sesión sobrevive a la expiración y a F5' }
  ],
  authTitle: 'Autenticación y seguridad',
  auth: [
    '<strong>Access token</strong> JWT de 15 min · <strong>refresh token</strong> rotativo, 7 días, almacenado solo como hash.',
    '<strong>Sin registro self-service</strong> — los usuarios de flota los provisiona la operación (seed). Menor superficie de ataque, acorde al dominio.',
    'Bloqueo de cuenta tras intentos fallidos · hash de contraseñas PBKDF2 · rate limiting por IP real del cliente en <code>/auth</code> (ForwardedHeaders tras el gateway de Azure).',
    '<strong>RBAC en la capa de servicios</strong>: un courier pidiendo la ruta o entrega de otro recibe <strong>403</strong>; el coordinador no tiene endpoints de mutación.',
    'JWT por WebSockets vía query string limitado a <code>/hubs</code> · errores como ProblemDetails RFC 7807 · CORS restringido al origen del frontend.'
  ],
  dataTitle: 'Reglas de dominio e integridad de datos',
  data: [
    '<strong>Firma obligatoria</strong> — <code>Delivered</code> exige un PNG data-URL (≤200 KB, validado) cuando la parada lo requiere.',
    '<strong>Las entregas cerradas son inmutables</strong> — una segunda transición lanza excepción en el dominio; nada se persiste.',
    '<strong>DeliveryEvent es append-only</strong> — cada transición registra actor, momento y posición; no existen rutas de update/delete.',
    'Coordenadas <code>decimal(9,6)</code> · UTC en todas partes con <code>IClock</code> inyectable · índice único por courier+fecha de ruta.'
  ],
  rtTitle: 'Tiempo real',
  rt: [
    'Las posiciones son <strong>efímeras</strong>: los pings van a un <code>IPositionStore</code> en memoria y se difunden por SignalR — nunca tocan SQL. La interfaz es la costura documentada para un <code>RedisPositionStore</code>.',
    '<code>UnitMoved</code> mueve los marcadores del mapa en vivo; <code>DeliveryUpdated</code> dispara un refresh limitado de KPIs/unidades en los paneles abiertos.',
    'El simulador interpola cada unidad activa hacia su siguiente parada (ticks de ~3 s) y resuelve paradas al llegar — excepto UNIT-07, reservada para el courier interactivo de la demo.'
  ],
  perfTitle: 'Performance',
  perf: [
    'Ruta lazy por página (división de chunks verificada) · signals para el estado.',
    'Un solo round-trip por refresh de despacho (summary + units en paralelo), SignalR en lugar de polling.',
    'Marcadores de Leaflet actualizados in-place (sin re-render); tiles cacheados por el service worker.'
  ],
  testTitle: 'Testing',
  test: [
    '<strong>20 tests unitarios</strong>: transiciones de entrega (regla de firma, inmutabilidad), progreso de ruta, haversine, RBAC (403 en ruta ajena, coordinador solo-lectura) y el position store — tests de aplicación sobre SQLite in-memory.',
    '<strong>5 flujos E2E con Playwright</strong>: el courier entrega con firma dibujada y un segundo contexto de navegador (despacho) ve cambiar la unidad en vivo; redirecciones RBAC en ambos sentidos; EN/ES; la sesión sobrevive a F5; cero errores de consola.',
    'CI en cada push: build + tests del backend, build de producción del frontend.'
  ],
  tradeTitle: 'Decisiones de compromiso (conscientes)',
  trade: [
    'Store de posiciones en memoria en lugar de Redis — la capa gratuita de Azure no incluye Redis y una sola instancia no lo necesita; el puerto hace que el cambio sea una sola clase.',
    'Una app Ionic para dos roles — una operación real publicaría apps separadas; un solo deploy demuestra Ionic + panel web + core compartido en un codebase revisable.',
    'Movimiento del simulador en línea recta y ETAs por haversine — el ruteo sobre calles (OSRM) queda fuera del alcance de una demo.',
    'Refresh token en <code>localStorage</code> — se acepta la ventana de XSS para esta demo SPA; mitigado con tokens de 15 min + rotación.'
  ],
  deepDive: 'Análisis completo:',
  footer: 'Construido por <a href="https://github.com/LuisGxz" target="_blank" rel="noreferrer">Luis Chiquito Vera</a> · Software Engineer · Guayaquil, Ecuador'
};

@Component({
  selector: 'app-about',
  templateUrl: './about.page.html',
  styleUrl: './about.page.scss',
  imports: [RouterLink, IonContent, IonIcon, LangPillComponent],
})
export class AboutPage {
  readonly stack = [
    'Ionic 8', 'Angular 20 · Signals', '.NET 9 · Clean Architecture', 'SQL Server', 'EF Core 9',
    'SignalR', 'Leaflet', 'JWT + RBAC', 'PWA', 'Playwright E2E', 'Azure'
  ];

  private readonly language = inject(LanguageService);
  readonly t = computed<AboutCopy>(() => this.language.lang() === 'es' ? ES : EN);

  constructor() {
    addIcons({ busOutline, logoGithub, openOutline });
  }
}
