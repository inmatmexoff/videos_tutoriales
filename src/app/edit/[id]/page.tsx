"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  Video, 
  FileText, 
  Loader2, 
  Clock,
  Layout,
  ImageIcon,
  Image as ImageIconLucide,
  FileVideo,
  AlertCircle,
  Settings,
  Monitor
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabasePROD } from "@/lib/supabase";
import { AdminGuard } from "@/components/admin-guard";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function EditTutorialPage() {
  return (
    <AdminGuard>
      <EditContent />
    </AdminGuard>
  );
}

function EditContent() {
  const router = useRouter();
  const { id } = useParams();
  const { toast } = useToast();
  
  const [stateLoading, setStateLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>("");
  
  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
    miniaturaUrl: "",
    videoUrl: "",
    duracion: "",
    moduloId: null as number | null,
    subcategoriaId: "",
    esEspacio: false,
    tipoContenido: "operacion"
  });

  const [subcategories, setSubcategories] = useState<{ id: number; nombre: string }[]>([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);

  useEffect(() => {
    async function fetchTutorial() {
      try {
        const { data, error } = await supabasePROD
          .from('tutoriales')
          .select(`
            *,
            modulo:modulos_tutoriales (
              nombre,
              categoria:categorias_tutoriales (nombre)
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        if (data) {
          setFormData({
            titulo: data.titulo,
            descripcion: data.descripcion || "",
            miniaturaUrl: data.miniatura_url || "",
            videoUrl: data.url_video || "",
            duracion: data.duracion_segundos?.toString() || "0",
            moduloId: data.modulo_id,
            subcategoriaId: data.subcategoria_id ? data.subcategoria_id.toString() : "",
            esEspacio: data.es_espacio || false,
            tipoContenido: data.tipo_contenido || "operacion"
          });
          setPreviewUrl(data.miniatura_url);
          setVideoPreviewUrl(data.url_video);
        }
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo cargar el tutorial." });
        router.push('/');
      } finally {
        setStateLoading(false);
      }
    }
    fetchTutorial();
  }, [id, toast, router]);

  useEffect(() => {
    async function fetchSubcategories() {
      if (!formData.moduloId) {
        setSubcategories([]);
        return;
      }
      try {
        setLoadingSubcategories(true);
        const { data, error } = await supabasePROD
          .from('subcategorias_tutoriales')
          .select('id, nombre')
          .eq('modulo_id', formData.moduloId)
          .eq('activo', true)
          .order('nombre', { ascending: true });
        if (error) throw error;
        setSubcategories(data || []);
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las subcategorías." });
      } finally {
        setLoadingSubcategories(false);
      }
    }
    fetchSubcategories();
  }, [formData.moduloId, toast]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreviewUrl(url);
      
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        setFormData(prev => ({ ...prev, duracion: Math.floor(video.duration).toString() }));
      };
      video.src = url;
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabasePROD.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      let currentMiniaturaUrl = formData.miniaturaUrl;
      let currentVideoUrl = formData.videoUrl;

      const timestamp = Date.now();

      if (imageFile) {
        const imgFileName = `${timestamp}_${imageFile.name.replace(/\s/g, '_')}`;
        const imgPath = `editados/thumbnails/${imgFileName}`;
        const { error: imgError } = await supabasePROD.storage.from('videos-tutoriales').upload(imgPath, imageFile);
        if (imgError) throw imgError;
        const { data: { publicUrl } } = supabasePROD.storage.from('videos-tutoriales').getPublicUrl(imgPath);
        currentMiniaturaUrl = publicUrl;
      }

      if (videoFile) {
        const videoFileName = `${timestamp}_${videoFile.name.replace(/\s/g, '_')}`;
        const videoPath = `editados/videos/${videoFileName}`;
        const { error: vidError } = await supabasePROD.storage.from('videos-tutoriales').upload(videoPath, videoFile);
        if (vidError) throw vidError;
        const { data: { publicUrl } } = supabasePROD.storage.from('videos-tutoriales').getPublicUrl(videoPath);
        currentVideoUrl = publicUrl;
      }

      const { error } = await supabasePROD
        .from('tutoriales')
        .update({
          titulo: formData.titulo,
          descripcion: formData.descripcion,
          miniatura_url: currentMiniaturaUrl,
          url_video: currentVideoUrl,
          duracion_segundos: parseInt(formData.duracion) || 0,
          fecha_actualizacion: new Date().toISOString(),
          es_espacio: currentVideoUrl === "" && !videoFile, // Sigue siendo espacio si aún no tiene video
          tipo_contenido: formData.tipoContenido,
          subcategoria_id: formData.subcategoriaId ? parseInt(formData.subcategoriaId) : null
        })
        .eq('id', id);

      if (error) throw error;

      // Log Auditoría
      await supabasePROD.from('auditoria_tutoriales').insert([{
        tutorial_id: parseInt(id as string),
        usuario_id: user.id,
        accion: 'MODIFICACION',
        detalles: `El usuario modificó el tutorial: ${formData.titulo}`
      }]);

      toast({ title: "Actualizado", description: "El proceso se ha guardado correctamente." });
      router.push('/');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (stateLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin w-10 h-10 text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => router.push('/')} className="rounded-full">
          <ArrowLeft className="mr-2 h-4 w-4" /> Cancelar y Volver
        </Button>

        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Video className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Editar Proceso</CardTitle>
            </div>
            <CardDescription>Modifica los datos del tutorial seleccionado.</CardDescription>
          </CardHeader>
          
          <form onSubmit={handleUpdate}>
            <CardContent className="space-y-6">
              {formData.esEspacio && !videoFile && (
                <Alert className="bg-orange-500/10 border-orange-500/20 text-orange-600 rounded-2xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="font-bold">Espacio Pendiente</AlertTitle>
                  <AlertDescription>Este proceso no tiene un video asociado. Súbelo a continuación.</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título</Label>
                  <div className="relative">
                    <Layout className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="titulo"
                      className="pl-10 rounded-xl"
                      value={formData.titulo}
                      onChange={e => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Contenido</Label>
                  <Select value={formData.tipoContenido} onValueChange={(v) => setFormData(p => ({ ...p, tipoContenido: v }))}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operacion">
                        <div className="flex items-center gap-2"><Settings className="w-4 h-4" /> Operación</div>
                      </SelectItem>
                      <SelectItem value="software">
                        <div className="flex items-center gap-2"><Monitor className="w-4 h-4" /> Software</div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {subcategories.length > 0 && (
                <div className="space-y-2">
                  <Label>Subcategoría (Opcional)</Label>
                  <Select
                    value={formData.subcategoriaId}
                    onValueChange={(v) => setFormData(p => ({ ...p, subcategoriaId: v === "NONE" ? "" : v }))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder={loadingSubcategories ? "Cargando..." : "Selecciona subcategoría"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Sin subcategoría</SelectItem>
                      {subcategories.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea 
                    id="descripcion"
                    className="pl-10 rounded-xl min-h-[100px]"
                    value={formData.descripcion}
                    onChange={e => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Cambiar Video</Label>
                    <div className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-muted/30 hover:bg-muted/50 transition-all relative overflow-hidden">
                      <input type="file" accept="video/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleVideoChange} />
                      <div className="text-center px-2">
                        <FileVideo className={`mx-auto mb-2 ${videoFile ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className="text-xs truncate">{videoFile ? videoFile.name : "Subir nuevo video"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Cambiar Miniatura</Label>
                    <div className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-muted/30 hover:bg-muted/50 transition-all relative overflow-hidden">
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageChange} />
                      <div className="text-center px-2">
                        <ImageIconLucide className={`mx-auto mb-2 ${imageFile ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className="text-xs truncate">{imageFile ? imageFile.name : "Nueva miniatura"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Previsualización</Label>
                    <div className="aspect-video rounded-xl overflow-hidden border bg-muted flex items-center justify-center relative">
                      {videoPreviewUrl ? (
                        <video src={videoPreviewUrl} controls className="w-full h-full object-contain" />
                      ) : previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-12 h-12 text-muted-foreground" />
                      )}
                      {formData.esEspacio && !videoPreviewUrl && (
                        <Badge variant="secondary" className="absolute top-2 right-2 bg-orange-500 text-white border-none">Sin Contenido</Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duracion">Duración (segundos)</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="duracion"
                        type="number"
                        className="pl-10 rounded-xl"
                        value={formData.duracion}
                        onChange={e => setFormData(prev => ({ ...prev, duracion: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-end gap-3 pt-6 border-t">
              <Button type="button" variant="ghost" onClick={() => router.push('/')} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="rounded-xl px-8 shadow-lg shadow-primary/20">
                {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar Cambios
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
