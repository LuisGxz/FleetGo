export type Lang = 'en' | 'es';

/** Display translation for API enum values (stored in English in the DB). */
export const STATUS_ES: Record<string, string> = {
  Pending: 'Pendiente', Delivered: 'Entregado', Failed: 'Fallido',
  Planned: 'Planificada', Active: 'Activa', Completed: 'Completada'
};

export const FAIL_REASON_ES: Record<string, string> = {
  CustomerAbsent: 'Cliente ausente', WrongAddress: 'Dirección errónea',
  Rejected: 'Rechazado', Other: 'Otro'
};

export const FAIL_REASON_EN: Record<string, string> = {
  CustomerAbsent: 'Customer absent', WrongAddress: 'Wrong address',
  Rejected: 'Rejected', Other: 'Other'
};

export interface TourCopy { title: string; body: string; }

export interface AppCopy {
  common: {
    loading: string; retry: string; error: string; back: string; cancel: string;
    close: string; signOut: string; about: string; appName: string;
  };
  login: {
    tagline: string; email: string; password: string; signIn: string; signingIn: string;
    demoLabel: string; demoCourier: string; demoDispatch: string; aboutLink: string;
    errorFallback: string; coldStart: string; infraError: string; tooManyAttempts: string;
    intro: string; crossRoleTip: string;
  };
  tour: {
    skip: string; back: string; next: string; done: string;
    driver: TourCopy[]; driverDelivery: TourCopy[]; dispatch: TourCopy[];
  };
  guide: {
    helpLabel: string; title: string; subtitle: string; replayTour: string;
    scenariosTitle: string; ahaTag: string; driverScenarios: string[]; dispatchScenarios: string[];
  };
  roleBadge: {
    demo: string; courier: string; coordinator: string; canTitle: string; cantTitle: string;
    courierCan: string[]; courierCant: string; coordinatorCan: string[]; coordinatorCant: string;
  };
  driver: {
    todayTitle: string; routeOf: string; completedSuffix: string; upNext: string;
    eta: string; open: string; noRoute: string; noRouteHint: string;
    parcels: string; byTime: string; signatureReq: string; signatureHint: string;
    clear: string; markDelivered: string; delivering: string; reportIssue: string;
    issueTitle: string; issueReason: string; issueNote: string; issueNotePlaceholder: string;
    submitIssue: string; submittingIssue: string; deliveredAt: string; failedTag: string;
    immutableNote: string; signatureMissing: string; callCustomer: string;
    deliverErrorFallback: string; failErrorFallback: string;
  };
  dispatch: {
    title: string; unitsActive: string; deliveredToday: string; onTime: string;
    delays: string; tabActive: string; tabQueued: string; tabClosed: string;
    stops: string; stopsRemaining: string; enRoute: string; queuedTag: string;
    closedTag: string; noUnits: string; noUnitsHint: string; routeDetail: string; stop: string;
    viewSignature: string; signatureTitle: string; noSignature: string;
    progress: string; lastPing: string; never: string;
  };
}

