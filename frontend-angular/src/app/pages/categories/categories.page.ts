import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CrudPage } from '../../core/crud-page';
import { Category, Dish } from '../../core/models';
import { CategoryService, DishService } from '../../core/services';

@Component({
  selector: 'app-categories-page',
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './categories.page.html',
  styleUrl: './categories.page.css',
})
export class CategoriesPage extends CrudPage<Category> implements OnInit {
  protected readonly service = inject(CategoryService);
  private readonly dishService = inject(DishService);
  protected readonly resource = 'categories' as const;
  protected readonly entityLabel = 'categoría';

  /** Todos los platos, para mostrar qué contiene cada categoría. */
  protected readonly dishes = signal<Dish[]>([]);

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    sortOrder: [0, [Validators.required, Validators.min(0)]],
    active: [true],
  });

  protected readonly selectedDishes = computed(() => {
    const id = this.selectedId();
    return typeof id === 'number' ? this.dishes().filter((d) => d.category.id === id) : [];
  });

  override ngOnInit(): void {
    super.ngOnInit();
    this.dishService.list().subscribe((d) => this.dishes.set(d));
  }

  protected dishCount(categoryId: number | undefined): number {
    return this.dishes().filter((d) => d.category.id === categoryId).length;
  }

  protected defaults() {
    return { name: '', sortOrder: this.items().length + 1, active: true };
  }

  protected toFormValue(c: Category) {
    return { name: c.name, sortOrder: c.sortOrder, active: c.active };
  }

  protected toEntity(v: typeof this.form.value): Category {
    return { name: v.name!.trim(), sortOrder: Number(v.sortOrder), active: !!v.active };
  }

  protected describe(c: Category) {
    return c.name;
  }
}
