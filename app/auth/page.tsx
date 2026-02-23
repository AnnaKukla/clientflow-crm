"use client";

import { useEffect, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface Client {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  primary_request?: string | null;
  [key: string]: any;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [loadingClients, setLoadingClients] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Add client form states
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addPrimaryRequest, setAddPrimaryRequest] = useState("");

  // Fetch clients from Supabase
  const fetchClients = async () => {
    setLoadingClients(true);
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("id", { ascending: false });
    setLoadingClients(false);
    if (!error) {
      setClients(data);
    } else {
      setClients([]);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Handle add client
  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!addName.trim()) {
      setAddError("Имя обязательно");
      return;
    }
    setAddLoading(true);

    const { error } = await supabase.from("clients").insert([
      {
        name: addName,
        email: addEmail || null,
        phone: addPhone || null,
        primary_request: addPrimaryRequest || null,
      },
    ]);
    setAddLoading(false);

    if (error) {
      setAddError(error.message);
    } else {
      // Reset fields, close dialog, refresh clients
      setAddName("");
      setAddEmail("");
      setAddPhone("");
      setAddPrimaryRequest("");
      setAddDialogOpen(false);
      fetchClients();
    }
  };

  return (
    <div className="flex h-screen w-screen justify-center items-center bg-gradient-to-tr from-slate-100 to-slate-200">
      <Card className="w-full max-w-3xl shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Клиенты
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>Добавить клиента</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Добавить клиента</DialogTitle>
                  <DialogDescription>
                    Введите данные нового клиента.
                  </DialogDescription>
                </DialogHeader>
                <form id="add-client-form" onSubmit={handleAddClient} className="space-y-4 pt-2">
                  <Input
                    required
                    placeholder="Имя*"
                    value={addName}
                    onChange={e => setAddName(e.target.value)}
                    disabled={addLoading}
                  />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={addEmail}
                    onChange={e => setAddEmail(e.target.value)}
                    disabled={addLoading}
                  />
                  <Input
                    placeholder="Телефон"
                    value={addPhone}
                    onChange={e => setAddPhone(e.target.value)}
                    disabled={addLoading}
                  />
                  <Input
                    placeholder="Первичный запрос"
                    value={addPrimaryRequest}
                    onChange={e => setAddPrimaryRequest(e.target.value)}
                    disabled={addLoading}
                  />
                  {addError && (
                    <Alert variant="destructive">
                      <AlertTitle>Ошибка</AlertTitle>
                      <AlertDescription>{addError}</AlertDescription>
                    </Alert>
                  )}
                </form>
                <DialogFooter>
                  <Button
                    type="submit"
                    form="add-client-form"
                    disabled={addLoading}
                  >
                    {addLoading ? "Добавление..." : "Добавить"}
                  </Button>
                  <DialogClose asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={addLoading}
                    >
                      Отмена
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {loadingClients ? (
            <div className="py-12 text-center text-gray-500 text-lg">
              Загрузка клиентов...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border rounded-md">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-4 border-b">Имя</th>
                    <th className="py-2 px-4 border-b">Email</th>
                    <th className="py-2 px-4 border-b">Телефон</th>
                    <th className="py-2 px-4 border-b">Первичный запрос</th>
                  </tr>
                </thead>
                <tbody>
                  {clients && clients.length > 0 ? (
                    clients.map((client) => (
                      <tr key={client.id} className="odd:bg-white even:bg-gray-50">
                        <td className="py-2 px-4 border-b">{client.name}</td>
                        <td className="py-2 px-4 border-b">{client.email || <span className="text-gray-300">—</span>}</td>
                        <td className="py-2 px-4 border-b">{client.phone || <span className="text-gray-300">—</span>}</td>
                        <td className="py-2 px-4 border-b">{client.primary_request || <span className="text-gray-300">—</span>}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-400">
                        Нет клиентов
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-center text-xs text-gray-400 mt-2">
          © {new Date().getFullYear()} ClientFlow CRM
        </CardFooter>
      </Card>
    </div>
  );
}