const en: AppCopy = {
  common: {
    loading: 'Loading…', retry: 'Retry', error: 'Something went wrong', back: 'Back',
    cancel: 'Cancel', close: 'Close', signOut: 'Sign out', about: 'About', appName: 'FleetGo'
  },
  login: {
    tagline: 'Last-mile logistics & live fleet tracking',
    email: 'Email', password: 'Password', signIn: 'Sign in', signingIn: 'Signing in…',
    demoLabel: 'Demo accounts', demoCourier: 'Courier (driver app)', demoDispatch: 'Coordinator (dispatch panel)',
    aboutLink: 'About this project',
    errorFallback: 'Could not sign in. Check your credentials.',
    coldStart: 'The demo API may take ~1 min to wake up on the first request.',
    infraError: 'The demo API is still waking up (free tier). Please try again in a few seconds — your credentials are fine.',
    tooManyAttempts: 'Too many attempts. Wait a minute and try again.',
    intro: 'A last-mile logistics demo: drivers work their route from a mobile app while dispatch tracks the whole fleet live.',
    crossRoleTip: 'Tip: open both roles in two tabs — deliver as the courier and watch it move live on the dispatch map.'
  },
  tour: {
    skip: 'Skip', back: 'Back', next: 'Next', done: 'Got it',
    driver: [
      { title: 'Your route today', body: "This is your assigned route and how many stops you've completed so far." },
      { title: 'Your next stop', body: 'Tap any stop to open it — address, mini-map, and what to do there.' },
      { title: 'Replay anytime', body: 'Reopen this guide and see suggested things to try from this button.' }
    ],
    driverDelivery: [
      { title: "Where you're headed", body: 'The customer location and your distance to it.' },
      { title: 'Complete the delivery', body: 'Sign on the pad if a signature is required, then tap Mark Delivered.' },
      { title: 'Something went wrong?', body: 'Report an issue (absent, wrong address…) to close the stop as failed.' }
    ],
    dispatch: [
      { title: 'Live operations', body: 'Delivered today, on-time %, delays and active units — at a glance.' },
      { title: 'Your fleet', body: 'Click a unit to center the map; double-click for its route and signatures. Tabs split active / queued / closed.' },
      { title: 'Live map', body: 'Every unit moves here in real time over SignalR — no refresh needed.' },
      { title: 'See it live', body: 'Open the courier app in another tab, deliver a stop, and watch UNIT-07 update right here.' }
    ]
  },
  guide: {
    helpLabel: 'How to explore', title: 'How to explore this demo',
    subtitle: 'A few things to try in this role:',
    replayTour: 'Replay the guided tour',
    scenariosTitle: 'Try this', ahaTag: 'LIVE',
    driverScenarios: [
      'Open your next stop and explore the address and mini-map.',
      "Mark a delivery as done — sign on the canvas first if it's required.",
      'Report an issue to close a stop as failed (it becomes read-only).',
      'Open the dispatch panel in another tab and watch your delivery appear live.'
    ],
    dispatchScenarios: [
      'Watch the units move on the map in real time.',
      'Click a unit to center it; double-click for its route detail and signatures.',
      'Switch the Active / Queued / Closed tabs.',
      'Sign in as the courier in another tab, deliver a stop, and see UNIT-07 update here live.'
    ]
  },
  roleBadge: {
    demo: 'Demo', courier: 'Courier', coordinator: 'Coordinator',
    canTitle: 'What you can do', cantTitle: 'Role limits',
    courierCan: ['See only your own daily route', 'Deliver with signature capture', 'Report delivery incidents'],
    courierCant: "Can't see other couriers or the dispatch panel.",
    coordinatorCan: ['See the whole fleet live on the map', "Track KPIs and every route's progress", 'View delivery signatures'],
    coordinatorCant: 'Read-only: cannot modify deliveries.'
  },
  driver: {
    todayTitle: "Today's deliveries", routeOf: 'of', completedSuffix: 'completed',
    upNext: 'UP NEXT', eta: 'ETA', open: 'OPEN →',
    noRoute: 'No route assigned for today', noRouteHint: 'Check back with dispatch.',
    parcels: 'parcels', byTime: 'by', signatureReq: 'Signature req.',
    signatureHint: 'customer signature', clear: 'Clear',
    markDelivered: 'MARK DELIVERED', delivering: 'Saving…', reportIssue: 'Report an issue',
    issueTitle: 'Report an issue', issueReason: 'Reason', issueNote: 'Note (optional)',
    issueNotePlaceholder: 'Extra detail for dispatch…',
    submitIssue: 'Mark as failed', submittingIssue: 'Saving…',
    deliveredAt: 'Delivered at', failedTag: 'FAILED',
    immutableNote: 'This delivery is closed and can no longer be changed.',
    signatureMissing: 'This delivery requires the customer signature.',
    callCustomer: 'Call customer',
    deliverErrorFallback: 'Could not mark as delivered.',
    failErrorFallback: 'Could not report the issue.'
  },
  dispatch: {
    title: 'Live operations', unitsActive: 'units active', deliveredToday: 'Delivered today:',
    onTime: 'On time:', delays: 'Delays:',
    tabActive: 'Active', tabQueued: 'Queued', tabClosed: 'Closed',
    stops: 'stops', stopsRemaining: 'stops remaining', enRoute: 'EN ROUTE',
    queuedTag: 'QUEUED', closedTag: 'CLOSED',
    noUnits: 'No units in this view',
    noUnitsHint: 'Switch the Active / Queued / Closed tabs to see other units.',
    routeDetail: 'Route detail', stop: 'Stop',
    viewSignature: 'View signature', signatureTitle: 'Customer signature',
    noSignature: 'No signature captured', progress: 'Progress',
    lastPing: 'Last ping', never: '—'
  }
};

