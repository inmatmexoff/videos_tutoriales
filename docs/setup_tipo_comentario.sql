-- Ejecutar en el SQL Editor de Supabase (proyecto zknhnivznhifhhpexipy)

-- Nueva columna para distinguir comentarios normales, dudas y propuestas
-- de mejora. Los comentarios existentes quedan como 'comentario' por defecto.
alter table public.comentarios_tutoriales
  add column if not exists tipo text not null default 'comentario';

-- Restringe los valores permitidos. Si ya habias corrido una version
-- anterior de este script (sin 'mejora'), esto reemplaza el constraint viejo.
alter table public.comentarios_tutoriales
  drop constraint if exists comentarios_tutoriales_tipo_check;

alter table public.comentarios_tutoriales
  add constraint comentarios_tutoriales_tipo_check
  check (tipo in ('comentario', 'duda', 'mejora'));

-- Estado resuelto/pendiente para las dudas (solo tiene sentido cuando
-- tipo = 'duda', pero no molesta en filas de tipo 'comentario').
-- Por ahora, solo el autor de la duda puede marcarla como resuelta desde la
-- app (no hay roles de admin todavia); si mas adelante se define un sistema
-- de roles, se puede sumar ese permiso sin tocar esta columna.
alter table public.comentarios_tutoriales
  add column if not exists resuelto boolean not null default false;
