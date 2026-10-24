import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CrudPage } from '../../core/crud-page';
import { RestaurantTable } from '../../core/models';
import { TableService } from '../../core/services';

@Component({
  selector: 'app-tables-page',
  imports: [ReactiveFormsModule],
  templateUrl: './tables.page.html',
})
export class TablesPage extends CrudPage<RestaurantTable> {
  protected readonly service = inject(TableService);
  protected readonly entityLabel = 'mesa';

  protected readonly zones = ['salon', 'terraza', 'barra', 'vip'] as const;
  protected readonly statuses = ['disponible', 'ocupada', 'reservada', 'mantenimiento'] as const;

  protected readonly form = inject(NonNullableFormBuilder).group({
    number: ['', [Validators.required, Validators.maxLength(10)]],
    capacity: [4, [Validators.required, Validators.min(1), Validators.max(30)]],
    zone: ['salon' as RestaurantTable['zone'], Validators.required],
    status: ['disponible' as RestaurantTable['status'], Validators.required],
  });

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
