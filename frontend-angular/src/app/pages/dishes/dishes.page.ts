import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CrudPage } from '../../core/crud-page';
import { Category, Dish } from '../../core/models';
import { CategoryService, DishService } from '../../core/services';

@Component({
  selector: 'app-dishes-page',
  imports: [ReactiveFormsModule, CurrencyPipe],
  templateUrl: './dishes.page.html',
})
export class DishesPage extends CrudPage<Dish> implements OnInit {
  protected readonly service = inject(DishService);
  private readonly categoryService = inject(CategoryService);
  protected readonly entityLabel = 'plato';

  protected readonly categories = signal<Category[]>([]);
  protected readonly filterCategoryId = signal<number | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', Validators.maxLength(500)],
    price: [0, [Validators.required, Validators.min(0)]],
    categoryId: [0, [Validators.required, Validators.min(1)]],
    image: ['', Validators.maxLength(300)],
    prepTime: ['', Validators.maxLength(30)],
    dietary: ['', Validators.maxLength(60)],
    active: [true],
  });

  override ngOnInit(): void {
    super.ngOnInit();
    this.categoryService.list().subscribe((c) => this.categories.set(c));
  }

  protected filterBy(value: string): void {
    this.filterCategoryId.set(value ? Number(value) : null);
    this.load();
  }

  protected override listParams() {
    const id = this.filterCategoryId();
    return id === null ? undefined : { categoryId: id };
  }

  protected defaults() {
    return {
      name: '', description: '', price: 0, image: '', prepTime: '', dietary: '', active: true,
      categoryId: this.filterCategoryId() ?? this.categories()[0]?.id ?? 0,
    };
  }

  protected toFormValue(d: Dish) {
    return {
      name: d.name, description: d.description ?? '', price: d.price, categoryId: d.category.id,
      image: d.image ?? '', prepTime: d.prepTime ?? '', dietary: d.dietary ?? '', active: d.active,
    };
  }

  protected toEntity(v: typeof this.form.value): Dish {
    return {
      name: v.name!.trim(),
      description: v.description?.trim() || null,
      price: Number(v.price),
      category: { id: Number(v.categoryId) },
      image: v.image?.trim() || null,
      prepTime: v.prepTime?.trim() || null,
      dietary: v.dietary?.trim() || null,
      active: !!v.active,
    };
  }

  protected describe(d: Dish) {
    return d.name;
  }
}
