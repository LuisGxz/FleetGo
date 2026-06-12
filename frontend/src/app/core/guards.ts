import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from './models';

/** Restricts a route to specific roles; other authenticated users land on their own home. */
export function roleGuard(...roles: Role[]): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.accessToken && !(await auth.tryRefresh()))
      return router.createUrlTree(['/login']);

    const role = auth.role();
    return role !== null && roles.includes(role)
      ? true
      : router.createUrlTree([auth.homeFor(role)]);
  };
}

/** Lands `/` on the experience for the stored role (or the login screen). */
export const homeRedirectGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.accessToken && !(await auth.tryRefresh()))
    return router.createUrlTree(['/login']);

  return router.createUrlTree([auth.homeFor(auth.role())]);
};
