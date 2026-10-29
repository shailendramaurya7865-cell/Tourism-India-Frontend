
import {ApplicationConfig,inject,provideAppInitializer} from '@angular/core';

import {provideHttpClient,withInterceptors} from '@angular/common/http';

import { provideRouter } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { routes } from './app.routes';
import { csrfInterceptor } from './csrf.interceptor';
import { CsrfService } from './csrf.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([csrfInterceptor])
    ),
    provideRouter(routes),
    provideAppInitializer(() => {
      const csrfService = inject(CsrfService);
      return firstValueFrom(
        csrfService.initialize().pipe(
          catchError(error => {
            // Allow the UI to start if the backend is unavailable.
            // Unsafe API requests will still fail closed in the interceptor.
            console.error('CSRF initialization failed:',error);
            return of(undefined);
          })
        )
      );
    })
  ]
};
