import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CrudPage } from '../../core/crud-page';
import { Category } from '../../core/models';
import { CategoryService } from '../../core/services';

@Component({
  selector: 'app-categories-page',
  imports: [ReactiveFormsModule],
  templateUrl: './categories.page.html',
})
export class CategoriesPage extends CrudPage<Category> {
  protected readonly service = inject(CategoryService);
  protected readonly entityLabel = 'categoría';

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    sortOrder: [0, [Validators.required, Validators.min(0)]],
    active: [true],
  });

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
