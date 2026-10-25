import { Component, computed, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CrudPage } from '../../core/crud-page';
import { RestaurantTable } from '../../core/models';
import { TableService } from '../../core/services';

type Zone = RestaurantTable['zone'];
type Status = RestaurantTable['status'];

@Component({
  selector: 'app-tables-page',
  imports: [ReactiveFormsModule],
  templateUrl: './tables.page.html',
  styleUrl: './tables.page.css',
})
export class TablesPage extends CrudPage<RestaurantTable> {
  protected readonly service = inject(TableService);
  protected readonly resource = 'tables' as const;
  protected readonly entityLabel = 'mesa';

  protected readonly zones: { value: Zone; label: string; icon: string }[] = [
    { value: 'salon', label: 'Salón', icon: 'chair' },
    { value: 'terraza', label: 'Terraza', icon: 'deck' },
    { value: 'barra', label: 'Barra', icon: 'local_bar' },
    { value: 'vip', label: 'VIP', icon: 'star' },
  ];
  protected readonly statuses: { value: Status; label: string; css: string }[] = [
    { value: 'disponible', label: 'Disponible', css: 'ok' },
    { value: 'ocupada', label: 'Ocupada', css: 'busy' },
    { value: 'reservada', label: 'Reservada', css: 'held' },
    { value: 'mantenimiento', label: 'Mantenimiento', css: 'down' },
  ];

  protected readonly form = inject(NonNullableFormBuilder).group({
    number: ['', [Validators.required, Validators.maxLength(10)]],
    capacity: [4, [Validators.required, Validators.min(1), Validators.max(30)]],
    zone: ['salon' as Zone, Validators.required],
    status: ['disponible' as Status, Validators.required],
  });

  /** Mesas agrupadas por zona, en el orden del salón. */
  protected readonly byZone = computed(() =>
    this.zones
      .map((z) => ({ ...z, tables: this.items().filter((t) => t.zone === z.value) }))
      .filter((z) => z.tables.length));

  protected readonly seats = computed(() => Array.from({ length: Math.min(Math.max(+this.draft().capacity || 0, 0), 30) }));

  protected statusOf(value: Status) {
    return this.statuses.find((s) => s.value === value)!;
  }
  protected zoneOf(value: Zone) {
    return this.zones.find((z) => z.value === value)!;
  }

  protected defaults() {
    return { number: '', capacity: 4, zone: 'salon', status: 'disponible' };
  }

  protected toFormValue(t: RestaurantTable) {
    return { number: t.number, capacity: t.capacity, zone: t.zone, status: t.status };
  }

  protected toEntity(v: typeof this.form.value): RestaurantTable {
    return { number: v.number!.trim().toUpperCase(), capacity: Number(v.capacity), zone: v.zone!, status: v.status! };
  }

  protected describe(t: RestaurantTable) {
    return `Mesa ${t.number}`;
  }
}
