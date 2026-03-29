import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { guestGuard } from '@core/guards/guest.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('@features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'trips',
    canActivate: [authGuard],
    loadChildren: () => import('@features/trip-workspace/trips.routes').then((m) => m.routes),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'trips',
  },
];
