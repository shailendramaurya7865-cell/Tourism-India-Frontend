
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../src/environments/environments';

interface CsrfResponse {
    token: string;
}

@Injectable({
    providedIn: 'root'
})
export class CsrfService {
    private readonly http = inject(HttpClient);

    private readonly csrfUrl =
        `${environment.apiUrl.replace(/\/+$/, '')}/auth/csrf`;

    private initialization$?: Observable<void>;

    initialize(): Observable<void> {
        if (!this.initialization$) {
            this.initialization$ = this.http
                .get<CsrfResponse>(this.csrfUrl, {
                    withCredentials: true
                })
                .pipe(
                    map(() => undefined),

                    catchError(error => {
                        this.initialization$ = undefined;
                        return throwError(() => error);
                    }),

                    shareReplay({
                        bufferSize: 1,
                        refCount: false
                    })
                );
        }

        return this.initialization$;
    }

    refresh(): Observable<void> {
        this.initialization$ = undefined;
        return this.initialize();
    }
}
