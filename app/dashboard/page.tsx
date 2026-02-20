'use client';

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.push('/auth');
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold">
            Добро пожаловать в ClientFlow CRM
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center mt-4">
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleSignOut}
            disabled={loading}
          >
            {loading ? "Выход..." : "Выйти"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}