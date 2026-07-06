
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabasePROD } from "@/lib/supabase";
import { Loader2 } from 'lucide-react';

interface AdminGuardProps {
  children: React.ReactNode;
}

/**
 * Componente que protege rutas administrativas.
 * Verifica si existe una sesión activa en Supabase Auth.
 * Si no hay sesión, redirige a /login.
 */
export function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // Verificación de sesión persistente en Supabase
      const { data: { session } } = await supabasePROD.auth.getSession();
      
      if (session) {
        setAuthenticated(true);
      } else {
        router.push('/login');
      }
      setLoading(false);
    };
    
    checkAuth();

    // Escuchar cambios en el estado de autenticación (logout, expiry, etc)
    const { data: { subscription } } = supabasePROD.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAuthenticated(true);
      } else {
        setAuthenticated(false);
        router.push('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin w-10 h-10 text-primary" />
      </div>
    );
  }

  if (!authenticated) {
    return null; // La redirección es manejada por el useEffect
  }

  return <>{children}</>;
}
