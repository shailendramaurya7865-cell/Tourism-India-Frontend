
import { HttpInterceptorFn } from '@angular/common/http';
import { throwError } from 'rxjs';
import { environment } from '../environments/environments';

const UNSAFE_METHODS = new Set([
  'POST',
  'PUT',
  'PATCH',
  'DELETE'
]);

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  const apiUrl = environment.apiUrl.replace(/\/+$/, '');

  const isApiRequest =
    req.url === apiUrl ||
    req.url.startsWith(`${apiUrl}/`);

  // Do not modify requests to unrelated services or external URLs.
  if (!isApiRequest) {
    return next(req);
  }

  // Send session cookies with every request to this API.
  const credentialledRequest = req.clone({
    withCredentials: true
  });

  if (!UNSAFE_METHODS.has(req.method.toUpperCase())) {
    return next(credentialledRequest);
  }

  // Spring CookieCsrfTokenRepository uses this cookie name by default.
  const csrfCookie = document.cookie
    .split('; ')
    .find(cookie => cookie.startsWith('XSRF-TOKEN='));

  if (!csrfCookie) {
    return throwError(() =>
      new Error(
        'CSRF token is missing. Initialize or refresh CsrfService before sending this request.'
      )
    );
  }

  const token = decodeURIComponent(
    csrfCookie.substring('XSRF-TOKEN='.length)
  );

  const csrfRequest = credentialledRequest.clone({
    setHeaders: {
      'X-XSRF-TOKEN': token
    }
  });

  return next(csrfRequest);
};
