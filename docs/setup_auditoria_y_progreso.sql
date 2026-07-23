-- Ejecutar en el SQL Editor de Supabase (proyecto zknhnivznhifhhpexipy)
--
-- Dos funcionalidades en un solo script:
--   A) Auditoría de archivos: quién subió el proceso y quién/cuándo reemplazó
--      el video y la portada.
--   B) Progreso de reproducción estilo YouTube: hasta qué segundo llegó cada
--      usuario en cada video y si ya lo terminó.
--
-- Es seguro correrlo más de una vez (todo usa "if not exists" / "if exists").


-- ============================================================================
-- A) AUDITORÍA DE ARCHIVOS  (tabla: tutoriales)
-- ============================================================================
--
-- Lo que YA existía y se sigue usando:
--   fecha_creacion       -> fecha en que se subió el proceso
--   fecha_actualizacion  -> última edición de CUALQUIER campo (título, etc.)
--   creado_por           -> uuid de quien lo subió
--
-- El problema con `creado_por` es que la app NO puede traducir ese uuid a un
-- nombre: PostgREST no expone el esquema `auth`, así que desde el navegador
-- `auth.users` es inalcanzable y el uuid queda inservible para mostrarlo. Por
-- eso se guarda además el nombre ya resuelto, igual que hace
-- `comentarios_tutoriales.autor_nombre`.

alter table public.tutoriales
  -- Quién subió el proceso (nombre ya resuelto, para poder mostrarlo)
  add column if not exists subido_por_nombre text,

  -- Última edición general (acompaña a la `fecha_actualizacion` que ya existía)
  add column if not exists actualizado_por uuid references auth.users(id),
  add column if not exists actualizado_por_nombre text,

  -- Reemplazo del ARCHIVO DE VIDEO. NULL = nunca se ha reemplazado.
  add column if not exists video_actualizado_en timestamptz,
  add column if not exists video_actualizado_por uuid references auth.users(id),
  add column if not exists video_actualizado_por_nombre text,

  -- Reemplazo de la PORTADA (miniatura). NULL = nunca se ha reemplazado.
  add column if not exists portada_actualizada_en timestamptz,
  add column if not exists portada_actualizada_por uuid references auth.users(id),
  add column if not exists portada_actualizada_por_nombre text;

-- Rellena el nombre de quien subió los procesos que ya existen. Esto sí puede
-- leer `auth.users` porque el SQL Editor corre como superusuario, no como el
-- cliente del navegador.
update public.tutoriales t
set subido_por_nombre = coalesce(
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name',
      u.email
    )
from auth.users u
where t.creado_por = u.id
  and t.subido_por_nombre is null;


-- ============================================================================
-- B) PROGRESO DE REPRODUCCIÓN  (tabla: visualizaciones_tutoriales)
-- ============================================================================
--
-- Se reutiliza la tabla que ya existe (creada en setup_examenes.sql) en vez de
-- crear una nueva: ya tiene la llave compuesta (tutorial_id, usuario_id), que
-- es exactamente la granularidad que necesita el progreso.

alter table public.visualizaciones_tutoriales
  -- Segundo al que llegó el usuario. Es `real` y no `int` porque el
  -- currentTime del <video> es fraccionario.
  add column if not exists segundos_vistos real not null default 0,

  -- Se marca al llegar al ~95% o al disparar onEnded. Se guarda en vez de
  -- calcularlo contra duracion_segundos porque esa duración puede cambiar si
  -- se reemplaza el video, y no queremos "desmarcar" lo ya visto.
  add column if not exists completado boolean not null default false,

  -- Última vez que se guardó progreso (distinto de haberlo TERMINADO).
  add column if not exists progreso_actualizado_en timestamptz not null default now();


-- ----------------------------------------------------------------------------
-- CAMBIO IMPORTANTE sobre `fecha_visualizacion`  (leer antes de correr)
-- ----------------------------------------------------------------------------
--
-- `fecha_visualizacion` significa "la última vez que el usuario TERMINÓ el
-- video", y el examen depende de ese significado: para dejar reintentar tras un
-- intento fallido compara esa fecha contra la fecha del intento, para saber si
-- el usuario volvió a ver los videos.
--
-- Hasta ahora solo se creaba una fila al terminar el video, así que la columna
-- nunca podía mentir. Con el progreso, la fila se crea en cuanto el usuario le
-- da play — y con `default now()` esa fila naciente diría "ya lo terminó",
-- dejándolo saltarse el requisito del examen habiendo visto 3 segundos.
--
-- Por eso la columna pasa a ser NULL-able y sin default: se llena SOLO al
-- completar. NULL = empezado pero nunca terminado.

alter table public.visualizaciones_tutoriales
  alter column fecha_visualizacion drop not null;

alter table public.visualizaciones_tutoriales
  alter column fecha_visualizacion drop default;

-- Las filas que ya existían se crearon al terminar el video, así que se marcan
-- como completadas para no perder ese historial.
update public.visualizaciones_tutoriales
set completado = true
where fecha_visualizacion is not null
  and completado = false;


-- ============================================================================
-- C) AUDITORÍA DE ETIQUETAS  (tabla: etiquetas)
-- ============================================================================
--
-- Misma lógica que los procesos: quién la creó y quién/cuándo la actualizó.
-- La tabla ya traía `creado_por` (uuid) y `fecha_creacion`, pero — igual que en
-- `tutoriales` — el uuid es inservible para mostrar el nombre desde el
-- navegador, así que se guarda el nombre ya resuelto.

alter table public.etiquetas
  add column if not exists creado_por_nombre text,

  add column if not exists fecha_actualizacion timestamptz,
  add column if not exists actualizado_por uuid references auth.users(id),
  add column if not exists actualizado_por_nombre text;

-- Rellena el nombre de quien creó las etiquetas que ya existen.
update public.etiquetas et
set creado_por_nombre = coalesce(
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name',
      u.email
    )
from auth.users u
where et.creado_por = u.id
  and et.creado_por_nombre is null;


-- ============================================================================
-- RLS del progreso
-- ============================================================================
--
-- El progreso se escribe en cada avance del video, no solo al terminarlo, así
-- que la tabla necesita UPDATE además de INSERT/SELECT. Cada usuario solo toca
-- sus propias filas.

alter table public.visualizaciones_tutoriales enable row level security;

drop policy if exists "Usuario lee su propio progreso" on public.visualizaciones_tutoriales;
create policy "Usuario lee su propio progreso"
on public.visualizaciones_tutoriales for select
to authenticated
using (usuario_id = auth.uid());

drop policy if exists "Usuario inserta su propio progreso" on public.visualizaciones_tutoriales;
create policy "Usuario inserta su propio progreso"
on public.visualizaciones_tutoriales for insert
to authenticated
with check (usuario_id = auth.uid());

drop policy if exists "Usuario actualiza su propio progreso" on public.visualizaciones_tutoriales;
create policy "Usuario actualiza su propio progreso"
on public.visualizaciones_tutoriales for update
to authenticated
using (usuario_id = auth.uid())
with check (usuario_id = auth.uid());
