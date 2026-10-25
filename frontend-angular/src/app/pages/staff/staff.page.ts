import { Component, computed, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CrudPage } from '../../core/crud-page';
import { Staff } from '../../core/models';
import { StaffService } from '../../core/services';

type Role = Staff['role'];

@Component({
  selector: 'app-staff-page',
  imports: [ReactiveFormsModule],
  templateUrl: './staff.page.html',
  styleUrl: './staff.page.css',
})
export class StaffPage extends CrudPage<Staff> {
  protected readonly service = inject(StaffService);
  protected readonly resource = 'staff' as const;
  protected readonly entityLabel = 'trabajador';

  protected readonly roles: { value: Role; label: string; icon: string }[] = [
    { value: 'admin', label: 'Administración', icon: 'admin_panel_settings' },
    { value: 'kitchen', label: 'Cocina', icon: 'skillet' },
    { value: 'floor', label: 'Salón', icon: 'room_service' },
    { value: 'bar', label: 'Bar', icon: 'local_bar' },
    { value: 'runner', label: 'Runner', icon: 'directions_run' },
  ];

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    username: ['', [Validators.required, Validators.pattern(/^[a-z0-9._]{3,40}$/)]],
    role: ['floor' as Role, Validators.required],
    roleTitle: ['', Validators.maxLength(60)],
    status: ['Activo' as Staff['status'], Validators.required],
    station: ['', Validators.maxLength(60)],
  });

  protected readonly byRole = computed(() =>
    this.roles
      .map((r) => ({ ...r, people: this.items().filter((s) => s.role === r.value) }))
      .filter((r) => r.people.length));

  protected roleOf(role: Role) {
    return this.roles.find((r) => r.value === role) ?? this.roles[0];
  }

  protected initials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '··';
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
