"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpDown,
  Loader2,
  GripVertical,
  FolderOpen,
  Layers,
  Tag,
  Clock,
  Monitor,
  Settings,
  AlertCircle,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabasePROD } from "@/lib/supabase";
import { AdminGuard } from "@/components/admin-guard";
import { cn } from "@/lib/utils";

interface Tutorial {
  id: number;
  titulo: string;
  miniatura_url: string;
  url_video: string;
  es_espacio: boolean;
  duracion_segundos: number;
  tipo_contenido: 'operacion' | 'software';
  orden: number;
  etiqueta: { nombre: string } | null;
  modulo: {
    nombre: string;
    categoria: { nombre: string };
  };
}

const NO_SUBCATEGORY = "__sin_subcategoria__";

export default function OrdenTutorialesPage() {
  return (
    <AdminGuard>
      <OrdenContent />
    </AdminGuard>
  );
}

function SortableRow({
  id,
  children,
}: {
  id: number;
  children: (dragHandle: { listeners: any; attributes: any }) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({ listeners, attributes })}
    </div>
  );
}

function OrdenContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTutorials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabasePROD
        .from('tutoriales')
        .select(`
          id, titulo, miniatura_url, url_video, es_espacio, duracion_segundos, tipo_contenido, orden,
          etiqueta:etiquetas (nombre),
          modulo:modulos_tutoriales (
            nombre,
            categoria:categorias_tutoriales (nombre)
          )
        `)
        .eq('activo', true)
        .order('orden', { ascending: true })
        .order('fecha_creacion', { ascending: true });

      if (error) throw error;
      setTutorials((data as any) || []);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTutorials();
  }, []);

  // Árbol Categoría -> Módulo -> Etiqueta, para que el orden nunca mezcle
  // videos de módulos distintos (a diferencia del listado principal, que agrupa
  // de forma más flexible para navegar).
  const tree = useMemo(() => {
    const result: Record<string, Record<string, Record<string, Tutorial[]>>> = {};
    tutorials.forEach(t => {
      const catName = t.modulo?.categoria?.nombre || "General";
      const modName = t.modulo?.nombre || "General";
      const subName = t.etiqueta?.nombre || NO_SUBCATEGORY;

      if (!result[catName]) result[catName] = {};
      if (!result[catName][modName]) result[catName][modName] = {};
      if (!result[catName][modName][subName]) result[catName][modName][subName] = [];
      result[catName][modName][subName].push(t);
    });
    Object.values(result).forEach(mods =>
      Object.values(mods).forEach(subs =>
        Object.values(subs).forEach(list => list.sort((a, b) => a.orden - b.orden))
      )
    );
    return result;
  }, [tutorials]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = async (event: DragEndEvent, scopedTutorials: Tutorial[]) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = scopedTutorials.findIndex(t => t.id === active.id);
    const newIndex = scopedTutorials.findIndex(t => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(scopedTutorials, oldIndex, newIndex);
    const updates = reordered.map((t, idx) => ({ id: t.id, orden: idx }));

    setTutorials(prev => prev.map(t => {
      const match = updates.find(u => u.id === t.id);
      return match ? { ...t, orden: match.orden } : t;
    }));

    try {
      const results = await Promise.all(
        updates.map(u => supabasePROD.from('tutoriales').update({ orden: u.orden }).eq('id', u.id))
      );
      const failed = results.find(r => r.error);
      if (failed?.error) throw failed.error;
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al reordenar", description: error.message });
      fetchTutorials();
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderRow = (tutorial: Tutorial, dragHandle: { listeners: any; attributes: any }) => (
    <div className="flex items-center gap-3 p-3 border rounded-xl bg-background/50 hover:border-primary/50 transition-all">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full cursor-grab active:cursor-grabbing text-muted-foreground shrink-0 touch-none"
        {...dragHandle.attributes}
        {...dragHandle.listeners}
      >
        <GripVertical className="h-4 w-4" />
      </Button>
      <div className="relative w-20 aspect-video rounded-lg overflow-hidden bg-muted shrink-0">
        {!tutorial.es_espacio && tutorial.url_video ? (
          <img
            src={tutorial.miniatura_url || "https://picsum.photos/seed/placeholder/600/400"}
            alt=""
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
            <AlertCircle className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate">{tutorial.titulo}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <Badge
            variant="outline"
            className={cn(
              "text-[9px] px-1.5 py-0 h-4 gap-1 border-none",
              tutorial.tipo_contenido === 'software' ? "bg-primary/10 text-primary" : "bg-accent/50 text-accent-foreground"
            )}
          >
            {tutorial.tipo_contenido === 'software' ? <Monitor className="w-2.5 h-2.5" /> : <Settings className="w-2.5 h-2.5" />}
            {tutorial.tipo_contenido === 'software' ? 'Software' : 'Operación'}
          </Badge>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {!tutorial.es_espacio ? formatDuration(tutorial.duracion_segundos) : "Pendiente"}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => router.push('/admin')} className="rounded-full">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Gestión de Estructura
        </Button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ArrowUpDown className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Orden de Videos</h1>
            <p className="text-sm text-muted-foreground">Arrastra los videos dentro de cada sección para cambiar el orden en que se muestran a los usuarios.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
        ) : Object.keys(tree).length === 0 ? (
          <p className="text-center py-20 text-muted-foreground">No hay videos registrados todavía.</p>
        ) : (
          <div className="space-y-12">
            {Object.entries(tree).map(([catName, modules]) => (
              <div key={catName}>
                <div className="flex items-center gap-3 mb-4">
                  <FolderOpen className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold uppercase tracking-tight">{catName}</h2>
                  <Separator className="flex-1" />
                </div>
                <div className="space-y-8 pl-4 border-l-2 border-primary/10 ml-2">
                  {Object.entries(modules).map(([modName, subs]) => (
                    <div key={modName}>
                      <div className="flex items-center gap-2 mb-3">
                        <Layers className="w-4 h-4 text-muted-foreground" />
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{modName}</h3>
                      </div>
                      <div className="space-y-6 pl-4 border-l border-border ml-1.5">
                        {Object.entries(subs).map(([subName, list]) => (
                          <div key={subName}>
                            {subName !== NO_SUBCATEGORY && (
                              <div className="flex items-center gap-2 mb-2">
                                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{subName}</h4>
                              </div>
                            )}
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={(e) => handleDragEnd(e, list)}
                            >
                              <SortableContext items={list.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                <div className="space-y-2">
                                  {list.map(tutorial => (
                                    <SortableRow key={tutorial.id} id={tutorial.id}>
                                      {(dragHandle) => renderRow(tutorial, dragHandle)}
                                    </SortableRow>
                                  ))}
                                </div>
                              </SortableContext>
                            </DndContext>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
