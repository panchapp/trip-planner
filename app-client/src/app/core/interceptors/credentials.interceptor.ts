import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@app/core/services/auth.service';
import { AuthStore } from '@app/core/stores/auth.store';
import { catchError, switchMap, throwError } from 'rxjs';

/** Marks a request that already went through one refresh retry (prevents infinite loops). */
export const AUTH_RETRY_HEADER = 'X-Auth-Retry';

const shouldSkipRefreshLoop = (url: string): boolean =>
  url.includes('/auth/refresh') || url.includes('/auth/logout') || url.includes('/auth/google');

export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const authStore = inject(AuthStore);
  const router = inject(Router);

  const cloned = req.clone({ withCredentials: true });

  return next(cloned).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) {
        return throwError(() => err);
      }
      if (cloned.headers.has(AUTH_RETRY_HEADER)) {
        return throwError(() => err);
      }
      if (shouldSkipRefreshLoop(cloned.url)) {
        return throwError(() => err);
      }

      return authService.refresh().pipe(
        switchMap(() =>
          next(
            cloned.clone({
              setHeaders: { [AUTH_RETRY_HEADER]: '1' },
              withCredentials: true,
            }),
          ),
        ),
        catchError(() => {
          authStore.setUser(null);
          if (!cloned.url.includes('/auth/me')) {
            void router.navigateByUrl('/login');
          }
          return throwError(() => err);
        }),
      );
    }),
  );
};
