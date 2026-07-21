import { supabasePROD } from "@/lib/supabase";
import { DOCUMENTOS_BUCKET, DOCUMENT_SIGNED_URL_TTL_SECONDS } from "@/lib/documentos";

// La biblioteca guarda PDFs/docs/cualquier archivo que NO sea video. Reusa el
// bucket privado "documentos-tutoriales" con el prefijo "biblioteca/" (ver
// docs/setup_biblioteca.sql). Cada documento es una fila en biblioteca_documentos,
// a diferencia de tutoriales.documentos (jsonb colgado de un video).

export const BIBLIOTECA_PREFIX = "biblioteca";

// Distingue manuales/PDFs ('documento') de archivos de código descargables
// ('codigo': .zip, .py, .sql, .xlsm con macros...). Ambos viven en la misma
// tabla/bucket; solo cambia el filtro y el ícono en la UI.
export type TipoBiblioteca = 'documento' | 'codigo';

// Extensiones que sugieren "código" al subir (autodetección, editable por el usuario).
// Incluye comprimidos (.zip/.rar), scripts, y archivos de config (.env/.ini/.toml...).
const CODIGO_EXTENSIONS = [
  'zip', 'rar', '7z', 'tar', 'gz', 'py', 'js', 'ts', 'json', 'sql', 'sh', 'bat', 'ps1',
  'html', 'css', 'php', 'java', 'cs', 'rb', 'go', 'xml', 'yml', 'yaml',
  'ipynb', 'xlsm', 'gs', 'vba', 'bas',
  'env', 'ini', 'toml', 'cfg', 'conf', 'properties',
];

export function detectarTipo(nombreArchivo: string): TipoBiblioteca {
  const ext = nombreArchivo.split('.').pop()?.toLowerCase() || '';
  return CODIGO_EXTENSIONS.includes(ext) ? 'codigo' : 'documento';
}

// Detecta archivos que probablemente contengan secretos (llaves, contraseñas,
// tokens). Se usa solo para ADVERTIR al subir: en esta biblioteca cualquier
// usuario autenticado puede descargar cualquier archivo (RLS sin roles).
const SENSIBLE_EXTENSIONS = ['env', 'pem', 'key', 'p12', 'pfx', 'keystore', 'ppk', 'crt'];

export function esArchivoSensible(nombreArchivo: string): boolean {
  const lower = nombreArchivo.toLowerCase();
  const ext = lower.split('.').pop() || '';
  if (SENSIBLE_EXTENSIONS.includes(ext)) return true;
  return /(secret|credential|contrase|password|token|apikey|api[-_]?key)/.test(lower);
}

export interface BibliotecaDoc {
  id: number;
  titulo: string;
  descripcion: string | null;
  path: string;
  nombre_archivo: string;
  mime_type: string | null;
  tamano_bytes: number | null;
  tipo: TipoBiblioteca;
  modulo_id: number | null;
  etiqueta_id: number | null;
  tutorial_id: number | null;
  fecha_creacion: string;
  // Relaciones incrustadas (para mostrar nombres sin queries extra).
  modulo: { nombre: string; categoria: { nombre: string } | null } | null;
  etiqueta: { nombre: string } | null;
}

// Lista los documentos activos, más recientes primero, con su módulo/categoría
// y etiqueta ya resueltos.
export async function fetchBibliotecaDocs(): Promise<BibliotecaDoc[]> {
  const { data, error } = await supabasePROD
    .from('biblioteca_documentos')
    .select(`
      id, titulo, descripcion, path, nombre_archivo, mime_type, tamano_bytes, tipo,
      modulo_id, etiqueta_id, tutorial_id, fecha_creacion,
      modulo:modulos_tutoriales ( nombre, categoria:categorias_tutoriales (nombre) ),
      etiqueta:etiquetas (nombre)
    `)
    .eq('activo', true)
    .order('fecha_creacion', { ascending: false });
  if (error) throw error;
  return (data as any) || [];
}

// URL temporal (firmada) para ver o descargar un documento privado.
// download=true fuerza la descarga (Content-Disposition: attachment); si es
// false el navegador lo muestra inline (necesario para la vista previa).
export async function getBibliotecaSignedUrl(path: string, download = false): Promise<string> {
  const { data, error } = await supabasePROD.storage
    .from(DOCUMENTOS_BUCKET)
    .createSignedUrl(path, DOCUMENT_SIGNED_URL_TTL_SECONDS, download ? { download: true } : undefined);
  if (error) throw error;
  return data.signedUrl;
}

// Sube un archivo al bucket bajo el prefijo de la biblioteca y devuelve su path.
export async function subirArchivoBiblioteca(file: File): Promise<string> {
  const timestamp = Date.now();
  const nombreLimpio = file.name.replace(/\s/g, '_');
  const path = `${BIBLIOTECA_PREFIX}/${timestamp}_${nombreLimpio}`;
  const { error } = await supabasePROD.storage.from(DOCUMENTOS_BUCKET).upload(path, file);
  if (error) throw error;
  return path;
}

export interface NuevoBibliotecaDoc {
  titulo: string;
  descripcion: string | null;
  path: string;
  nombre_archivo: string;
  mime_type: string | null;
  tamano_bytes: number | null;
  tipo: TipoBiblioteca;
  modulo_id: number | null;
  etiqueta_id: number | null;
  creado_por: string;
}

export async function crearBibliotecaDoc(doc: NuevoBibliotecaDoc): Promise<void> {
  const { error } = await supabasePROD.from('biblioteca_documentos').insert([doc]);
  if (error) throw error;
}

// Baja lógica de la fila (activo=false, para conservar el registro) y borrado
// físico del archivo del bucket para no dejarlo huérfano. Requiere la política
// de DELETE de storage que habilita docs/setup_biblioteca.sql.
export async function eliminarBibliotecaDoc(id: number, path: string): Promise<void> {
  const { error } = await supabasePROD
    .from('biblioteca_documentos')
    .update({ activo: false, fecha_actualizacion: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  await supabasePROD.storage.from(DOCUMENTOS_BUCKET).remove([path]);
}
