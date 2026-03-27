import { HttpBackend, HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EnvironmentService } from '@env/environment.service';
import { User } from '@shared/models/user.model';
import { Observable } from 'rxjs';

/**
 * HttpClient without interceptors — used for refresh/logout to avoid circular dependency
 * with the auth retry interceptor.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly httpBackend = inject(HttpBackend);
  private readonly httpWithoutInterceptors = new HttpClient(this.httpBackend);
  private readonly env = inject(EnvironmentService);

  login(): void {
    window.location.href = `${this.env.apiUrl}/auth/google`;
  }

  /** Rotates access + refresh cookies (204 No Content). */
  refresh(): Observable<void> {
    return this.httpWithoutInterceptors.post<void>(
      `${this.env.apiUrl}/auth/refresh`,
      {},
      {
        withCredentials: true,
      },
    );
  }

  /** Clears cookies server-side and revokes refresh row when valid (204 No Content). */
  logout(): Observable<void> {
    return this.httpWithoutInterceptors.post<void>(
      `${this.env.apiUrl}/auth/logout`,
      {},
      {
        withCredentials: true,
      },
    );
  }

  me(): Observable<User> {
    return this.http.get<User>(`${this.env.apiUrl}/auth/me`);
  }
}
