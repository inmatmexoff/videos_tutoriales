
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  Video, 
  Layout, 
  FileText, 
  Upload as UploadIcon,
  Clock,
  Loader2,
  FileVideo
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
  
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [modules, setModules] = useState<Modulo[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingModules, setLoadingModules] = useState(false);
  
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    categoriaId: "",
    moduloId: "",
    titulo: "",
    descripcion: "",
    duracion: "",
    miniaturaUrl: ""
  });

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
        setFormData(prev => ({ ...prev, moduloId: "" }));
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los módulos."
        });
      } finally {
        setLoadingModules(false);
      }
    }
    fetchModules();
  }, [formData.categoriaId, toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      
      // Crear un elemento de video temporal para extraer la duración
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        // Liberar la memoria del objeto URL
        window.URL.revokeObjectURL(video.src);
        const duration = Math.floor(video.duration);
        setFormData(prev => ({ ...prev, duracion: duration.toString() }));
        
        toast({
          title: "Duración detectada",
          description: `El video dura ${Math.floor(duration / 60)}m ${duration % 60}s.`,
        });
      };
      video.src = URL.createObjectURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.moduloId || !formData.titulo || !videoFile) {
      toast({
        variant: "destructive",
        title: "Campos requeridos",
        description: "Por favor selecciona un módulo, título y el archivo de video."
      });
      return;
    }

    setLoading(true);
    try {
      const categoria = categories.find(c => c.id.toString() === formData.categoriaId);
      const modulo = modules.find(m => m.id.toString() === formData.moduloId);
      
      if (!categoria || !modulo) throw new Error("Error al identificar categoría o módulo.");

      const cleanCat = categoria.nombre.trim().replace(/[^a-zA-Z0-9]/g, '_');
      const cleanMod = modulo.nombre.trim().replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${Date.now()}_${videoFile.name.replace(/\s/g, '_')}`;
      
      const filePath = `${cleanCat}/${cleanMod}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabasePROD
        .storage
        .from('videos-tutoriales')
        .upload(filePath, videoFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabasePROD
        .storage
        .from('videos-tutoriales')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabasePROD
        .from('tutoriales')
        .insert([{
          modulo_id: parseInt(formData.moduloId),
          titulo: formData.titulo,
          descripcion: formData.descripcion,
          url_video: publicUrl,
          miniatura_url: formData.miniaturaUrl || `https://picsum.photos/seed/${Math.random()}/600/400`,
          duracion_segundos: parseInt(formData.duracion) || 0,
          activo: true,
          es_publico: true
        }]);

      if (dbError) throw dbError;

      toast({
        title: "¡Éxito!",
        description: "El video se ha subido y registrado correctamente.",
      });
      
      router.push('/');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error en el proceso",
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
              <CardTitle className="text-2xl">Subir Video al Sistema</CardTitle>
            </div>
            <CardDescription>
              El video se organizará automáticamente en carpetas por categoría y módulo en el bucket <strong>videos-tutoriales</strong>.
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoría</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="modulo">Módulo</Label>
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

              <div className="space-y-2">
                <Label htmlFor="titulo">Título del Tutorial</Label>
                <div className="relative">
                  <Layout className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="titulo"
                    className="pl-10 rounded-xl"
                    placeholder="Ej: Proceso de Apertura de Caja"
                    value={formData.titulo}
                    onChange={e => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="video-file">Archivo de Video</Label>
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="video-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-muted/30 hover:bg-muted/50 border-muted-foreground/20 transition-all">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {videoFile ? (
                        <>
                          <FileVideo className="w-8 h-8 mb-2 text-primary" />
                          <p className="text-sm font-medium text-foreground">{videoFile.name}</p>
                          <p className="text-xs text-muted-foreground">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </>
                      ) : (
                        <>
                          <UploadIcon className="w-8 h-8 mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Haz clic para seleccionar el video</p>
                          <p className="text-xs text-muted-foreground">MP4, MOV o WebM</p>
                        </>
                      )}
                    </div>
                    <input 
                      id="video-file" 
                      type="file" 
                      accept="video/*" 
                      className="hidden" 
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea 
                    id="descripcion"
                    className="pl-10 rounded-xl min-h-[100px]"
                    placeholder="Describe los puntos clave del tutorial..."
                    value={formData.descripcion}
                    onChange={e => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="duracion">Duración (segundos) - Detectada automáticamente</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="duracion"
                      type="number"
                      className="pl-10 rounded-xl bg-muted/50"
                      placeholder="0"
                      value={formData.duracion}
                      onChange={e => setFormData(prev => ({ ...prev, duracion: e.target.value }))}
                      readOnly
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="miniatura">URL de Miniatura (Opcional)</Label>
                  <Input 
                    id="miniatura"
                    className="rounded-xl"
                    placeholder="https://..."
                    value={formData.miniaturaUrl}
                    onChange={e => setFormData(prev => ({ ...prev, miniaturaUrl: e.target.value }))}
                  />
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
                    Subiendo video...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar y Subir
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
