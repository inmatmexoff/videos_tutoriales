"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  GraduationCap,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  RotateCcw,
  Clock9
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabasePROD } from "@/lib/supabase";
import { AdminGuard } from "@/components/admin-guard";
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const CALIFICACION_APROBATORIA = 8;

interface Opcion {
  texto: string;
  es_correcta: boolean;
}

interface Pregunta {
  id: number;
  pregunta: string;
  opciones: Opcion[];
  orden: number;
}

interface Intento {
  id: number;
  calificacion: number;
  aprobado: boolean;
  fecha_intento: string;
}

export default function ExamenPage() {
  return (
    <AdminGuard>
      <ExamenContent />
    </AdminGuard>
  );
}

function ExamenContent() {
  const router = useRouter();
  const { moduloId } = useParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [moduloNombre, setModuloNombre] = useState("");
  const [examen, setExamen] = useState<{ id: number; titulo: string; descripcion: string } | null>(null);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [respuestas, setRespuestas] = useState<Record<number, number>>({});
  const [intentos, setIntentos] = useState<Intento[]>([]);
  const [pendingVideos, setPendingVideos] = useState<string[]>([]);
  const [resultado, setResultado] = useState<{ calificacion: number; aprobado: boolean } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const { data: { user } } = await supabasePROD.auth.getUser();
        if (!user) throw new Error("Usuario no autenticado");

        const { data: modulo, error: moduloError } = await supabasePROD
          .from('modulos_tutoriales')
          .select('nombre')
          .eq('id', moduloId)
          .single();
        if (moduloError) throw moduloError;
        setModuloNombre(modulo?.nombre || "");

        const { data: examenData, error: examenError } = await supabasePROD
          .from('examenes_modulo')
          .select('id, titulo, descripcion')
          .eq('modulo_id', moduloId)
          .eq('activo', true)
          .maybeSingle();
        if (examenError) throw examenError;

        if (!examenData) {
          setExamen(null);
          setLoading(false);
          return;
        }
        setExamen(examenData);

        const { data: preguntasData, error: preguntasError } = await supabasePROD
          .from('examen_preguntas')
          .select('id, pregunta, opciones, orden')
          .eq('examen_id', examenData.id)
          .eq('activo', true)
          .order('orden', { ascending: true });
        if (preguntasError) throw preguntasError;
        setPreguntas(preguntasData || []);

        const { data: intentosData, error: intentosError } = await supabasePROD
          .from('examen_intentos')
          .select('id, calificacion, aprobado, fecha_intento')
          .eq('examen_id', examenData.id)
          .eq('usuario_id', user.id)
          .order('fecha_intento', { ascending: false });
        if (intentosError) throw intentosError;
        const intentosNormalizados: Intento[] = (intentosData || []).map(i => ({ ...i, calificacion: Number(i.calificacion) }));
        setIntentos(intentosNormalizados);

        const lastAttempt = intentosNormalizados[0] || null;

        if (lastAttempt && !lastAttempt.aprobado) {
          const { data: tutorialesModulo, error: tutorialesError } = await supabasePROD
            .from('tutoriales')
            .select('id, titulo')
            .eq('modulo_id', moduloId)
            .eq('activo', true)
            .eq('es_espacio', false);
          if (tutorialesError) throw tutorialesError;

          const tutorialIds = (tutorialesModulo || []).map(t => t.id);
          let visualizaciones: { tutorial_id: number; fecha_visualizacion: string | null }[] = [];
          if (tutorialIds.length > 0) {
            const { data: visData, error: visError } = await supabasePROD
              .from('visualizaciones_tutoriales')
              .select('tutorial_id, fecha_visualizacion')
              .eq('usuario_id', user.id)
              .in('tutorial_id', tutorialIds);
            if (visError) throw visError;
            visualizaciones = visData || [];
          }

          const pending = (tutorialesModulo || []).filter(t => {
            const vista = visualizaciones.find(v => v.tutorial_id === t.id);
            // `fecha_visualizacion` en null = hay progreso guardado pero el
            // usuario nunca terminó el video, así que sigue contando como
            // pendiente. Antes la fila solo existía al terminarlo y no podía
            // ser null; ahora se crea en cuanto le da play.
            if (!vista || !vista.fecha_visualizacion) return true;
            return new Date(vista.fecha_visualizacion) <= new Date(lastAttempt.fecha_intento);
          });
          setPendingVideos(pending.map(t => t.titulo));
        }
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [moduloId, toast]);

  const handleSelectRespuesta = (preguntaId: number, opcionIndex: number) => {
    setRespuestas(prev => ({ ...prev, [preguntaId]: opcionIndex }));
  };

  const handleSubmit = async () => {
    if (!examen) return;
    if (Object.keys(respuestas).length < preguntas.length) {
      toast({ variant: "destructive", title: "Responde todas las preguntas antes de enviar." });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabasePROD.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      let correctas = 0;
      const respuestasGuardadas = preguntas.map(p => {
        const opcionIndex = respuestas[p.id];
        const opcion = p.opciones[opcionIndex];
        if (opcion?.es_correcta) correctas++;
        return { pregunta_id: p.id, opcion_elegida: opcion?.texto || "" };
      });

      const calificacion = Math.round((correctas / preguntas.length) * 10 * 100) / 100;
      const aprobado = calificacion >= CALIFICACION_APROBATORIA;

      const { error } = await supabasePROD
        .from('examen_intentos')
        .insert([{
          examen_id: examen.id,
          usuario_id: user.id,
          usuario_nombre: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
          calificacion,
          aprobado,
          respuestas: respuestasGuardadas,
        }]);
      if (error) throw error;

      setResultado({ calificacion, aprobado });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin w-10 h-10 text-primary" />
      </div>
    );
  }

  const lastAttempt = intentos[0] || null;
  const bloqueadoPorReprobado = !!lastAttempt && !lastAttempt.aprobado && pendingVideos.length > 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => router.push('/')} className="rounded-full">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al listado
        </Button>

        {!examen ? (
          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
            <CardContent className="py-16 text-center space-y-3">
              <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground">Este módulo ({moduloNombre}) todavía no tiene un examen disponible.</p>
            </CardContent>
          </Card>
        ) : resultado ? (
          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
            <CardContent className="py-12 text-center space-y-4">
              {resultado.aprobado ? (
                <CheckCircle2 className="w-16 h-16 mx-auto text-green-600" />
              ) : (
                <XCircle className="w-16 h-16 mx-auto text-destructive" />
              )}
              <h2 className="text-2xl font-bold">{resultado.aprobado ? "¡Aprobado!" : "Reprobado"}</h2>
              <p className="text-4xl font-black">{resultado.calificacion.toFixed(1)}</p>
              {!resultado.aprobado && (
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Necesitas volver a ver todos los videos de este módulo antes de poder reintentar el examen.
                </p>
              )}
              <Button onClick={() => router.push('/')} className="rounded-xl mt-4">
                Volver al listado
              </Button>
            </CardContent>
          </Card>
        ) : bloqueadoPorReprobado ? (
          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="w-5 h-5" /> Examen bloqueado
              </CardTitle>
              <CardDescription>
                Tu último intento fue reprobado ({lastAttempt!.calificacion.toFixed(1)}). Antes de reintentar, vuelve a ver estos videos del módulo:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingVideos.map((titulo, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border text-sm">
                  <Clock9 className="w-4 h-4 text-orange-600 shrink-0" />
                  {titulo}
                </div>
              ))}
              <Button variant="outline" className="w-full rounded-xl mt-2" onClick={() => router.push('/')}>
                Ir a ver los videos
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <GraduationCap className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{examen.titulo}</CardTitle>
                </div>
                {examen.descripcion && <CardDescription>{examen.descripcion}</CardDescription>}
              </CardHeader>
              {lastAttempt && (
                <CardContent>
                  <Badge variant="secondary" className="rounded-full">
                    Último intento: {lastAttempt.calificacion.toFixed(1)} · {lastAttempt.aprobado ? "Aprobado" : "Reprobado"} ·{" "}
                    {formatDistanceToNow(new Date(lastAttempt.fecha_intento), { addSuffix: true, locale: es })}
                  </Badge>
                </CardContent>
              )}
            </Card>

            {preguntas.map((p, index) => (
              <Card key={p.id} className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">{index + 1}. {p.pregunta}</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={respuestas[p.id]?.toString() ?? ""}
                    onValueChange={(v) => handleSelectRespuesta(p.id, parseInt(v))}
                  >
                    {p.opciones.map((op, i) => (
                      <div key={i} className="flex items-center gap-2 py-1.5">
                        <RadioGroupItem value={i.toString()} id={`p${p.id}-op${i}`} />
                        <Label htmlFor={`p${p.id}-op${i}`} className="font-normal cursor-pointer">{op.texto}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            ))}

            <Button
              size="lg"
              disabled={submitting || preguntas.length === 0}
              className="w-full rounded-xl"
              onClick={handleSubmit}
            >
              {submitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar Examen
            </Button>

            {intentos.length > 0 && (
              <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" /> Historial de intentos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {intentos.map(i => (
                    <div key={i.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-xl bg-muted/50 border">
                      <span>{formatDistanceToNow(new Date(i.fecha_intento), { addSuffix: true, locale: es })}</span>
                      <Badge variant="secondary" className={i.aprobado ? "bg-green-600/10 text-green-700" : "bg-destructive/10 text-destructive"}>
                        {i.calificacion.toFixed(1)} · {i.aprobado ? "Aprobado" : "Reprobado"}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
