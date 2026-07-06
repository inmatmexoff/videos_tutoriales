
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Mail, Loader2, ShieldAlert, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabasePROD } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

/**
 * Página de inicio de sesión que utiliza Supabase Auth.
 * Valida credenciales de correo y contraseña contra la tabla de usuarios de Supabase.
 */
export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validación de credenciales contra Supabase
      const { error: authError } = await supabasePROD.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      toast({
        title: "Sesión iniciada",
        description: "Bienvenido al gestor de procesos.",
      });
      
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión");
      toast({
        variant: "destructive",
        title: "Error de autenticación",
        description: err.message || "Credenciales incorrectas",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-none shadow-2xl bg-card/50 backdrop-blur-md">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Bienvenido</CardTitle>
          <CardDescription>
            Ingresa tus credenciales para acceder al sistema.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="email" 
                  placeholder="Correo electrónico" 
                  className="pl-10 rounded-xl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="password" 
                  placeholder="Contraseña" 
                  className="pl-10 rounded-xl"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> {error}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full rounded-xl" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
              Iniciar Sesión
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
