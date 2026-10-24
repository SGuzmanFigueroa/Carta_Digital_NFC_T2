import { Injectable } from '@angular/core';
import { CrudService } from './crud.service';
import { Category, Dish, RestaurantTable, Staff } from './models';

@Injectable({ providedIn: 'root' })
export class CategoryService extends CrudService<Category> {
  protected readonly resource = 'categories';
}

@Injectable({ providedIn: 'root' })
export class DishService extends CrudService<Dish> {
  protected readonly resource = 'dishes';
}

@Injectable({ providedIn: 'root' })
export class TableService extends CrudService<RestaurantTable> {
  protected readonly resource = 'tables';
}

@Injectable({ providedIn: 'root' })
export class StaffService extends CrudService<Staff> {
  protected readonly resource = 'staff';
}
