import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonInput, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { busOutline, mapOutline } from 'ionicons/icons';
import { apiErrorMessages } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import { UserDto } from '../../core/models';
import { LangPillComponent } from '../../shared/lang-pill.component';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
  imports: [FormsModule, RouterLink, IonContent, IonInput, IonButton, IonIcon, IonSpinner, LangPillComponent],
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly lang = inject(LanguageService);

  email = '';
  password = '';
  readonly busy = signal(false);
  readonly errors = signal<string[]>([]);
  readonly slow = signal(false);

  constructor() {
    addIcons({ busOutline, mapOutline });
  }

  fill(email: string): void {
    this.email = email;
    this.password = 'Demo1234!';
  }

  async submit(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.errors.set([]);
    this.slow.set(false);
    const slowTimer = setTimeout(() => this.slow.set(true), 4000);

    try {
      const user = await this.loginWithColdStartRetry();
      this.router.navigate([this.auth.homeFor(user.role)]);
    } catch (e) {
      this.errors.set(apiErrorMessages(e, this.lang.t().login.errorFallback));
    } finally {
      clearTimeout(slowTimer);
      this.slow.set(false);
      this.busy.set(false);
    }
  }

  /**
   * The free-tier API + serverless DB can be asleep: the first requests die at the
   * gateway (status 0/5xx) while everything wakes up. Those failures are retried —
   * real credential errors (400/401/423) surface immediately.
   */
  private async loginWithColdStartRetry(): Promise<UserDto> {
    const COLD_START_ATTEMPTS = 4;
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.auth.login(this.email.trim(), this.password);
      } catch (e) {
        const status = (e as { status?: number })?.status ?? 0;
        const isInfra = status === 0 || status === 408 || status >= 500;
        if (!isInfra || attempt >= COLD_START_ATTEMPTS) throw e;
        this.slow.set(true);
        await new Promise(resolve => setTimeout(resolve, 6000));
      }
    }
  }
}
