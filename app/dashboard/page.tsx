'use client';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
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
import { Pencil, Trash, Eye, Search } from "lucide-react";

// Для форматирования даты и времени по-русски
const formatRusDateTime = (dateString: string | null | undefined) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.valueOf())) return "—";
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Только время для карточек-плана
const formatRusTime = (dateString: string | null | undefined) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.valueOf())) return "";
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

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

  // SEARCH state
  const [searchQuery, setSearchQuery] = useState("");

  // State for add-client form and dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addPrimaryRequest, setAddPrimaryRequest] = useState("");
  const [addStatus, setAddStatus] = useState("Новый");
  const [addNextSession, setAddNextSession] = useState(""); // <---- new state
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit dialog - only single edit at a time
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editClient, setEditClient] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editNextSession, setEditNextSession] = useState(""); // <---- new state
  const [editClientLoading, setEditClientLoading] = useState(false);
  const [editClientError, setEditClientError] = useState<string | null>(null);

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
      user_id: userData.user.id,
      next_session: addNextSession ? new Date(addNextSession).toISOString() : null,
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
      setAddNextSession(""); // Очистить поле сессии
      await fetchClients();
    }
    setAddLoading(false);
  };

  // Удаление клиента с confirm и мгновенным обновлением clients на экране
  const deleteClient = async (id: number) => {
    const confirmed = window.confirm("Вы точно хотите удалить этого клиента?");
    if (!confirmed) return;
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (!error) {
      setClients(prevClients => prevClients.filter(client => client.id !== id));
    } else {
      // Можно обработать ошибку удаления, например, alert(error.message)
    }
  };

  // Открыть диалог редактирования, подготовить данные
  const openEditDialog = (client: any) => {
    setEditClient(client);
    setEditName(client.name || "");
    setEditEmail(client.email || "");
    setEditPhone(client.phone || "");
    setEditNextSession(
      client.next_session
        ? new Date(client.next_session).toISOString().slice(0, 16)
        : ""
    );
    setEditClientError(null);
    setShowEditDialog(true);
  };

  // Функция для обновления клиента (теперь с next_session)
  const updateClient = async (
    id: number,
    values: { name: string; email: string; phone: string; next_session: string }
  ) => {
    setEditClientLoading(true);
    setEditClientError(null);
    const { error } = await supabase
      .from("clients")
      .update({
        name: values.name,
        email: values.email || null,
        phone: values.phone || null,
        next_session: values.next_session
          ? new Date(values.next_session).toISOString()
          : null,
      })
      .eq("id", id);

    if (error) {
      setEditClientError(error.message || "Ошибка при обновлении клиента");
      setEditClientLoading(false);
      return false;
    } else {
      setEditClientLoading(false);
      return true;
    }
  };

  // Отправка формы редактирования
  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClient?.id) return;
    const success = await updateClient(editClient.id, {
      name: editName,
      email: editEmail,
      phone: editPhone,
      next_session: editNextSession,
    });

    if (success) {
      setShowEditDialog(false);
      setEditClient(null);
      await fetchClients();
    }
  };

  // -------- Новый функционал: План на сегодня ----------------

  // Вычисляем today's clients сессии
  const todaySessions = useMemo(() => {
    // Определяем UTC полуночь сегодняшней даты и следующего дня
    const now = new Date();

    // Используем локальное время для пользователя
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();

    const todayStart = new Date(y, m, d, 0, 0, 0, 0); // локальная полуночь
    const todayEnd = new Date(y, m, d, 23, 59, 59, 999);

    return clients.filter(client => {
      if (!client.next_session) return false;
      const date = new Date(client.next_session);
      // Сессия входит в локальный "сегодня"
      return date >= todayStart && date <= todayEnd;
    }).sort((a, b) => {
      // Сортировка по времени
      const dA = new Date(a.next_session);
      const dB = new Date(b.next_session);
      return dA.getTime() - dB.getTime();
    });
  }, [clients]);

  // Поиск клиентов: фильтрация по имени или email
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.trim().toLowerCase();
    return clients.filter(
      (client) =>
        (client.name && client.name.toLowerCase().includes(q)) ||
        (client.email && client.email.toLowerCase().includes(q))
    );
  }, [searchQuery, clients]);

  // ----------------------------------------------------------

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
        {/* SEARCH and ADD CLIENT ROW */}
        <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
          <h2 className="text-3xl font-semibold text-slate-900">Мои клиенты</h2>
          <div className="flex flex-1 gap-3 items-center justify-end max-w-lg ml-5">
            {/* Поиск */}
            <div className="relative flex-1 max-w-[320px] min-w-[220px] mr-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ae9442] pointer-events-none">
                <Search size={18} />
              </span>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Поиск по имени или email"
                className="w-full pl-10 pr-3 py-2 border border-[#ae9442] rounded-[1rem] outline-none focus:ring-2 focus:ring-[#eadab2] transition-all font-['Playfair_Display',serif] text-base text-slate-800 placeholder:text-[#c1ae85] bg-white"
                style={{
                  fontFamily: "'Playfair Display', serif"
                }}
              />
            </div>
            {/* Кнопка добавления */}
            <Button
              variant="default"
              className="px-6 py-2 text-base font-medium"
              onClick={() => setShowAddDialog(true)}
            >
              + Добавить клиента
            </Button>
          </div>
        </div>

        {/* --- План на сегодня (новый блок) --- */}
        <section aria-label="План на сегодня" className="mb-8">
          <Card className="border-[1.5px] border-[#1156311A] shadow-none bg-[#f8fcf9]">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl font-bold text-[#115631]">
                План на сегодня
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 pb-4">
              {fetchingClients ? (
                <div className="text-sm text-muted-foreground">
                  Загрузка планов на сегодня…
                </div>
              ) : todaySessions.length > 0 ? (
                <div>
                  <div className="mb-3 text-base font-medium text-[#115631]">
                    Сегодня у вас <span className="font-bold">{todaySessions.length}</span> {todaySessions.length === 1 ? "сессия" : (todaySessions.length < 5 ? "сессии" : "сессий")}
                  </div>
                  <ul className="flex flex-col gap-1">
                    {todaySessions.map((session) => (
                      <li key={session.id} className="flex flex-row items-center gap-2">
                        <span className="block rounded px-2 bg-[#1156310D] text-[#115631] font-bold text-base py-1 min-w-[72px] text-center">
                          {formatRusTime(session.next_session)}
                        </span>
                        <span className="ml-1 font-semibold text-slate-800">{session.name}</span>
                        {session.primary_request && (
                          <span className="ml-2 text-xs text-gray-500 truncate italic">– {session.primary_request}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-[#115631] font-medium text-base flex items-center gap-2 flex-wrap">
                  <span className="text-2xl leading-none select-none">🌱</span>
                  Сегодня встреч не запланировано. Идеальное время для отдыха или чтения книги!
                </div>
              )}
            </CardContent>
          </Card>
        </section>
        {/* --- Конец блока "План на сегодня" --- */}

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
                <input
                  className="border rounded px-3 py-2 w-full"
                  type="datetime-local"
                  value={addNextSession}
                  onChange={e => setAddNextSession(e.target.value)}
                  disabled={addLoading}
                  placeholder="Дата и время сессии"
                  required={false}
                />
                <span className="text-sm text-gray-500">
                  Дата и время сессии (необязательно)
                </span>
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
        <Dialog open={showEditDialog} onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) {
            setEditClient(null);
            setEditClientError(null);
            setEditClientLoading(false);
          }
        }}>
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
                  type="datetime-local"
                  value={editNextSession}
                  onChange={e => setEditNextSession(e.target.value)}
                  disabled={editClientLoading}
                  placeholder="Дата и время сессии"
                  required={false}
                />
                <span className="text-sm text-gray-500">
                  Дата и время сессии (необязательно)
                </span>
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
                <TableHead className="w-1/5">Сессия</TableHead>
                <TableHead className="w-1/4">Первичный запрос</TableHead>
                <TableHead className="w-1/6 text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fetchingClients ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-lg">
                    Загрузка клиентов...
                  </TableCell>
                </TableRow>
              ) : filteredClients.length > 0 ? (
                filteredClients.map((client) => (
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
                      <span className="text-slate-700">{formatRusDateTime(client.next_session)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-700">{client.primary_request || "—"}</span>
                    </TableCell>
                    <TableCell className="text-right flex gap-1 justify-end items-center">
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
                  <TableCell colSpan={6} className="text-center py-10 text-[#b89238] font-['Playfair_Display',serif] text-xl">
                    {searchQuery.trim()
                      ? "Клиент с таким именем не найден"
                      : "Нет клиентов"
                    }
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