-- Ejecutar en el SQL Editor de Supabase (proyecto zknhnivznhifhhpexipy)
--
-- Links a los sistemas/plataformas externas que se usan en el video (ej.
-- la plataforma de ML y luego una web propia). Es un arreglo porque un
-- mismo video puede requerir entrar a varios sistemas, no solo uno o dos.
-- Mismo patron que "documentos" y "checklist": jsonb en la tabla tutoriales.

alter table public.tutoriales
  add column if not exists enlaces_sistemas jsonb;

-- Formato esperado: [{ "nombre": "...", "url": "..." }, ...]
