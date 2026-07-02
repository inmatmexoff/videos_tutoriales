
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Plus, 
  FolderPlus, 
  Layers, 
  Save, 
  Loader2, 
  Trash2,
  Tag,
  ListOrdered
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabasePROD } from "@/lib/supabase";
import { AdminGuard } from "@/components/admin-guard";

export default function AdminSettingsPage() {
  return (
    <AdminGuard>
      <AdminContent />
    </AdminGuard>
  );
}

function AdminContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [catData, setCatData] = useState({ nombre: "", descripcion: "", orden: "0" });
  const [modData, setModData] = useState({ categoriaId: "", nombre: "", descripcion: "", orden: "0" });

  const fetchCategories = async () => {
    const { data } = await supabasePROD
      .from('categorias_tutoriales')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true });
    setCategories(data || []);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabasePROD
        .from('categorias_tutoriales')
        .insert([{
          nombre: catData.nombre,
          descripcion: catData.descripcion,
          orden: parseInt(catData.orden) || 0
        }]);

      if (error) throw error;
      toast({ title: "Categoría creada", description: `Se ha registrado "${catData.nombre}"` });
      setCatData({ nombre: "", descripcion: "", orden: "0" });
      fetchCategories();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modData.categoriaId) return;
    setLoading(true);
    try {
      const { error } = await supabasePROD
        .from('modulos_tutoriales')
        .insert([{
          categoria_id: parseInt(modData.categoriaId),
          nombre: modData.nombre,
          descripcion: modData.descripcion,
          orden: parseInt(modData.orden) || 0
        }]);

      if (error) throw error;
      toast({ title: "Módulo creado", description: `Se ha registrado "${modData.nombre}"` });
      setModData({ categoriaId: modData.categoriaId, nombre: "", descripcion: "", orden: "0" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => router.push('/')} className="rounded-full">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al inicio
        </Button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Layers className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Gestión de Estructura</h1>
        </div>

        <Tabs defaultValue="categorias" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-xl h-12">
            <TabsTrigger value="categorias" className="rounded-lg">Categorías</TabsTrigger>
            <TabsTrigger value="modulos" className="rounded-lg">Módulos</TabsTrigger>
          </TabsList>

          <TabsContent value="categorias" className="mt-6">
            <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderPlus className="w-5 h-5 text-primary" /> Nueva Categoría
                </CardTitle>
                <CardDescription>Crea contenedores principales para tus procesos.</CardDescription>
              </CardHeader>
              <form onSubmit={handleCreateCategory}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cat-nombre">Nombre de Categoría</Label>
                    <Input 
                      id="cat-nombre" 
                      placeholder="Ej: Recursos Humanos" 
                      value={catData.nombre}
                      onChange={e => setCatData(prev => ({ ...prev, nombre: e.target.value }))}
                      required
                      className="rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-3 space-y-2">
                      <Label htmlFor="cat-desc">Descripción (Opcional)</Label>
                      <Input 
                        id="cat-desc" 
                        placeholder="Breve detalle..." 
                        value={catData.descripcion}
                        onChange={e => setCatData(prev => ({ ...prev, descripcion: e.target.value }))}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cat-orden">Orden</Label>
                      <Input 
                        id="cat-orden" 
                        type="number"
                        value={catData.orden}
                        onChange={e => setCatData(prev => ({ ...prev, orden: e.target.value }))}
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button disabled={loading} className="w-full rounded-xl">
                    {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Categoría
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="modulos" className="mt-6">
            <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-primary" /> Nuevo Módulo
                </CardTitle>
                <CardDescription>Asigna submódulos a las categorías existentes.</CardDescription>
              </CardHeader>
              <form onSubmit={handleCreateModule}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Categoría Padre</Label>
                    <Select 
                      value={modData.categoriaId} 
                      onValueChange={v => setModData(prev => ({ ...prev, categoriaId: v }))}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selecciona categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>{cat.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mod-nombre">Nombre del Módulo</Label>
                    <Input 
                      id="mod-nombre" 
                      placeholder="Ej: Reclutamiento" 
                      value={modData.nombre}
                      onChange={e => setModData(prev => ({ ...prev, nombre: e.target.value }))}
                      required
                      className="rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-3 space-y-2">
                      <Label htmlFor="mod-desc">Descripción</Label>
                      <Input 
                        id="mod-desc" 
                        placeholder="Propósito del módulo..." 
                        value={modData.descripcion}
                        onChange={e => setModData(prev => ({ ...prev, descripcion: e.target.value }))}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mod-orden">Orden</Label>
                      <Input 
                        id="mod-orden" 
                        type="number"
                        value={modData.orden}
                        onChange={e => setModData(prev => ({ ...prev, orden: e.target.value }))}
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button disabled={loading || !modData.categoriaId} className="w-full rounded-xl">
                    {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Módulo
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
