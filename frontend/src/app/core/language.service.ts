import { Injectable, computed, signal } from '@angular/core';
import { COPY, FAIL_REASON_EN, FAIL_REASON_ES, Lang, STATUS_ES } from './i18n';

const LANG_KEY = 'fleetgo.lang';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly lang = signal<Lang>(readStoredLang());

  /** App-wide copy for the active language. */
  readonly t = computed(() => COPY[this.lang()]);

  /** Locale id for date pipes ('en-US' | 'es'). */
  readonly dateLocale = computed(() => this.lang() === 'es' ? 'es' : 'en-US');

  set(lang: Lang): void {
    this.lang.set(lang);
    localStorage.setItem(LANG_KEY, lang);
  }

  /** Display name for API catalog values (stored in English in the DB). */
  status(value: string): string {
    return this.lang() === 'es' ? (STATUS_ES[value] ?? value) : value;
  }

  failReason(value: string): string {
    const map = this.lang() === 'es' ? FAIL_REASON_ES : FAIL_REASON_EN;
    return map[value] ?? value;
  }
}

function readStoredLang(): Lang {
  const stored = localStorage.getItem(LANG_KEY);
  if (stored === 'en' || stored === 'es') return stored;
  return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
}
