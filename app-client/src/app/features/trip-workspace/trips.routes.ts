import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('@features/home/home').then((m) => m.Home),
  },
  {
    path: ':id',
    loadComponent: () => import('./trip-workspace').then((m) => m.TripWorkspace),
  },
];
