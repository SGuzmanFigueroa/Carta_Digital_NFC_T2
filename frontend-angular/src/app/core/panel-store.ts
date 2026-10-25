import { Injectable, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CategoryService, DishService, StaffService, TableService } from './services';

export type Resource = 'categories' | 'dishes' | 'tables' | 'staff';
export type ApiStatus = 'checking' | 'online' | 'offline';

/** Estado compartido del panel: contadores de cada tabla y conexión con la API. */
@Injectable({ providedIn: 'root' })
export class PanelStore {
  private readonly categories = inject(CategoryService);
  private readonly dishes = inject(DishService);
  private readonly tables = inject(TableService);
  private readonly staff = inject(StaffService);

  readonly counts = signal<Record<Resource, number | null>>({ categories: null, dishes: null, tables: null, staff: null });
  readonly api = signal<ApiStatus>('checking');

  refreshAll(): void {
    forkJoin({
      categories: this.categories.list(),
      dishes: this.dishes.list(),
      tables: this.tables.list(),
      staff: this.staff.list(),
    }).subscribe({
      next: (r) => {
        this.counts.set({
          categories: r.categories.length,
          dishes: r.dishes.length,
          tables: r.tables.length,
          staff: r.staff.length,
        });
        this.api.set('online');
      },
      error: () => this.api.set('offline'),
    });
  }

  setCount(resource: Resource, count: number): void {
    this.counts.update((c) => ({ ...c, [resource]: count }));
    this.api.set('online');
  }

  markOffline(): void {
    this.api.set('offline');
  }
}
