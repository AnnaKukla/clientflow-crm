"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Заполните email и пароль");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Неверный email или пароль"
          : error.message
      );
    } else {
      // Успешно залогинился
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex h-screen w-screen justify-center items-center bg-gradient-to-tr from-slate-100 to-slate-200">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Вход в систему
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5 pt-2" onSubmit={handleLogin} autoComplete="off">
            <Input
              required
              placeholder="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <Input
              required
              placeholder="Пароль"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
            />
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Ошибка</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Вход..." : "Войти"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center text-xs text-gray-400 mt-2">
          © {new Date().getFullYear()} ClientFlow CRM
        </CardFooter>
      </Card>
    </div>
  );
}
