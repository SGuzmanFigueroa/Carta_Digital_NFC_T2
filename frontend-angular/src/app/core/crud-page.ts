import { Directive, OnInit, signal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CrudService, toApiError } from './crud.service';

/**
 * Lógica compartida por las páginas CRUD: listar, crear, editar y eliminar.
 * Cada página solo define su formulario y cómo convertirlo en la entidad.
 */
@Directive()
export abstract class CrudPage<T extends { id?: number }> implements OnInit {
  protected abstract readonly service: CrudService<T>;
  protected abstract readonly form: FormGroup;
  /** Texto para mensajes, p. ej. "categoría". */
  protected abstract readonly entityLabel: string;

  protected readonly items = signal<T[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly showForm = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly fieldErrors = signal<Record<string, string>>({});

  protected abstract defaults(): Record<string, unknown>;
  protected abstract toFormValue(item: T): Record<string, unknown>;
  protected abstract toEntity(value: any): T;
  protected abstract describe(item: T): string;

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.service.list(this.listParams()).subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(toApiError(err).message);
        this.loading.set(false);
      },
    });
  }

  /** Filtros opcionales para el listado (los sobrescribe la página de platos). */
  protected listParams(): Record<string, string | number> | undefined {
    return undefined;
  }

  protected openNew(): void {
    this.editingId.set(null);
    this.form.reset(this.defaults());
    this.resetMessages();
    this.showForm.set(true);
  }

  protected edit(item: T): void {
    this.editingId.set(item.id ?? null);
    this.form.reset(this.toFormValue(item));
    this.resetMessages();
    this.showForm.set(true);
  }

  protected cancel(): void {
    this.showForm.set(false);
    this.fieldErrors.set({});
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const entity = this.toEntity(this.form.getRawValue());
    const id = this.editingId();
    const request = id === null ? this.service.create(entity) : this.service.update(id, entity);

    this.saving.set(true);
    this.resetMessages();
    request.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.showForm.set(false);
        this.notice.set(`"${this.describe(saved)}" se ${id === null ? "registró" : "actualizó"} correctamente`);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        const apiError = toApiError(err);
        this.saving.set(false);
        this.error.set(apiError.message);
        this.fieldErrors.set(apiError.errors ?? {});
      },
    });
  }

  protected remove(item: T): void {
    if (item.id == null || !confirm(`¿Eliminar ${this.entityLabel} "${this.describe(item)}"?`)) return;
    this.resetMessages();
    this.service.delete(item.id).subscribe({
      next: () => {
        this.notice.set(`"${this.describe(item)}" se eliminó correctamente`);
        this.load();
      },
      error: (err: HttpErrorResponse) => this.error.set(toApiError(err).message),
    });
  }

  /** Mensaje para un campo: primero el del backend, luego el de la validación local. */
  protected fieldError(name: string): string | null {
    const server = this.fieldErrors()[name];
    if (server) return server;
    const control = this.form.get(name);
    if (!control || !control.invalid || !control.touched) return null;
    const e = control.errors ?? {};
    if (e['required']) return 'Campo obligatorio';
    if (e['maxlength']) return `Máximo ${e['maxlength'].requiredLength} caracteres`;
    if (e['min']) return `Valor mínimo ${e['min'].min}`;
    if (e['max']) return `Valor máximo ${e['max'].max}`;
    if (e['pattern']) return 'Formato inválido';
    return 'Valor inválido';
  }

  private resetMessages(): void {
    this.error.set(null);
    this.notice.set(null);
    this.fieldErrors.set({});
  }
}
