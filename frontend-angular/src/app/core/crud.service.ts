import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiError } from './models';

export const API_URL = 'http://localhost:8080/api';

/** Servicio base: las cuatro tablas maestras exponen el mismo CRUD REST. */
export abstract class CrudService<T extends { id?: number }> {
  protected readonly http = inject(HttpClient);
  protected abstract readonly resource: string;

  protected get url(): string {
    return `${API_URL}/${this.resource}`;
  }

  list(params?: Record<string, string | number>): Observable<T[]> {
    return this.http.get<T[]>(this.url, { params: new HttpParams({ fromObject: params ?? {} }) });
  }

  get(id: number): Observable<T> {
    return this.http.get<T>(`${this.url}/${id}`);
  }

  create(item: T): Observable<T> {
    return this.http.post<T>(this.url, item);
  }

  update(id: number, item: T): Observable<T> {
    return this.http.put<T>(`${this.url}/${id}`, item);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}

/** Convierte un error HTTP en el ApiError del backend (o uno genérico si no hay servidor). */
export function toApiError(err: HttpErrorResponse): ApiError {
  if (err.status === 0) {
    return { status: 0, message: 'No se pudo conectar con el backend (¿está corriendo en el puerto 8080?)' };
  }
  return err.error?.message ? err.error : { status: err.status, message: 'Error inesperado del servidor' };
}
