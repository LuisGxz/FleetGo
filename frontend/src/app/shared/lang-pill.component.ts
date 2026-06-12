import { Component, inject } from '@angular/core';
import { LanguageService } from '../core/language.service';

/** EN/ES toggle pill (mockup header), present on every screen. */
@Component({
  selector: 'app-lang-pill',
  template: `
    <div class="lang-pill">
      <button type="button" (click)="lang.set('en')" [class.active-lang]="lang.lang() === 'en'">EN</button>
      <button type="button" (click)="lang.set('es')" [class.active-lang]="lang.lang() === 'es'">ES</button>
    </div>
  `,
})
export class LangPillComponent {
  readonly lang = inject(LanguageService);
}
