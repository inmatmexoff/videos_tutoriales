
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
        setFileError(`Límite: ${MAX_FILE_SIZE_MB}MB.`);
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
      toast({ variant: "destructive", title: "Campos requeridos", description: "Completa el formulario." });
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
        duracion_segundos: parseInt(formData.duracion) || 0
      }]);

      if (dbError) throw dbError;
      toast({ title: "¡Éxito!", description: "Video registrado." });
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
          <CardHeader><CardTitle>Subir Nuevo Proceso</CardTitle></CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {fileError && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{fileError}</AlertDescription></Alert>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select value={formData.categoriaId} onValueChange={v => setFormData(prev => ({ ...prev, categoriaId: v }))}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Categoría" /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Módulo</Label>
                  <Select value={formData.moduloId} onValueChange={v => setFormData(prev => ({ ...prev, moduloId: v }))} disabled={!formData.categoriaId}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Módulo" /></SelectTrigger>
                    <SelectContent>{modules.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Título</Label>
                <Input className="rounded-xl" value={formData.titulo} onChange={e => setFormData(prev => ({ ...prev, titulo: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Archivo</Label>
                <div className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-muted/30 hover:bg-muted/50 transition-all relative">
                  <input type="file" accept="video/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                  <div className="text-center">
                    {videoFile ? <p className="text-sm font-medium">{videoFile.name}</p> : <p className="text-sm text-muted-foreground">Selecciona el video</p>}
                  </div>
                </div>
              </div>
              <div className="space-y-2"><Label>Descripción</Label><Textarea className="rounded-xl" value={formData.descripcion} onChange={e => setFormData(prev => ({ ...prev, descripcion: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2"><Label>Duración (s)</Label><Input readOnly className="rounded-xl bg-muted/50" value={formData.duracion} /></div>
                <div className="space-y-2"><Label>URL Miniatura</Label><Input className="rounded-xl" value={formData.miniaturaUrl} onChange={e => setFormData(prev => ({ ...prev, miniaturaUrl: e.target.value }))} /></div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3 pt-6 border-t">
              <Button type="submit" disabled={loading || !!fileError || !videoFile} className="rounded-xl px-8 shadow-lg shadow-primary/20">
                {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />} Guardar
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
