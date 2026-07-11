-- Ejecutar en el SQL Editor de Supabase (proyecto zknhnivznhifhhpexipy)
-- ADVERTENCIA: esto borra el bucket "documentos-tutoriales" y TODOS los archivos
-- que tenga dentro (irreversible) antes de recrearlo desde cero, PRIVADO.
--
-- Al no ser público, la app ya no usa getPublicUrl(): genera signed URLs
-- temporales (createSignedUrl/createSignedUrls) bajo demanda, que requieren
-- la política de SELECT de abajo para funcionar.

-- 0. Borra los objetos del bucket (requerido antes de poder borrar el bucket)
delete from storage.objects where bucket_id = 'documentos-tutoriales';

-- 1. Borra el bucket
delete from storage.buckets where id = 'documentos-tutoriales';

-- 2. Borra las políticas asociadas (para que la recreación quede realmente limpia)
drop policy if exists "Lectura publica documentos-tutoriales" on storage.objects;
drop policy if exists "Usuarios autenticados leen documentos-tutoriales" on storage.objects;
drop policy if exists "Usuarios autenticados suben documentos-tutoriales" on storage.objects;

-- 3. Crea el bucket desde cero, PRIVADO
insert into storage.buckets (id, name, public)
values ('documentos-tutoriales', 'documentos-tutoriales', false);

-- 4. Políticas RLS: solo usuarios autenticados pueden leer (necesario para
--    poder generar signed URLs) y subir documentos.
create policy "Usuarios autenticados leen documentos-tutoriales"
on storage.objects for select
to authenticated
using (bucket_id = 'documentos-tutoriales');

create policy "Usuarios autenticados suben documentos-tutoriales"
on storage.objects for insert
to authenticated
with check (bucket_id = 'documentos-tutoriales');
