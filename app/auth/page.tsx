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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function AuthPage() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const resetFields = () => {
    setEmail("");
    setPassword("");
    setConfirm("");
    setError(null);
  };

  const handleTabChange = (value: string) => {
    setTab(value as "login" | "register");
    resetFields();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else if (data?.session) {
      router.push("/dashboard");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else if (data?.user) {
      // Опционально: сообщить о необходимости подтверждения почты
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex h-screen w-screen justify-center items-center bg-gradient-to-tr from-slate-100 to-slate-200">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <img
            src="/logo.svg"
            alt="ClientFlow CRM"
            className="mx-auto h-12 w-12 mb-2"
            style={{ display: "block" }}
            onError={e => {
              // fallback if logo.svg doesn't exist
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <CardTitle className="text-2xl font-bold tracking-tight">
            ClientFlow CRM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid grid-cols-2 mb-6 w-full">
              <TabsTrigger value="login">Войти</TabsTrigger>
              <TabsTrigger value="register">Регистрация</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  type="email"
                  required
                  placeholder="Email"
                  autoComplete="username"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                />
                <Input
                  type="password"
                  required
                  placeholder="Пароль"
                  autoComplete="current-password"
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
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? "Вход..." : "Войти"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <Input
                  type="email"
                  required
                  placeholder="Email"
                  autoComplete="username"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                />
                <Input
                  type="password"
                  required
                  placeholder="Пароль"
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                  minLength={6}
                />
                <Input
                  type="password"
                  required
                  placeholder="Подтверждение пароля"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  disabled={loading}
                  minLength={6}
                />
                {error && (
                  <Alert variant="destructive">
                    <AlertTitle>Ошибка</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? "Регистрация..." : "Зарегистрироваться"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="justify-center text-xs text-gray-400 mt-2">
          © {new Date().getFullYear()} ClientFlow CRM
        </CardFooter>
      </Card>
    </div>
  );
}
