
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
  Layout
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabasePROD } from "@/lib/supabase";
import { AdminGuard } from "@/components/admin-guard";

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
    miniaturaUrl: "",
    duracion: ""
  });

  useEffect(() => {
    async function fetchTutorial() {
      try {
        const { data, error } = await supabasePROD
          .from('tutoriales')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (data) {
          setFormData({
            titulo: data.titulo,
            descripcion: data.descripcion || "",
            miniaturaUrl: data.miniatura_url || "",
            duracion: data.duracion_segundos?.toString() || "0"
          });
        }
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo cargar el tutorial." });
        router.push('/');
      } finally {
        setLoading(false);
      }
    }
    fetchTutorial();
  }, [id, toast, router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabasePROD
        .from('tutoriales')
        .update({
          titulo: formData.titulo,
          descripcion: formData.descripcion,
          miniatura_url: formData.miniaturaUrl,
          duracion_segundos: parseInt(formData.duracion) || 0,
          fecha_actualizacion: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Actualizado", description: "El tutorial se ha guardado correctamente." });
      router.push('/');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
              <CardTitle className="text-2xl">Editar Tutorial</CardTitle>
            </div>
            <CardDescription>Modifica los metadatos del video existente.</CardDescription>
          </CardHeader>
          
          <form onSubmit={handleUpdate}>
            <CardContent className="space-y-6">
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
                <div className="space-y-2">
                  <Label htmlFor="miniatura">URL de Miniatura</Label>
                  <Input 
                    id="miniatura"
                    className="rounded-xl"
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
