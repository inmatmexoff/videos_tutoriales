// Migración única: recomprime las portadas ya subidas al bucket "videos-tutoriales"
// que pesan mas de lo razonable para una miniatura de tarjeta, y las vuelve a
// subir en la MISMA ruta (upsert), asi no hace falta tocar la base de datos.
//
// Uso:
//   node scripts/recompress-thumbnails.js         -> solo reporta que haria (dry run)
//   node scripts/recompress-thumbnails.js --apply -> aplica los cambios de verdad

require('dotenv').config();
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');

const BUCKET = 'videos-tutoriales';
const SIZE_THRESHOLD_BYTES = 300 * 1024; // no vale la pena tocar archivos ya chicos
const MAX_WIDTH = 1280;
const JPEG_QUALITY = 82;

const APPLY = process.argv.includes('--apply');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_PROD_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PROD_ANON_KEY
);

async function listAllFiles(prefix) {
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) throw error;

  let results = [];
  for (const item of data) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null) {
      results = results.concat(await listAllFiles(fullPath));
    } else {
      results.push({ path: fullPath, size: item.metadata?.size || 0 });
    }
  }
  return results;
}

async function recompressOne(path) {
  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const res = await fetch(publicUrlData.publicUrl);
  if (!res.ok) throw new Error(`No se pudo descargar (${res.status})`);
  const original = Buffer.from(await res.arrayBuffer());

  const compressed = await sharp(original)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();

  if (!APPLY) return { originalSize: original.length, newSize: compressed.length };

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });
  if (error) throw error;

  return { originalSize: original.length, newSize: compressed.length };
}

async function main() {
  console.log(APPLY ? 'Modo APLICAR: se sobrescribirán los archivos.' : 'Modo DRY RUN: no se sube nada, solo se reporta.');

  const all = await listAllFiles('');
  const thumbnails = all.filter(f => f.path.includes('/thumbnails/') && f.size > SIZE_THRESHOLD_BYTES);

  console.log(`Encontradas ${thumbnails.length} portadas por encima de ${(SIZE_THRESHOLD_BYTES / 1024).toFixed(0)}KB.\n`);

  let totalBefore = 0;
  let totalAfter = 0;
  let failed = 0;

  for (const file of thumbnails) {
    try {
      const { originalSize, newSize } = await recompressOne(file.path);
      totalBefore += originalSize;
      totalAfter += newSize;
      console.log(`OK  ${(originalSize / 1024 / 1024).toFixed(2)}MB -> ${(newSize / 1024).toFixed(0)}KB  ${file.path}`);
    } catch (err) {
      failed++;
      console.error(`ERROR en ${file.path}:`, err.message);
    }
  }

  console.log('\n--- Resumen ---');
  console.log(`Procesadas: ${thumbnails.length - failed} / ${thumbnails.length} (fallidas: ${failed})`);
  console.log(`Peso total antes: ${(totalBefore / 1024 / 1024).toFixed(1)}MB`);
  console.log(`Peso total ${APPLY ? 'despues' : 'estimado despues'}: ${(totalAfter / 1024 / 1024).toFixed(1)}MB`);
  if (!APPLY) console.log('\nEsto fue un dry run. Corre con --apply para subir los cambios de verdad.');
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
