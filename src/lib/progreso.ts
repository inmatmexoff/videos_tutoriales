// Progreso de reproducción por (video, usuario), estilo YouTube: hasta qué
// segundo llegó cada usuario y si ya terminó el video.
//
// Vive en `visualizaciones_tutoriales`, la misma tabla que usa el examen para
// saber si el usuario ya vio los videos de un módulo. Ojo con esa convivencia:
// `fecha_visualizacion` significa "la última vez que lo TERMINÓ" y solo debe
// escribirse al completar. El progreso parcial usa `progreso_actualizado_en`.
// (Ver docs/setup_auditoria_y_progreso.sql.)

import { supabasePROD } from "@/lib/supabase";

export interface ProgresoVideo {
  segundos_vistos: number;
  completado: boolean;
}

// Fracción del video a partir de la cual se da por visto. No es 100% porque
// casi nadie se queda hasta el último frame: se van en los créditos o el
// onEnded no dispara si cierran el modal un segundo antes.
export const UMBRAL_COMPLETADO = 0.95;

// Cada cuántos segundos de reproducción se guarda. Guardar en cada tick del
// onTimeUpdate (~4 por segundo) sería un upsert por cada 250ms.
export const INTERVALO_GUARDADO_SEGUNDOS = 5;

// Por debajo de esto no se reanuda: volver a "0:03" es más molesto que útil.
export const MINIMO_PARA_REANUDAR_SEGUNDOS = 10;

export async function fetchProgresoUsuario(
  usuarioId: string,
  tutorialIds: number[]
): Promise<Map<number, ProgresoVideo>> {
  const progreso = new Map<number, ProgresoVideo>();
  if (tutorialIds.length === 0) return progreso;

  const { data, error } = await supabasePROD
    .from('visualizaciones_tutoriales')
    .select('tutorial_id, segundos_vistos, completado')
    .eq('usuario_id', usuarioId)
    .in('tutorial_id', tutorialIds);

  if (error) throw error;

  for (const fila of data || []) {
    progreso.set(fila.tutorial_id, {
      segundos_vistos: fila.segundos_vistos ?? 0,
      completado: fila.completado ?? false,
    });
  }
  return progreso;
}

// Guarda el avance. `completado` solo se manda en true: una vez visto, el video
// no se "desmarca" porque el usuario lo reabra y lo deje a la mitad.
export async function guardarProgreso(
  tutorialId: number,
  usuarioId: string,
  segundos: number,
  completado: boolean
): Promise<void> {
  const fila: Record<string, unknown> = {
    tutorial_id: tutorialId,
    usuario_id: usuarioId,
    segundos_vistos: Math.floor(segundos),
    progreso_actualizado_en: new Date().toISOString(),
  };

  if (completado) {
    fila.completado = true;
    // Solo al completar: el examen compara esta fecha para saber si el usuario
    // volvió a ver el video después de reprobar.
    fila.fecha_visualizacion = new Date().toISOString();
  }

  const { error } = await supabasePROD
    .from('visualizaciones_tutoriales')
    .upsert(fila, { onConflict: 'tutorial_id,usuario_id' });

  if (error) throw error;
}

// Porcentaje 0-100 para la barra de la miniatura.
export function porcentajeVisto(progreso: ProgresoVideo | undefined, duracionSegundos: number): number {
  if (!progreso) return 0;
  if (progreso.completado) return 100;
  if (!duracionSegundos || duracionSegundos <= 0) return 0;
  return Math.min(100, Math.round((progreso.segundos_vistos / duracionSegundos) * 100));
}
