'use client';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Pencil, Trash, Eye } from "lucide-react"; // <-- добавлен Eye

function getStatusBadge(status: string) {
  switch (status) {
    case "Новый":
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Новый</Badge>;
    case "В работе":
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">В работе</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // State for displaying clients from DB
  const [clients, setClients] = useState<any[]>([]);
  const [fetchingClients, setFetchingClients] = useState(true);

  // State for add-client form and dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addPrimaryRequest, setAddPrimaryRequest] = useState("");
  const [addStatus, setAddStatus] = useState("Новый");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit dialog
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editClientLoading, setEditClientLoading] = useState(false);
  const [editClientError, setEditClientError] = useState<string | null>(null);
  const [editClient, setEditClient] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPrimaryRequest, setEditPrimaryRequest] = useState("");
  const [editStatus, setEditStatus] = useState("Новый");

  // Fetch clients on mount
  const fetchClients = async () => {
    setFetchingClients(true);
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("id", { ascending: false });
    if (!error) {
      setClients(data || []);
    }
    setFetchingClients(false);
  };

  // Initial load
  useEffect(() => {
    fetchClients();
  }, []);

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.push('/auth');
    setLoading(false);
  };

  // Handle add client form submit
  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError(null);

    // Получаем текущего пользователя
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user?.id) {
      setAddError("Нет доступа к данным пользователя");
      setAddLoading(false);
      return;
    }

    // ВНИМАНИЕ: user_id обязательно присутствует в newClient!
    const newClient = {
      name: addName,
      email: addEmail ? addEmail : null,
      phone: addPhone ? addPhone : null,
      primary_request: addPrimaryRequest ? addPrimaryRequest : null,
      status: addStatus,
      user_id: userData.user.id, // user_id ОБЯЗАТЕЛЬНО передан!
    };

    // Вставка в БД с user_id
    const { error } = await supabase.from("clients").insert([newClient]);
    if (error) {
      setAddError(error.message || "Ошибка при добавлении клиента");
    } else {
      setShowAddDialog(false);
      setAddName("");
      setAddEmail("");
      setAddPhone("");
      setAddPrimaryRequest("");
      setAddStatus("Новый");
      await fetchClients();
    }
    setAddLoading(false);
  };

  // Удаление клиента
  const deleteClient = async (id: number) => {
    if (!window.confirm("Удалить клиента?")) return;
    await supabase.from("clients").delete().eq("id", id);
    await fetchClients();
  };

  // Открыть диалог редактирования, подготовить данные
  const openEditDialog = (client: any) => {
    setEditClient(client);
    setEditName(client.name || "");
    setEditEmail(client.email || "");
    setEditPhone(client.phone || "");
    setEditPrimaryRequest(client.primary_request || "");
    setEditStatus(client.status || "Новый");
    setEditClientError(null);
    setShowEditDialog(true);
  };

  // Сохранить изменения клиента
  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClient?.id) return;
    setEditClientLoading(true);
    setEditClientError(null);

    const { error } = await supabase
      .from("clients")
      .update({
        name: editName,
        email: editEmail || null,
        phone: editPhone || null,
        primary_request: editPrimaryRequest || null,
        status: editStatus,
      })
      .eq("id", editClient.id);

    if (error) {
      setEditClientError(error.message || "Ошибка при обновлении клиента");
    } else {
      setShowEditDialog(false);
      setEditClient(null);
      await fetchClients();
    }
    setEditClientLoading(false);
  };

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 shadow-sm bg-white">
        <span className="font-bold text-2xl tracking-wide text-slate-800">ClientFlow</span>
        <Button
          variant="outline"
          onClick={handleSignOut}
          disabled={loading}
          className="px-6"
        >
          {loading ? "Выход..." : "Выйти"}
        </Button>
      </header>
      {/* Main content */}
      <main className="flex flex-col flex-1 w-full max-w-5xl mx-auto py-10 px-4 gap-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-semibold text-slate-900">Мои клиенты</h2>
          <Button
            variant="default"
            className="px-6 py-2 text-base font-medium"
            onClick={() => setShowAddDialog(true)}
          >
            + Добавить клиента
          </Button>
        </div>
        {/* диалог добавления клиента */}
        {showAddDialog && (
          <div
            style={{
              position: "fixed",
              top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(0,0,0,.10)",
              zIndex: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => { if (!addLoading) setShowAddDialog(false)}}
          >
            <div
              className="bg-white rounded-xl w-full max-w-md p-7 shadow"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold mb-2">Добавить клиента</h3>
              <form onSubmit={handleAddClient} className="space-y-4">
                <input
                  className="border rounded px-3 py-2 w-full"
                  placeholder="Имя"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  disabled={addLoading}
                  required
                />
                <input
                  className="border rounded px-3 py-2 w-full"
                  placeholder="Email"
                  value={addEmail}
                  type="email"
                  onChange={e => setAddEmail(e.target.value)}
                  disabled={addLoading}
                />
                <input
                  className="border rounded px-3 py-2 w-full"
                  placeholder="Телефон"
                  value={addPhone}
                  onChange={e => setAddPhone(e.target.value)}
                  disabled={addLoading}
                />
                <input
                  className="border rounded px-3 py-2 w-full"
                  placeholder="Первичный запрос"
                  value={addPrimaryRequest}
                  onChange={e => setAddPrimaryRequest(e.target.value)}
                  disabled={addLoading}
                />
                <select
                  className="border rounded px-3 py-2 w-full"
                  value={addStatus}
                  onChange={e => setAddStatus(e.target.value)}
                  disabled={addLoading}
                >
                  <option value="Новый">Новый</option>
                  <option value="В работе">В работе</option>
                </select>
                {addError && (
                  <div className="bg-red-100 rounded border border-red-200 px-3 py-2 text-sm text-red-700">{addError}</div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    type="submit"
                    disabled={addLoading}
                    className="flex-1"
                  >
                    {addLoading ? "Добавление..." : "Добавить"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowAddDialog(false)}
                    disabled={addLoading}
                  >
                    Отмена
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Диалог редактирования клиента */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent onClick={e => e.stopPropagation()} className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Редактировать клиента</DialogTitle>
            </DialogHeader>
            {editClient && (
              <form className="space-y-4" onSubmit={handleEditClient}>
                <input
                  className="border rounded px-3 py-2 w-full"
                  placeholder="Имя"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  disabled={editClientLoading}
                  required
                />
                <input
                  className="border rounded px-3 py-2 w-full"
                  placeholder="Email"
                  value={editEmail}
                  type="email"
                  onChange={e => setEditEmail(e.target.value)}
                  disabled={editClientLoading}
                />
                <input
                  className="border rounded px-3 py-2 w-full"
                  placeholder="Телефон"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  disabled={editClientLoading}
                />
                <input
                  className="border rounded px-3 py-2 w-full"
                  placeholder="Первичный запрос"
                  value={editPrimaryRequest}
                  onChange={e => setEditPrimaryRequest(e.target.value)}
                  disabled={editClientLoading}
                />
                <select
                  className="border rounded px-3 py-2 w-full"
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  disabled={editClientLoading}
                >
                  <option value="Новый">Новый</option>
                  <option value="В работе">В работе</option>
                </select>
                {editClientError && (
                  <div className="bg-red-100 rounded border border-red-200 px-3 py-2 text-sm text-red-700">{editClientError}</div>
                )}
                <DialogFooter>
                  <Button type="submit" disabled={editClientLoading}>
                    {editClientLoading ? "Сохранение..." : "Сохранить"}
                  </Button>
                  <DialogClose asChild>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowEditDialog(false)}
                      disabled={editClientLoading}
                    >
                      Отмена
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        <div className="bg-white rounded-xl shadow border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/5">Имя</TableHead>
                <TableHead className="w-1/4">Контакты</TableHead>
                <TableHead className="w-1/6">Статус</TableHead>
                <TableHead className="w-1/4">Первичный запрос</TableHead>
                <TableHead className="w-1/6 text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fetchingClients ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-lg">
                    Загрузка клиентов...
                  </TableCell>
                </TableRow>
              ) : clients.length > 0 ? (
                clients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>
                      <span className="block text-gray-700">
                        {(client.email || "—") + (client.phone ? ` / ${client.phone}` : "")}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(client.status)}
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-700">{client.primary_request || "—"}</span>
                    </TableCell>
                    <TableCell className="text-right flex gap-1 justify-end items-center">
                      {/* Новая кнопка "глаз" для перехода в карточку клиента */}
                      <Link href={`/dashboard/client/${client.id}`}>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="p-2"
                          title="Просмотр"
                        >
                          <Eye size={16} />
                        </Button>
                      </Link>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="p-2"
                        title="Редактировать"
                        onClick={() => openEditDialog(client)}
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="p-2"
                        title="Удалить"
                        onClick={() => deleteClient(client.id)}
                      >
                        <Trash size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-slate-400">
                    Нет клиентов
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );


}