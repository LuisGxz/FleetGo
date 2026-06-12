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

export interface AppCopy {
  common: {
    loading: string; retry: string; error: string; back: string; cancel: string;
    close: string; signOut: string; about: string; appName: string;
  };
  login: {
    tagline: string; email: string; password: string; signIn: string; signingIn: string;
    demoLabel: string; demoCourier: string; demoDispatch: string; aboutLink: string;
    errorFallback: string; coldStart: string; infraError: string; tooManyAttempts: string;
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
    closedTag: string; noUnits: string; routeDetail: string; stop: string;
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
    tooManyAttempts: 'Too many attempts. Wait a minute and try again.'
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
    noUnits: 'No units in this view', routeDetail: 'Route detail', stop: 'Stop',
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
    tooManyAttempts: 'Demasiados intentos. Espera un minuto y vuelve a intentar.'
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
    noUnits: 'No hay unidades en esta vista', routeDetail: 'Detalle de ruta', stop: 'Parada',
    viewSignature: 'Ver firma', signatureTitle: 'Firma del cliente',
    noSignature: 'Sin firma capturada', progress: 'Progreso',
    lastPing: 'Último ping', never: '—'
  }
};

export const COPY: Record<Lang, AppCopy> = { en, es };
