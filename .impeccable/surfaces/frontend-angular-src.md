---
version: 1
slug: "frontend-angular-src"
primary_target: "frontend-angular/src"
related_targets: []
---

# Panel de tablas maestras (Angular)

Scope: `frontend-angular/src` — las 4 pantallas CRUD y el shell. Mode: Operate.
Audiencia: administrador del restaurante; hoy, demo proyectada en la exposición T2. Tarea: crear, editar, eliminar y revisar categorías, platos, mesas y personal contra la API Spring Boot + MySQL.
Restricciones: misma familia visual que la carta del comensal GastroPulse; legible en proyector; sin claims inventados.

## Direction contract

THESIS: Cada registro se edita dentro de la forma que tiene en el restaurante: el plato en su ficha de carta, la mesa en su plano por zonas, el trabajador en su credencial. Rechaza el panel genérico de sidebar oscuro + tabla blanca + modal.

OWN-WORLD: Obsidiana #0b0c0e con superficies #15161c/#1c1d24, bordes #2a2b35; dorado #eab308 con tinta #422006 solo para selección, precio y acción primaria; esmeralda #10b981 para disponible/activo; rojo #ef4444 como sello. Geist para texto, Space Mono en mayúsculas para etiquetas y cifras. Píldoras con contador idénticas a la carta.

STORY: El visitante ve las cuatro tablas como píldoras, elige una, toca un registro y lo ve como el comensal lo verá; cambia precio o estado y guarda; entiende que todo viene de MySQL.

FIRST VIEWPORT: Cabecera con marca G y estado "MySQL · API 8080". Riel de píldoras con contadores. Debajo, dos columnas: lista densa a la izquierda (≈40%) y ficha grande a la derecha (≈60%) con kicker mono, nombre a 40px, precio dorado en mono y campos editables; acción primaria "Guardar" abajo a la derecha de la ficha.

FORM: Píldoras + ficha de carta, posición 4 de 7 en la lista ordenada. Señal: la ficha es a la vez vista previa y editor. Raise (vernacular-ephemera-jet-age-ticket-wallet): nada desaparece, lo inactivo se sella AGOTADO/INACTIVO en rojo. seed: none (unavailable)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
