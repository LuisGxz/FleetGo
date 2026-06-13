import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import { API_URL } from './config';
import { AuthResponse, UserDto } from './models';

// A cold App Service often holds the connection open while it loads instead of failing
// fast — without a cap the login spinner would hang forever. Abort an attempt after this
// so the caller's cold-start retry can fire against an increasingly-warm server.
const LOGIN_TIMEOUT_MS = 22_000;

const REFRESH_KEY = 'fleetgo.refreshToken';
const USER_KEY = 'fleetgo.user';

/** No self-service registration: fleet users are provisioned by operations (seed). */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly accessTokenSignal = signal<string | null>(null);
  readonly user = signal<UserDto | null>(this.readStoredUser());
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly role = computed(() => this.user()?.role ?? null);

  get accessToken(): string | null {
    return this.accessTokenSignal();
  }

  async login(email: string, password: string): Promise<UserDto> {
    const auth = await firstValueFrom(
      this.http.post<AuthResponse>(`${API_URL}/auth/login`, { email, password })
        .pipe(timeout(LOGIN_TIMEOUT_MS)));
    this.storeSession(auth);
    return auth.user;
  }

  /** Exchanges the stored refresh token for a new session. Returns false when missing/expired. */
  async tryRefresh(): Promise<boolean> {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return false;

    try {
      const auth = await firstValueFrom(
        this.http.post<AuthResponse>(`${API_URL}/auth/refresh`, { refreshToken }));
      this.storeSession(auth);
      return true;
    } catch {
      this.clearSession();
      return false;
    }
  }

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (refreshToken) {
      try {
        await firstValueFrom(this.http.post(`${API_URL}/auth/logout`, { refreshToken }));
      } catch {
        // best effort — the server treats logout as idempotent
      }
    }
    this.clearSession();
    this.router.navigate(['/login']);
  }

  /** Where this user's experience lives. */
  homeFor(role: UserDto['role'] | null): string {
    return role === 'Coordinator' ? '/dispatch' : '/driver';
  }

  private storeSession(auth: AuthResponse): void {
    this.accessTokenSignal.set(auth.accessToken);
    this.user.set(auth.user);
    localStorage.setItem(REFRESH_KEY, auth.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
  }

  private clearSession(): void {
    this.accessTokenSignal.set(null);
    this.user.set(null);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  }

  private readStoredUser(): UserDto | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as UserDto) : null;
    } catch {
      return null;
    }
  }
}
