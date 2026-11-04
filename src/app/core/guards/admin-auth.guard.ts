
import { inject } from '@angular/core';

import {
  CanActivateFn,
  Router
} from '@angular/router';

import { map } from 'rxjs/operators';

import { AuthService } from '../../core/services/auth.service';

export const adminAuthGuard: CanActivateFn = (
  route,
  state
) => {

  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.restoreSession().pipe(

    map(user => {

      // No authenticated session.
      if (!user) {

        return router.createUrlTree(
          ['/login'],
          {
            queryParams: {
              admin: 'true',
              returnUrl: state.url
            }
          }
        );
      }

      // Normalize role before checking.
      const role = user.role
        ?.trim()
        .toUpperCase();

      // Authenticated, but not an administrator.
      if (role !== 'ADMIN') {

        return router.createUrlTree(['/']);
      }

      // Authenticated administrator.
      return true;
    })
  );
};
