
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
  FileVideo,
  AlertTriangle
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AdminGuard } from "@/components/admin-guard";

interface Categoria {
  id: number;
  nombre: string;
}

interface Modulo {
  id: number;
  nombre: string;
}

const MAX_FILE_SIZE_MB = 50;

export default function UploadTutorialPage() {
  return (
    <AdminGuard>
      <UploadContent />
    </AdminGuard>
  );
}

function UploadContent() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [modules, setModules] = useState<Modulo[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingModules, setLoadingModules] = useState(false);
  
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
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
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las categorías." });
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
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los módulos." });
      } finally {
        setLoadingModules(false);
      }
    }
    fetchModules();
  }, [formData.categoriaId, toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);

    if (file) {
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > MAX_FILE_SIZE_MB) {
        setFileError(`El archivo es demasiado grande. Límite: ${MAX_FILE_SIZE_MB}MB.`);
        setVideoFile(null);
        return;
      }
      setVideoFile(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        setFormData(prev => ({ ...prev, duracion: Math.floor(video.duration).toString() }));
      };
      video.src = URL.createObjectURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.moduloId || !formData.titulo || !videoFile) {
      toast({ variant: "destructive", title: "Campos requeridos", description: "Por favor completa el formulario y selecciona un video." });
      return;
    }

    setLoading(true);
    try {
      const cat = categories.find(c => c.id.toString() === formData.categoriaId);
      const mod = modules.find(m => m.id.toString() === formData.moduloId);
      const fileName = `${Date.now()}_${videoFile.name.replace(/\s/g, '_')}`;
      const filePath = `${cat?.nombre}/${mod?.nombre}/${fileName}`;

      const { error: uploadError } = await supabasePROD.storage.from('videos-tutoriales').upload(filePath, videoFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabasePROD.storage.from('videos-tutoriales').getPublicUrl(filePath);

      const { error: dbError } = await supabasePROD.from('tutoriales').insert([{
        modulo_id: parseInt(formData.moduloId),
        titulo: formData.titulo,
        descripcion: formData.descripcion,
        url_video: publicUrl,
        miniatura_url: formData.miniaturaUrl || `https://picsum.photos/seed/${Math.random()}/600/400`,
        duracion_segundos: parseInt(formData.duracion) || 0,
        orden: 0
      }]);

      if (dbError) throw dbError;
      toast({ title: "¡Éxito!", description: "El video ha sido registrado correctamente." });
      router.push('/');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
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
              <CardTitle className="text-2xl">Subir Nuevo Proceso</CardTitle>
            </div>
            <CardDescription>Completa la información para registrar el tutorial en el sistema.</CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {fileError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error de archivo</AlertTitle>
                  <AlertDescription>{fileError}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select value={formData.categoriaId} onValueChange={v => setFormData(prev => ({ ...prev, categoriaId: v }))}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecciona categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Módulo</Label>
                  <Select value={formData.moduloId} onValueChange={v => setFormData(prev => ({ ...prev, moduloId: v }))} disabled={!formData.categoriaId}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder={loadingModules ? "Cargando..." : "Selecciona módulo"} />
                    </SelectTrigger>
                    <SelectContent>
                      {modules.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="titulo">Título del Proceso</Label>
                <div className="relative">
                  <Layout className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="titulo"
                    className="pl-10 rounded-xl"
                    placeholder="Ej: Reclutamiento de Personal"
                    value={formData.titulo}
                    onChange={e => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Archivo de Video (Máx 50MB)</Label>
                <div className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-muted/30 hover:bg-muted/50 transition-all relative">
                  <input 
                    type="file" 
                    accept="video/*" 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                  />
                  <div className="text-center">
                    <div className="flex justify-center mb-2">
                      <UploadIcon className={`w-8 h-8 ${videoFile ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    {videoFile ? (
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-foreground">{videoFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Haz clic o arrastra el video aquí</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea 
                    id="descripcion"
                    className="pl-10 rounded-xl min-h-[100px]"
                    placeholder="Detalles sobre este proceso..."
                    value={formData.descripcion}
                    onChange={e => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="duracion">Duración (segundos)</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="duracion"
                      readOnly
                      className="pl-10 rounded-xl bg-muted/50 cursor-not-allowed"
                      value={formData.duracion}
                      placeholder="Auto-detectada"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="miniatura">URL de Miniatura (Opcional)</Label>
                  <Input 
                    id="miniatura"
                    className="rounded-xl"
                    placeholder="https://ejemplo.com/imagen.jpg"
                    value={formData.miniaturaUrl}
                    onChange={e => setFormData(prev => ({ ...prev, miniaturaUrl: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-end gap-3 pt-6 border-t">
              <Button type="button" variant="ghost" onClick={() => router.back()} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !!fileError || !videoFile} className="rounded-xl px-8 shadow-lg shadow-primary/20">
                {loading ? (
                  <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Subiendo...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Guardar Proceso</>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
