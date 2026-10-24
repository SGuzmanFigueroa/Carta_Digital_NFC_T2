export interface Category {
  id?: number;
  name: string;
  sortOrder: number;
  active: boolean;
}

export interface Dish {
  id?: number;
  name: string;
  description: string | null;
  price: number;
  category: { id: number; name?: string };
  image: string | null;
  prepTime: string | null;
  dietary: string | null;
  active: boolean;
}

export interface RestaurantTable {
  id?: number;
  number: string;
  capacity: number;
  zone: 'salon' | 'terraza' | 'barra' | 'vip';
  status: 'disponible' | 'ocupada' | 'reservada' | 'mantenimiento';
}

export interface Staff {
  id?: number;
  name: string;
  username: string;
  role: 'admin' | 'kitchen' | 'floor' | 'bar' | 'runner';
  roleTitle: string | null;
  status: 'Activo' | 'Inactivo';
  station: string | null;
}

/** Formato de error que devuelve el GlobalExceptionHandler del backend. */
export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string>;
}
