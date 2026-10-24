import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly links = [
    { path: '/categorias', label: 'Categorías' },
    { path: '/platos', label: 'Platos' },
    { path: '/mesas', label: 'Mesas' },
    { path: '/personal', label: 'Personal' },
  ];
}
