import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CrudPage } from '../../core/crud-page';
import { Staff } from '../../core/models';
import { StaffService } from '../../core/services';

@Component({
  selector: 'app-staff-page',
  imports: [ReactiveFormsModule],
  templateUrl: './staff.page.html',
})
export class StaffPage extends CrudPage<Staff> {
  protected readonly service = inject(StaffService);
  protected readonly entityLabel = 'trabajador';

  protected readonly roles: { value: Staff['role']; label: string }[] = [
    { value: 'admin', label: 'Administrador' },
    { value: 'kitchen', label: 'Cocina' },
    { value: 'floor', label: 'Salón' },
    { value: 'bar', label: 'Bar' },
    { value: 'runner', label: 'Runner' },
  ];

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    username: ['', [Validators.required, Validators.pattern(/^[a-z0-9._]{3,40}$/)]],
    role: ['floor' as Staff['role'], Validators.required],
    roleTitle: ['', Validators.maxLength(60)],
    status: ['Activo' as Staff['status'], Validators.required],
    station: ['', Validators.maxLength(60)],
  });

  protected roleLabel(role: Staff['role']): string {
    return this.roles.find((r) => r.value === role)?.label ?? role;
  }

  protected defaults() {
    return { name: '', username: '', role: 'floor', roleTitle: '', status: 'Activo', station: '' };
  }

  protected toFormValue(s: Staff) {
    return {
      name: s.name, username: s.username, role: s.role,
      roleTitle: s.roleTitle ?? '', status: s.status, station: s.station ?? '',
    };
  }

  protected toEntity(v: typeof this.form.value): Staff {
    return {
      name: v.name!.trim(),
      username: v.username!.trim().toLowerCase(),
      role: v.role!,
      roleTitle: v.roleTitle?.trim() || null,
      status: v.status!,
      station: v.station?.trim() || null,
    };
  }

  protected describe(s: Staff) {
    return s.name;
  }
}
