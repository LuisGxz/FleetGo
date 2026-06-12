import { Routes } from '@angular/router';
import { homeRedirectGuard, roleGuard } from './core/guards';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage),
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about/about.page').then(m => m.AboutPage),
  },
  {
    path: 'driver',
    canActivate: [roleGuard('Courier')],
    loadComponent: () => import('./pages/driver/route.page').then(m => m.RoutePage),
  },
  {
    path: 'driver/delivery/:id',
    canActivate: [roleGuard('Courier')],
    loadComponent: () => import('./pages/driver/delivery.page').then(m => m.DeliveryPage),
  },
  {
    path: 'dispatch',
    canActivate: [roleGuard('Coordinator')],
    loadComponent: () => import('./pages/dispatch/dispatch.page').then(m => m.DispatchPage),
  },
  {
    path: '',
    canActivate: [homeRedirectGuard],
    children: [],
    pathMatch: 'full',
  },
  { path: '**', redirectTo: '' },
];
