import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'admin', pathMatch: 'full' },
  {
    path: 'admin/login',
    title: 'Sign In · Blind Whisky Tasting',
    loadComponent: () =>
      import('./pages/admin-login/admin-login').then((m) => m.AdminLogin),
  },
  {
    path: 'admin',
    title: 'Host · Blind Whisky Tasting',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin-create/admin-create').then((m) => m.AdminCreate),
  },
  {
    path: 'admin/results/:id',
    title: 'Results · Blind Whisky Tasting',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin-results/admin-results').then((m) => m.AdminResults),
  },
  {
    path: 'tasting/:id/join',
    title: 'Join · Blind Whisky Tasting',
    loadComponent: () => import('./pages/join/join').then((m) => m.Join),
  },
  {
    path: 'tasting/:id/guess',
    title: 'Guess · Blind Whisky Tasting',
    loadComponent: () => import('./pages/guess/guess').then((m) => m.Guess),
  },
  { path: '**', redirectTo: 'admin' },
];
