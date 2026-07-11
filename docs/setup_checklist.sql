-- Ejecutar en el SQL Editor de Supabase (proyecto zknhnivznhifhhpexipy)

-- Nueva columna en la tabla tutoriales para guardar el checklist opcional.
-- Es un jsonb con un arreglo simple de strings: ["Paso 1", "Paso 2", ...]
alter table public.tutoriales
  add column if not exists checklist jsonb;

-- Si ya tenias una columna "checklist" de un intento anterior con otro tipo
-- (por ejemplo "text"), el "add column if not exists" de arriba no la toca y
-- se queda con el tipo viejo. Verifica el tipo actual con:
--
-- select data_type from information_schema.columns
-- where table_name = 'tutoriales' and column_name = 'checklist';
--
-- Si no dice "jsonb", corrigela con:
--
-- alter table public.tutoriales
--   alter column checklist type jsonb using checklist::jsonb;
