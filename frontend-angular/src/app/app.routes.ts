import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'categorias' },
  {
    path: 'categorias',
    title: 'Categorías · Carta Digital',
    loadComponent: () => import('./pages/categories/categories.page').then((m) => m.CategoriesPage),
  },
  {
    path: 'platos',
    title: 'Platos · Carta Digital',
    loadComponent: () => import('./pages/dishes/dishes.page').then((m) => m.DishesPage),
  },
  {
    path: 'mesas',
    title: 'Mesas · Carta Digital',
    loadComponent: () => import('./pages/tables/tables.page').then((m) => m.TablesPage),
  },
  {
    path: 'personal',
    title: 'Personal · Carta Digital',
    loadComponent: () => import('./pages/staff/staff.page').then((m) => m.StaffPage),
  },
  { path: '**', redirectTo: 'categorias' },
];
