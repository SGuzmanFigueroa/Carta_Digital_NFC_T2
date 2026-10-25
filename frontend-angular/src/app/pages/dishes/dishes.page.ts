import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CrudPage } from '../../core/crud-page';
import { Category, Dish } from '../../core/models';
import { CategoryService, DishService } from '../../core/services';

@Component({
  selector: 'app-dishes-page',
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './dishes.page.html',
  styleUrl: './dishes.page.css',
})
export class DishesPage extends CrudPage<Dish> implements OnInit {
  protected readonly service = inject(DishService);
  private readonly categoryService = inject(CategoryService);
  protected readonly resource = 'dishes' as const;
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

  /** Nombre de la categoría que la ficha muestra mientras se edita. */
  protected readonly draftCategory = computed(() =>
    this.categories().find((c) => c.id === Number(this.draft().categoryId))?.name ?? 'Sin categoría');

  override ngOnInit(): void {
    super.ngOnInit();
    this.categoryService.list().subscribe((c) => this.categories.set(c));
  }

  protected filterBy(id: number | null): void {
    this.filterCategoryId.set(id);
    this.load();
  }

  protected override listParams() {
    const id = this.filterCategoryId();
    return id === null ? undefined : { categoryId: id };
  }

  protected countIn(categoryId: number): number | null {
    return this.filterCategoryId() === null ? this.items().filter((d) => d.category.id === categoryId).length : null;
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
