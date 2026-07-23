import { supabasePROD } from "@/lib/supabase";

// Las "etiquetas" (marketplaces: Mercado Libre, Amazon, Walmart, Fedex...) son
// un catálogo GLOBAL (tabla `etiquetas`), no un tercer nivel de la jerarquía.
// Qué etiquetas se ofrecen en cada módulo se define en la tabla puente
// `modulo_etiquetas`. Así una misma etiqueta puede usarse en varios módulos sin
// duplicarse. Antes eran filas de `subcategorias_tutoriales` (ver docs/migrate_etiquetas.sql).

export interface Etiqueta {
  id: number;
  nombre: string;
}

// Etiquetas activas que aplican a un módulo (para los selectores de /upload y /edit).
export async function fetchEtiquetasDeModulo(moduloId: number | string): Promise<Etiqueta[]> {
  const { data, error } = await supabasePROD
    .from('modulo_etiquetas')
    .select('etiquetas!inner(id, nombre, activo)')
    .eq('modulo_id', moduloId)
    .eq('etiquetas.activo', true);
  if (error) throw error;

  return (data || [])
    .map((row: any) => row.etiquetas as Etiqueta & { activo?: boolean })
    .filter(Boolean)
    .map(({ id, nombre }) => ({ id, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

// Todas las etiquetas del catálogo global (para la pestaña de administración
// y los filtros de la biblioteca).
export async function fetchTodasLasEtiquetas(soloActivas = true): Promise<Etiqueta[]> {
  let query = supabasePROD.from('etiquetas').select('id, nombre').order('nombre', { ascending: true });
  if (soloActivas) query = query.eq('activo', true);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Crea (si no existe) la etiqueta global y la vincula al módulo. Reusa la
// etiqueta existente cuando el nombre ya está en el catálogo (case-insensitive),
// que es justo lo que evita los duplicados que teníamos antes. Idempotente en el
// vínculo módulo↔etiqueta.
export async function vincularEtiquetaAModulo(
  nombre: string,
  moduloId: number,
  creadoPor: string,
  // Nombre ya resuelto de quien la crea. El uuid `creadoPor` no sirve para
  // mostrarlo: la app no puede leer auth.users desde el navegador. Se guarda
  // aparte, igual que en tutoriales y comentarios. Solo se usa si la etiqueta
  // es nueva; si ya existía en el catálogo se conserva su autor original.
  creadoPorNombre?: string | null
): Promise<Etiqueta> {
  const nombreLimpio = nombre.trim();
  if (!nombreLimpio) throw new Error("El nombre de la etiqueta no puede estar vacío.");

  // 1. ¿Ya existe en el catálogo global? (comparación exacta, insensible a mayúsculas)
  const { data: candidatos, error: findErr } = await supabasePROD
    .from('etiquetas')
    .select('id, nombre')
    .ilike('nombre', nombreLimpio);
  if (findErr) throw findErr;

  let etiqueta = (candidatos || []).find(
    e => e.nombre.toLowerCase() === nombreLimpio.toLowerCase()
  );

  // 2. Si no existe, crearla.
  if (!etiqueta) {
    const { data: creada, error: createErr } = await supabasePROD
      .from('etiquetas')
      .insert([{ nombre: nombreLimpio, creado_por: creadoPor, creado_por_nombre: creadoPorNombre ?? null }])
      .select('id, nombre')
      .single();
    if (createErr) throw createErr;
    etiqueta = creada;
  }

  // 3. Vincular al módulo (no falla si ya estaba vinculada).
  const { error: linkErr } = await supabasePROD
    .from('modulo_etiquetas')
    .upsert(
      { modulo_id: moduloId, etiqueta_id: etiqueta.id },
      { onConflict: 'modulo_id,etiqueta_id', ignoreDuplicates: true }
    );
  if (linkErr) throw linkErr;

  return etiqueta;
}
