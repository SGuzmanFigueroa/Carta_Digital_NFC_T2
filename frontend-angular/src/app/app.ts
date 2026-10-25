import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PanelStore, Resource } from './core/panel-store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly store = inject(PanelStore);

  protected readonly links: { path: string; label: string; icon: string; resource: Resource }[] = [
    { path: '/categorias', label: 'Categorías', icon: 'category', resource: 'categories' },
    { path: '/platos', label: 'Platos', icon: 'restaurant_menu', resource: 'dishes' },
    { path: '/mesas', label: 'Mesas', icon: 'table_restaurant', resource: 'tables' },
    { path: '/personal', label: 'Personal', icon: 'badge', resource: 'staff' },
  ];

  ngOnInit(): void {
    this.store.refreshAll();
  }
}
