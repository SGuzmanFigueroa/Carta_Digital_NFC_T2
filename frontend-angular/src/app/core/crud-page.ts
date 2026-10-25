import { computed, Directive, inject, OnInit, signal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CrudService, toApiError } from './crud.service';
import { PanelStore, Resource } from './panel-store';

/**
 * Lógica compartida por las páginas: una lista a la izquierda y una ficha a la
 * derecha que sirve a la vez de vista previa y de editor del registro elegido.
 */
@Directive()
export abstract class CrudPage<T extends { id?: number }> implements OnInit {
  protected abstract readonly service: CrudService<T>;
  protected abstract readonly form: FormGroup;
  protected abstract readonly resource: Resource;
  /** Texto para mensajes, p. ej. "categoría". */
  protected abstract readonly entityLabel: string;

  protected readonly store = inject(PanelStore);

  protected readonly items = signal<T[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  /** null = sin selección; 'new' = creando; número = id del registro abierto. */
  protected readonly selectedId = signal<number | 'new' | null>(null);
  protected readonly confirmDelete = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly fieldErrors = signal<Record<string, string>>({});
  /** Valor del formulario como señal, para que la ficha se actualice al escribir. */
  protected readonly draft = signal<any>({});

  protected readonly selected = computed(() => {
    const id = this.selectedId();
    return typeof id === 'number' ? this.items().find((i) => i.id === id) ?? null : null;
  });
  protected readonly isNew = computed(() => this.selectedId() === 'new');

  protected abstract defaults(): Record<string, unknown>;
  protected abstract toFormValue(item: T): Record<string, unknown>;
  protected abstract toEntity(value: any): T;
  protected abstract describe(item: T): string;

  ngOnInit(): void {
    this.form.valueChanges.subscribe(() => this.draft.set(this.form.getRawValue()));
    this.load();
  }

  protected load(selectId?: number): void {
    this.loading.set(true);
    this.service.list(this.listParams()).subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
        if (this.listParams() === undefined) this.store.setCount(this.resource, items.length);
        const keep = selectId ?? this.selectedId();
        if (typeof keep === 'number' && items.some((i) => i.id === keep)) this.open(items.find((i) => i.id === keep)!);
        else if (keep !== 'new' && items.length) this.open(items[0]);
        else if (!items.length && keep !== 'new') this.selectedId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(toApiError(err).message);
        if (err.status === 0) this.store.markOffline();
      },
    });
  }

  /** Filtros opcionales para el listado (los sobrescribe la página de platos). */
  protected listParams(): Record<string, string | number> | undefined {
    return undefined;
  }

  protected open(item: T): void {
    this.selectedId.set(item.id ?? null);
    this.form.reset(this.toFormValue(item));
    this.draft.set(this.form.getRawValue());
    this.confirmDelete.set(false);
    this.fieldErrors.set({});
  }

  protected openNew(): void {
    this.selectedId.set('new');
    this.form.reset(this.defaults());
    this.draft.set(this.form.getRawValue());
    this.confirmDelete.set(false);
    this.resetMessages();
  }

  protected discard(): void {
    const item = this.selected();
    if (item) this.open(item);
    else if (this.items().length) this.open(this.items()[0]);
    else this.selectedId.set(null);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const entity = this.toEntity(this.form.getRawValue());
    const id = this.selectedId();
    const request = typeof id === 'number' ? this.service.update(id, entity) : this.service.create(entity);

    this.saving.set(true);
    this.resetMessages();
    request.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.notice.set(`«${this.describe(saved)}» se ${typeof id === 'number' ? 'actualizó' : 'registró'} en MySQL`);
        this.load(saved.id);
      },
      error: (err: HttpErrorResponse) => {
        const apiError = toApiError(err);
        this.saving.set(false);
        this.error.set(apiError.message);
        this.fieldErrors.set(apiError.errors ?? {});
      },
    });
  }

  protected remove(): void {
    const item = this.selected();
    if (!item?.id) return;
    this.resetMessages();
    this.service.delete(item.id).subscribe({
      next: () => {
        this.notice.set(`«${this.describe(item)}» se eliminó`);
        this.selectedId.set(null);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.confirmDelete.set(false);
        this.error.set(toApiError(err).message);
      },
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

  protected dismiss(): void {
    this.resetMessages();
  }

  private resetMessages(): void {
    this.error.set(null);
    this.notice.set(null);
    this.fieldErrors.set({});
  }
}