const es: AppCopy = {
  common: {
    loading: 'Cargando…', retry: 'Reintentar', error: 'Algo salió mal', back: 'Volver',
    cancel: 'Cancelar', close: 'Cerrar', signOut: 'Cerrar sesión', about: 'Acerca de', appName: 'FleetGo'
  },
  login: {
    tagline: 'Logística de última milla y tracking de flota en vivo',
    email: 'Email', password: 'Contraseña', signIn: 'Entrar', signingIn: 'Entrando…',
    demoLabel: 'Cuentas demo', demoCourier: 'Repartidor (app móvil)', demoDispatch: 'Coordinador (panel de despacho)',
    aboutLink: 'Acerca de este proyecto',
    errorFallback: 'No se pudo iniciar sesión. Revisa tus credenciales.',
    coldStart: 'La API demo puede tardar ~1 min en despertar en la primera petición.',
    infraError: 'La API demo aún está despertando (capa gratuita). Vuelve a intentarlo en unos segundos — tus credenciales están bien.',
    tooManyAttempts: 'Demasiados intentos. Espera un minuto y vuelve a intentar.',
    intro: 'Una demo de logística de última milla: los repartidores trabajan su ruta desde una app móvil mientras despacho sigue a toda la flota en vivo.',
    crossRoleTip: 'Tip: abre ambos roles en dos pestañas — entrega como courier y míralo moverse en vivo en el mapa de despacho.'
  },
  tour: {
    skip: 'Saltar', back: 'Atrás', next: 'Siguiente', done: 'Entendido',
    driver: [
      { title: 'Tu ruta de hoy', body: 'Esta es tu ruta asignada y cuántas paradas llevas completadas.' },
      { title: 'Tu siguiente parada', body: 'Toca cualquier parada para abrirla — dirección, mini-mapa y qué hacer ahí.' },
      { title: 'Reabre cuando quieras', body: 'Vuelve a abrir esta guía y mira qué probar desde este botón.' }
    ],
    driverDelivery: [
      { title: 'A dónde vas', body: 'La ubicación del cliente y tu distancia hasta ahí.' },
      { title: 'Completa la entrega', body: 'Firma en el panel si se requiere y luego toca Marcar entregado.' },
      { title: '¿Algo salió mal?', body: 'Reporta una incidencia (ausente, dirección errónea…) para cerrar la parada como fallida.' }
    ],
    dispatch: [
      { title: 'Operaciones en vivo', body: 'Entregadas hoy, % a tiempo, retrasos y unidades activas — de un vistazo.' },
      { title: 'Tu flota', body: 'Haz clic en una unidad para centrar el mapa; doble clic para su ruta y firmas. Las tabs separan activos / en cola / cerrados.' },
      { title: 'Mapa en vivo', body: 'Cada unidad se mueve aquí en tiempo real por SignalR — sin recargar.' },
      { title: 'Míralo en vivo', body: 'Abre la app del courier en otra pestaña, entrega una parada y mira a UNIT-07 actualizarse aquí mismo.' }
    ]
  },
  guide: {
    helpLabel: 'Cómo explorar', title: 'Cómo explorar esta demo',
    subtitle: 'Algunas cosas para probar en este rol:',
    replayTour: 'Repetir el tour guiado',
    scenariosTitle: 'Prueba esto', ahaTag: 'EN VIVO',
    driverScenarios: [
      'Abre tu siguiente parada y explora la dirección y el mini-mapa.',
      'Marca una entrega como hecha — firma en el canvas primero si se requiere.',
      'Reporta una incidencia para cerrar una parada como fallida (queda solo lectura).',
      'Abre el panel de despacho en otra pestaña y mira tu entrega aparecer en vivo.'
    ],
    dispatchScenarios: [
      'Mira las unidades moverse en el mapa en tiempo real.',
      'Haz clic en una unidad para centrarla; doble clic para su detalle de ruta y firmas.',
      'Cambia entre las tabs Activos / En cola / Cerrados.',
      'Entra como el courier en otra pestaña, entrega una parada y mira a UNIT-07 actualizarse aquí en vivo.'
    ]
  },
  roleBadge: {
    demo: 'Demo', courier: 'Repartidor', coordinator: 'Coordinador',
    canTitle: 'Qué puedes hacer', cantTitle: 'Límites del rol',
    courierCan: ['Ver solo tu propia ruta del día', 'Entregar con captura de firma', 'Reportar incidencias de entrega'],
    courierCant: 'No puede ver otros repartidores ni el panel de despacho.',
    coordinatorCan: ['Ver toda la flota en vivo en el mapa', 'Seguir KPIs y el progreso de cada ruta', 'Ver firmas de entrega'],
    coordinatorCant: 'Solo lectura: no puede modificar entregas.'
  },
  driver: {
    todayTitle: 'Entregas de hoy', routeOf: 'de', completedSuffix: 'completadas',
    upNext: 'SIGUIENTE', eta: 'ETA', open: 'ABRIR →',
    noRoute: 'Sin ruta asignada para hoy', noRouteHint: 'Consulta con despacho.',
    parcels: 'bultos', byTime: 'antes de', signatureReq: 'Firma requerida',
    signatureHint: 'firma del cliente', clear: 'Borrar',
    markDelivered: 'MARCAR ENTREGADO', delivering: 'Guardando…', reportIssue: 'Reportar incidencia',
    issueTitle: 'Reportar incidencia', issueReason: 'Motivo', issueNote: 'Nota (opcional)',
    issueNotePlaceholder: 'Detalle extra para despacho…',
    submitIssue: 'Marcar como fallida', submittingIssue: 'Guardando…',
    deliveredAt: 'Entregado a las', failedTag: 'FALLIDA',
    immutableNote: 'Esta entrega está cerrada y ya no puede modificarse.',
    signatureMissing: 'Esta entrega requiere la firma del cliente.',
    callCustomer: 'Llamar al cliente',
    deliverErrorFallback: 'No se pudo marcar como entregado.',
    failErrorFallback: 'No se pudo reportar la incidencia.'
  },
  dispatch: {
    title: 'Operaciones en vivo', unitsActive: 'unidades activas', deliveredToday: 'Entregadas hoy:',
    onTime: 'A tiempo:', delays: 'Retrasos:',
    tabActive: 'Activos', tabQueued: 'En cola', tabClosed: 'Cerrados',
    stops: 'paradas', stopsRemaining: 'paradas restantes', enRoute: 'EN RUTA',
    queuedTag: 'EN COLA', closedTag: 'CERRADA',
    noUnits: 'No hay unidades en esta vista',
    noUnitsHint: 'Cambia entre las tabs Activos / En cola / Cerrados para ver otras unidades.',
    routeDetail: 'Detalle de ruta', stop: 'Parada',
    viewSignature: 'Ver firma', signatureTitle: 'Firma del cliente',
    noSignature: 'Sin firma capturada', progress: 'Progreso',
    lastPing: 'Último ping', never: '—'
  }
};

export const COPY: Record<Lang, AppCopy> = { en, es };
