'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Проверяем текущую сессию пользователя
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) {
        setAuthenticated(true);
      } else {
        router.replace('/auth');
      }
      setLoading(false);
    });

    // Слушаем изменения состояния аутентификации
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (session) {
        setAuthenticated(true);
      } else {
        setAuthenticated(false);
        router.replace('/auth');
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <span className="text-lg text-muted-foreground">Загрузка...</span>
      </div>
    );
  }

  if (!authenticated) {
    // На случай race-condition. Обычно router.replace сработает раньше.
    return null;
  }

  return (
    <>
      {children}
    </>
  );
}