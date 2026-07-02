
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  Video, 
  Layout, 
  FileText, 
  Link as LinkIcon,
  Clock,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabasePROD } from "@/lib/supabase";

interface Categoria {
  id: number;
  nombre: string;
}

interface Modulo {
  id: number;
  nombre: string;
}

export default function UploadTutorialPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // States para combos
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [modules, setModules] = useState<Modulo[]>([]);
  
  // States de carga
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingModules, setLoadingModules] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    categoriaId: "",
    moduloId: "",
    titulo: "",
    descripcion: "",
    urlVideo: "",
    duracion: "",
    miniaturaUrl: ""
  });

  // Cargar categorías iniciales
  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoadingCategories(true);
        const { data, error } = await supabasePROD
          .from('categorias_tutoriales')
          .select('id, nombre')
          .eq('activo', true)
          .order('orden', { ascending: true });

        if (error) throw error;
        setCategories(data || []);
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar las categorías."
        });
      } finally {
        setLoadingCategories(false);
      }
    }
    fetchCategories();
  }, [toast]);

  // Cargar módulos cuando cambia la categoría
  useEffect(() => {
    async function fetchModules() {
      if (!formData.categoriaId) {
        setModules([]);
        return;
      }

      try {
        setLoadingModules(true);
        const { data, error } = await supabasePROD
          .from('modulos_tutoriales')
          .select('id, nombre')
          .eq('categoria_id', formData.categoriaId)
          .eq('activo', true)
          .order('orden', { ascending: true });

        if (error) throw error;
        setModules(data || []);
        // Reset modulo selection if current is not in new list
        setFormData(prev => ({ ...prev, moduloId: "" }));
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los módulos de esta categoría."
        });
      } finally {
        setLoadingModules(false);
      }
    }
    fetchModules();
  }, [formData.categoriaId, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.moduloId || !formData.titulo || !formData.urlVideo) {
      toast({
        variant: "destructive",
        title: "Campos requeridos",
        description: "Por favor completa el módulo, título y URL del video."
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabasePROD
        .from('tutoriales')
        .insert([{
          modulo_id: parseInt(formData.moduloId),
          titulo: formData.titulo,
          descripcion: formData.descripcion,
          url_video: formData.urlVideo,
          miniatura_url: formData.miniaturaUrl || `https://picsum.photos/seed/${Math.random()}/600/400`,
          duracion_segundos: parseInt(formData.duracion) || 0,
          activo: true,
          es_publico: true
        }]);

      if (error) throw error;

      toast({
        title: "¡Éxito!",
        description: "El tutorial ha sido registrado correctamente.",
      });
      
      router.push('/');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => router.back()} className="rounded-full">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>

        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Video className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Subir Nuevo Tutorial</CardTitle>
            </div>
            <CardDescription>
              Registra un nuevo proceso del sistema seleccionando su categoría y módulo correspondiente.
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Categoría */}
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoría del Sistema</Label>
                  <Select 
                    value={formData.categoriaId} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, categoriaId: v }))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder={loadingCategories ? "Cargando..." : "Selecciona categoría"} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>{cat.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Módulo */}
                <div className="space-y-2">
                  <Label htmlFor="modulo">Módulo Específico</Label>
                  <Select 
                    value={formData.moduloId} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, moduloId: v }))}
                    disabled={!formData.categoriaId || loadingModules}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder={loadingModules ? "Cargando..." : "Selecciona módulo"} />
                    </SelectTrigger>
                    <SelectContent>
                      {modules.map(mod => (
                        <SelectItem key={mod.id} value={mod.id.toString()}>{mod.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Título */}
              <div className="space-y-2">
                <Label htmlFor="titulo">Título del Video</Label>
                <div className="relative">
                  <Layout className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="titulo"
                    className="pl-10 rounded-xl"
                    placeholder="Ej: Cómo realizar una conciliación bancaria"
                    value={formData.titulo}
                    onChange={e => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción del Proceso</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea 
                    id="descripcion"
                    className="pl-10 rounded-xl min-h-[120px]"
                    placeholder="Describe los pasos clave que se muestran en el video..."
                    value={formData.descripcion}
                    onChange={e => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* URL Video */}
                <div className="space-y-2">
                  <Label htmlFor="url">URL del Video</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="url"
                      className="pl-10 rounded-xl"
                      placeholder="https://youtube.com/..."
                      value={formData.urlVideo}
                      onChange={e => setFormData(prev => ({ ...prev, urlVideo: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                {/* Duración */}
                <div className="space-y-2">
                  <Label htmlFor="duracion">Duración (segundos)</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="duracion"
                      type="number"
                      className="pl-10 rounded-xl"
                      placeholder="Ej: 320"
                      value={formData.duracion}
                      onChange={e => setFormData(prev => ({ ...prev, duracion: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-end gap-3 pt-6 border-t">
              <Button type="button" variant="ghost" onClick={() => router.push('/')} className="rounded-xl">
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="rounded-xl px-8 shadow-lg shadow-primary/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Tutorial
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
