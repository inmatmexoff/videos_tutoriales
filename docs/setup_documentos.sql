-- Ejecutar en el SQL Editor de Supabase (proyecto zknhnivznhifhhpexipy)
--
-- El bucket "documentos-tutoriales" es PRIVADO (public = false). La app no usa
-- getPublicUrl() para los documentos: genera signed URLs temporales
-- (createSignedUrl/createSignedUrls) bajo demanda, que requieren la política
-- de SELECT de abajo para funcionar.

-- 1. Nueva columna en la tabla tutoriales para guardar los documentos
--    Es un jsonb con un arreglo de objetos: [{ "nombre": "...", "path": "..." }, ...]
--    "path" es la ruta del objeto dentro del bucket (no una URL pública).
alter table public.tutoriales
  add column if not exists documentos jsonb;

-- 2. Nuevo bucket de almacenamiento, privado
insert into storage.buckets (id, name, public)
values ('documentos-tutoriales', 'documentos-tutoriales', false)
on conflict (id) do update set public = false;

-- 3. Políticas RLS: solo usuarios autenticados pueden leer (necesario para
--    poder generar signed URLs) y subir documentos.
create policy "Usuarios autenticados leen documentos-tutoriales"
on storage.objects for select
to authenticated
using (bucket_id = 'documentos-tutoriales');

create policy "Usuarios autenticados suben documentos-tutoriales"
on storage.objects for insert
to authenticated
with check (bucket_id = 'documentos-tutoriales');

-- Si en /edit quieres poder reemplazar/eliminar documentos ya subidos más adelante,
-- estas políticas adicionales lo habilitarían (no son necesarias con el código actual,
-- que solo agrega/quita rutas de la lista sin borrar el archivo del bucket):
-- create policy "Usuarios autenticados actualizan documentos-tutoriales"
-- on storage.objects for update
-- to authenticated
-- with check (bucket_id = 'documentos-tutoriales');
--
-- create policy "Usuarios autenticados eliminan documentos-tutoriales"
-- on storage.objects for delete
-- to authenticated
-- using (bucket_id = 'documentos-tutoriales');
