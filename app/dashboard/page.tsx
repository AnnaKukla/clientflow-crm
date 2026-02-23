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
import { Pencil, Trash, Eye, Search, FileText } from "lucide-react";

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

// ----- Новый блок для отчёта -----
type NotesMap = { [userId: string]: number };
type ActivityMap = { [userId: string]: { name: string; count: number } };

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
  const [addMainRequest, setAddMainRequest] = useState(""); // Новое поле (main_request)
  const [addTherapyGoals, setAddTherapyGoals] = useState(""); // Новое поле (therapy_goals)
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
  const [editMainRequest, setEditMainRequest] = useState(""); // Новое поле (main_request)
  const [editTherapyGoals, setEditTherapyGoals] = useState(""); // Новое поле (therapy_goals)
  const [editClientLoading, setEditClientLoading] = useState(false);
  const [editClientError, setEditClientError] = useState<string | null>(null);

  // --- State for report dialog ---
  const [showReport, setShowReport] = useState(false);
  const [reportNotes, setReportNotes] = useState<any[]>([]);
  const [fetchingNotes, setFetchingNotes] = useState<boolean>(false);

  // Параметры для отчета
  const reportYear = 2026;
  const reportMonth = 1; // февраль (0 - январь)
  const reportMonthRu = "февраль";

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

  // Fetch notes для отчета
  const fetchNotesForReport = async () => {
    setFetchingNotes(true);
    // Получаем все заметки за нужный месяц и год
    // created_at между 2026-02-01 и 2026-02-29
    const start = new Date(reportYear, reportMonth, 1, 0, 0, 0).toISOString();
    // Март без день - это первое число следующего месяца
    const end = new Date(reportYear, reportMonth + 1, 1, 0, 0, 0).toISOString();
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .gte("created_at", start)
      .lt("created_at", end);

    if (!error) {
      setReportNotes(data || []);
    } else {
      setReportNotes([]);
    }
    setFetchingNotes(false);
  };

  // Открытие окна отчета
  const handleOpenReport = async () => {
    setShowReport(true);
    // Загружаем заметки только при открытии
    await fetchNotesForReport();
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
      main_request: addMainRequest ? addMainRequest : null,
      therapy_goals: addTherapyGoals ? addTherapyGoals : null,
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
      setAddMainRequest("");
      setAddTherapyGoals("");
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
    setEditMainRequest(client.main_request || "");
    setEditTherapyGoals(client.therapy_goals || "");
    setEditClientError(null);
    setShowEditDialog(true);
  };

  // Функция для обновления клиента (теперь с next_session, main_request, therapy_goals)
  const updateClient = async (
    id: number,
    values: { name: string; email: string; phone: string; next_session: string; main_request: string; therapy_goals: string }
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
        main_request: values.main_request || null,
        therapy_goals: values.therapy_goals || null,
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
      main_request: editMainRequest,
      therapy_goals: editTherapyGoals,
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

  // ---- Добавляем статистику: всего клиентов, в работе, сессии на неделе ----
  const totalClients = useMemo(() => clients.length, [clients]);
  const inProgressClients = useMemo(
    () => clients.filter((c) => c.status === "В работе").length,
    [clients]
  );
  const sessionsThisWeek = useMemo(() => {
    // Ближайшие 7 дней, включая сегодня
    const now = new Date();
    const endOfWeek = new Date();
    endOfWeek.setHours(23, 59, 59, 999);
    endOfWeek.setDate(now.getDate() + 6);
    return clients.filter((client) => {
      if (!client.next_session) return false;
      const dt = new Date(client.next_session);
      return dt >= now && dt <= endOfWeek;
    }).length;
  }, [clients]);
  // -------------------------------------------------------------------------

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

  // ----------- вычисления для отчета (мемоизация по clients, reportNotes) -------------
  const reportStartDate = new Date(reportYear, reportMonth, 1, 0, 0, 0, 0);
  const reportEndDate = new Date(reportYear, reportMonth + 1, 0, 23, 59, 59, 999); // последний день месяца

  // Новые клиенты за месяц
  const newClientsCount = useMemo(() => {
    // created_at между началом и концом месяца
    return clients.filter(client => {
      if (!client.created_at) return false;
      const dt = new Date(client.created_at);
      return dt >= reportStartDate && dt <= reportEndDate;
    }).length;
  }, [clients, reportYear, reportMonth]);

  // Всего сессий за месяц (отчетNotes длина)
  const sessionsCount = useMemo(() => {
    if (!Array.isArray(reportNotes)) return 0;
    return reportNotes.length;
  }, [reportNotes]);

  // Активные клиенты (по числу заметок за месяц)
  const topActiveClients = useMemo(() => {
    // Собираем счетчики по user_id
    if (!Array.isArray(reportNotes)) return [];
    const counter: Record<string, number> = {};
    reportNotes.forEach(note => {
      if (note.user_id) {
        counter[note.user_id] = (counter[note.user_id] ?? 0) + 1;
      }
    });
    // Найти клиентов по id
    const activeArr = Object.entries(counter)
      .map(([userId, count]) => {
        const client = clients.find(c => String(c.id) === String(userId));
        return client
          ? { name: client.name, count }
          : { name: `ID ${userId}`, count };
      });
    // Сортировать по активности
    return activeArr.sort((a, b) => b.count - a.count).slice(0, 5); // top 5
  }, [reportNotes, clients]);

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
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-semibold text-slate-900">Мои клиенты</h2>
            {/* Кнопка отчета */}
            <Button
              variant="outline"
              className="ml-2 flex gap-2 items-center rounded-full border-[#dfc899] shadow-sm px-4 py-2 font-serif text-[17px] bg-[#fdf7ea] hover:bg-[#fbeed7]"
              style={{
                fontFamily: "'Playfair Display', serif", 
                borderWidth: 1.5,
              }}
              onClick={handleOpenReport}
            >
              <FileText size={18} className="text-[#b08b39]" />
              Отчет за месяц
            </Button>
          </div>
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

        {/* --- Модальное окно отчёта за месяц --- */}
        <Dialog open={showReport} onOpenChange={open => setShowReport(open)}>
          <DialogContent
            className="rounded-2xl bg-[#fdf7ea] border-[2px] border-[#dfc899] max-w-lg w-full font-serif"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            <DialogHeader>
              <DialogTitle
                className="mb-2 text-[26px] text-[#755926] font-bold"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Итоги за {reportMonthRu} {reportYear}
              </DialogTitle>
            </DialogHeader>
            <div className="text-base text-[#8b7c5a] py-2">
              <div className="mb-5 flex flex-col gap-1">
                <div className="text-[#ad8f4e] text-lg font-semibold mb-0.5">
                  Новых клиентов:{" "}
                  <span className="font-bold text-[#76622f]">{fetchingClients ? "..." : newClientsCount}</span>
                </div>
                <div className="text-[#ad8f4e] text-lg font-semibold mb-2">
                  Проведено сессий:{" "}
                  <span className="font-bold text-[#197945]">{fetchingNotes ? "..." : sessionsCount}</span>
                </div>
                <div className="font-semibold text-[#ad8f4e] mt-3 mb-1 text-lg">Самые активные клиенты месяца:</div>
                {fetchingClients || fetchingNotes ? (
                  <div className="text-[#ad965c] italic text-base pl-1 py-0.5">Загрузка...</div>
                ) : topActiveClients.length === 0 ? (
                  <div className="text-[#b0a06e] italic text-base pl-1 py-0.5">Нет данных</div>
                ) : (
                  <ul className="pl-3 list-decimal text-base text-[#7c612d] flex flex-col gap-0.5">
                    {topActiveClients.map((client, idx) => (
                      <li key={client.name + idx} className="ml-2">
                        <span className="font-medium">{client.name}</span>
                        {client.count > 1 ? (
                          <span className="text-[#ac843c] text-[14px] ml-2 font-normal">{client.count} сессии</span>
                        ) : (
                          <span className="text-[#ad9755] text-[14px] ml-2 font-normal">1 сессия</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="default"
                className="w-full rounded-xl py-2 bg-[#e7cf95] text-[#55421c] text-lg font-bold hover:bg-[#ecd69d]"
                style={{ fontFamily: "'Playfair Display', serif" }}
                onClick={() => window.print()}
              >
                Распечатать отчет
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

        {/* --- Блок со статистикой --- */}
        <section aria-label="Статистика клиентов" className="mb-8">
          <div className="flex flex-row gap-5 md:gap-7 lg:gap-10 justify-between items-stretch flex-wrap">
            {/* Всего клиентов */}
            <div className="flex-1 min-w-[150px] max-w-[260px]">
              <div
                className="rounded-[1rem] shadow-md bg-white border border-[#deb76823] px-5 py-4 flex flex-col items-center select-none"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  boxShadow: '0 2px 16px 0 #c7b19818'
                }}
              >
                <span className="text-[15px] text-[#b89238] font-semibold mb-2 tracking-tight">Всего клиентов</span>
                <span className="text-3xl md:text-4xl font-bold text-slate-800 leading-none">{totalClients}</span>
              </div>
            </div>
            {/* В работе */}
            <div className="flex-1 min-w-[150px] max-w-[260px]">
              <div
                className="rounded-[1rem] shadow-md bg-white border border-[#e6c26023] px-5 py-4 flex flex-col items-center select-none"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  boxShadow: '0 2px 16px 0 #f0dfb818'
                }}
              >
                <span className="text-[15px] text-[#d89c0e] font-semibold mb-2 tracking-tight">В работе</span>
                <span className="text-3xl md:text-4xl font-bold text-[#8b6f20] leading-none">{inProgressClients}</span>
              </div>
            </div>
            {/* Сессии на этой неделе */}
            <div className="flex-1 min-w-[150px] max-w-[260px]">
              <div
                className="rounded-[1rem] shadow-md bg-white border border-[#61b38b23] px-5 py-4 flex flex-col items-center select-none"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  boxShadow: '0 2px 16px 0 #c6e8db18'
                }}
              >
                <span className="text-[15px] text-[#22aa65] font-semibold mb-2 tracking-tight">Сессии на этой неделе</span>
                <span className="text-3xl md:text-4xl font-bold text-[#1d9350] leading-none">{sessionsThisWeek}</span>
              </div>
            </div>
          </div>
        </section>
        {/* --- Конец блока статистики --- */}

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
                <textarea
                  className="border rounded px-3 py-2 w-full resize-y min-h-[64px]"
                  placeholder="Главный запрос (можно описать проблему или цель, с которой обратился клиент)"
                  value={addMainRequest}
                  onChange={e => setAddMainRequest(e.target.value)}
                  disabled={addLoading}
                />
                <textarea
                  className="border rounded px-3 py-2 w-full resize-y min-h-[64px]"
                  placeholder="Цели терапии (каких изменений ожидает клиент, задачи, запросы)"
                  value={addTherapyGoals}
                  onChange={e => setAddTherapyGoals(e.target.value)}
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
                <textarea
                  className="border rounded px-3 py-2 w-full resize-y min-h-[64px]"
                  placeholder="Главный запрос (можно описать проблему или цель, с которой обратился клиент)"
                  value={editMainRequest}
                  onChange={e => setEditMainRequest(e.target.value)}
                  disabled={editClientLoading}
                />
                <textarea
                  className="border rounded px-3 py-2 w-full resize-y min-h-[64px]"
                  placeholder="Цели терапии (каких изменений ожидает клиент, задачи, запросы)"
                  value={editTherapyGoals}
                  onChange={e => setEditTherapyGoals(e.target.value)}
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