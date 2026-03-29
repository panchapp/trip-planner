import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  type ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from '@app/app.routes';
import { AuthService } from '@app/core/services/auth.service';
import { AuthStore } from '@app/core/stores/auth.store';
import { credentialsInterceptor } from '@core/interceptors/credentials.interceptor';
import { provideLucideConfig } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';

export const appConfig: ApplicationConfig = {
  providers: [
    provideLucideConfig({ strokeWidth: 1.5 }),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([credentialsInterceptor])),
    provideAppInitializer(async () => {
      const authService = inject(AuthService);
      const authStore = inject(AuthStore);
      const user = await firstValueFrom(authService.me()).catch(() => null);
      authStore.setUser(user);
    }),
  ],
};
