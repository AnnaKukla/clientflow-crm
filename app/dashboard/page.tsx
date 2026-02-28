"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit2, Archive, Trash } from "lucide-react";

function formatDateHuman(dateStr: string) {
  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "long",
    year: "numeric"
  };
  const date = new Date(dateStr);
  const result = date.toLocaleDateString("ru-RU", options);
  return result.replace(
    /(\d{2}) (\p{L}+)( \d{4})/u,
    (_, d, m, y) =>
      `${d} ${m.charAt(0).toLowerCase()}${m.slice(1)}${y}`
  );
}

const cardStyle = {
  fontFamily: "var(--font-playfair),serif",
  background: "oklch(0.98 0.017 87)",
  border: "1.5px solid oklch(0.85 0.015 85)",
  borderRadius: "22px",
  boxShadow: "0 2px 9px 0 oklch(0.81 0.015 81 / 0.11)",
};

export default function DashboardPage() {
  const router = useRouter();

  // --- States for clients, search, tabs ---
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    sessions: 0
  });

  // --- For "План на сегодня" ---
  const [nextSession, setNextSession] = useState<any>(null);

  // --- Загрузка клиентов и статистики ---
  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // Клиенты
      let { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (clientsError) clientsData = [];

      setClients(clientsData || []);

      // Статистика
      const total = clientsData ? clientsData.length : 0;
      const inProgress = clientsData
        ? clientsData.filter((cl: any) => cl.status === "В работе").length
        : 0;

      // Количество сессий за эту неделю
      let weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (weekStart.getDay() === 0 ? 6 : weekStart.getDay() - 1));
      weekStart.setHours(0,0,0,0);

      let { data: weekNotes } = await supabase
        .from("notes")
        .select("id, date")
        .gte("date", weekStart.toISOString().slice(0, 10));

      const sessionCount = weekNotes ? weekNotes.length : 0;

      setStats({ total, inProgress, sessions: sessionCount });

      setLoading(false);
    }
    fetchData();
  }, []);

  // --- Поиск ближайшей сессии на сегодня для счетчика ---
  useEffect(() => {
    async function fetchNearestSession() {
      let today = new Date();
      let tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 0, 0, 0, 0);
      let { data: slots } = await supabase
        .from("calendar")
        .select("*")
        .gte("date", today.toISOString().slice(0, 10))
        .lt("date", tomorrow.toISOString().slice(0, 10));
      if (!slots) {
        setNextSession(null);
        return;
      }
      // Найти ближайшую по времени (еще не началась)
      const now = new Date();
      const upcoming = slots
        .map((slot: any) => ({ ...slot, dateObj: new Date(slot.date) }))
        .filter((slot: any) => slot.dateObj.getTime() > now.getTime())
        .sort((a: any, b: any) => a.dateObj.getTime() - b.dateObj.getTime());
      setNextSession(upcoming[0] || null);
    }
    fetchNearestSession();
  }, []);

  // --- Search and tabs ---
  const filteredClients = useMemo(() => {
    return clients
      .filter(cl => (activeTab === "active" ? !cl.archived : cl.archived))
      .filter(cl =>
        [cl.name, cl.email, cl.phone]
          .filter(Boolean)
          .some(field => field.toLowerCase().includes(search.toLowerCase()))
      );
  }, [clients, search, activeTab]);

  // --- Client actions ---
  async function handleArchiveClient(id: string, archive: boolean) {
    await supabase
      .from("clients")
      .update({ archived: archive })
      .eq("id", id);
    setClients(cs =>
      cs.map(cl => cl.id === id ? { ...cl, archived: archive } : cl)
    );
  }

  async function handleDeleteClient(id: string) {
    if (!confirm("Удалить клиента?")) return;
    await supabase.from("clients").delete().eq("id", id);
    setClients(cs => cs.filter(cl => cl.id !== id));
  }

  function handleTab(tab: string) {
    setActiveTab(tab === "active" ? "active" : "archived");
  }

  // --- Счетчик до сессии (только дата и клиент, без таймера) ---
  function NextSessionBrief() {
    if (!nextSession) return (
      <div className="text-muted-foreground text-sm mt-2">Нет ближайшей записи на сегодня</div>
    );
    return (
      <div className="rounded-xl bg-[oklch(0.97_0.012_96)] border px-4 py-3 font-serif text-base flex flex-col gap-1 shadow"
        style={{fontFamily: "var(--font-playfair),serif", marginBottom: 10, maxWidth: 390}}
      >
        <div className="font-semibold mb-1">
          Следующая встреча: {nextSession?.date ? new Date(nextSession.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ""}
        </div>
        <div className="text-sm text-muted-foreground">
          {nextSession?.client_name ? nextSession.client_name : "Без имени"}
          {nextSession?.title ? `, ${nextSession.title}` : ""}
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto py-8 px-4" style={{fontFamily:"var(--font-playfair),serif"}}>
      {/* Верхний блок управления */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="text-2xl font-serif font-semibold mb-2 md:mb-0" style={{letterSpacing:"0.02em"}}>
          Мои клиенты
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button
            variant="outline"
            style={{
              fontFamily:"var(--font-playfair),serif",
              letterSpacing:"0.01em",
              border: "1.5px solid oklch(0.86 0.018 82)",
              background: "oklch(0.99 0.013 90)",
              borderRadius: "14px"
            }}
            onClick={() => router.push("/dashboard/client/new")}
          >
            + Добавить клиента
          </Button>
          <Button
            variant="outline"
            style={{
              fontFamily:"var(--font-playfair),serif",
              letterSpacing:"0.01em",
              border: "1.5px solid oklch(0.86 0.018 82)",
              background: "oklch(0.99 0.013 90)",
              borderRadius: "14px"
            }}
            onClick={() => router.push("/dashboard/report")}
          >
            Отчет за месяц
          </Button>
        </div>
      </div>

      {/* Статистика и план на сегодня */}
      <section className="mb-10" style={{fontFamily: "var(--font-playfair),serif"}}>
        <div className="flex flex-col md:flex-row md:gap-8 gap-6 items-stretch">
          <div className="flex-1 min-w-[210px] max-w-md">
            <div className="font-serif font-semibold text-xl mb-2 text-[oklch(0.29_0.14_100)]" style={{letterSpacing: ".03em"}}>
              План на сегодня
            </div>
            <NextSessionBrief />
          </div>
          <div className="flex flex-1 gap-5 flex-col sm:flex-row">
            <Card
              className="min-w-[140px] flex-1 py-4 px-6 border-2 border-[oklch(0.85_0.015_85)] bg-[oklch(0.98_0.017_87)] text-center shadow-md"
              style={cardStyle}
            >
              <div className="text-[oklch(0.28_0.13_130)] text-sm mb-2">Клиентов всего</div>
              <div className="text-3xl font-bold font-serif tracking-wide">{stats.total}</div>
            </Card>
            <Card
              className="min-w-[140px] flex-1 py-4 px-6 border-2 border-[oklch(0.80_0.019_109)] bg-[oklch(0.98_0.017_87)] text-center shadow-md"
              style={cardStyle}
            >
              <div className="text-[oklch(0.23_0.17_120)] text-sm mb-2">В работе</div>
              <div className="text-3xl font-bold font-serif tracking-wide">{stats.inProgress}</div>
            </Card>
            <Card
              className="min-w-[140px] flex-1 py-4 px-7 border-2 border-[oklch(0.82_0.01_110)] bg-[oklch(0.98_0.017_87)] text-center shadow-md"
              style={cardStyle}
            >
              <div className="text-[oklch(0.27_0.12_124)] text-sm mb-2">Сессий на неделе</div>
              <div className="text-3xl font-bold font-serif tracking-wide">{stats.sessions}</div>
            </Card>
          </div>
        </div>
      </section>

      {/* Фильтры и поиск */}
      <div className="flex items-center gap-4 mb-4">
        <Tabs
          value={activeTab}
          onValueChange={handleTab}
          className="font-serif"
        >
          <TabsList className="rounded-xl gap-1 bg-[oklch(0.95_0.012_90)] border-2 border-[oklch(0.87_0.012_83)]">
            <TabsTrigger
              value="active"
              className={activeTab === "active" ? "bg-[oklch(0.92_0.017_80)] text-primary" : ""}
              style={{fontFamily:"var(--font-playfair),serif"}}
            >
              Активные
            </TabsTrigger>
            <TabsTrigger
              value="archived"
              className={activeTab === "archived" ? "bg-[oklch(0.91_0.015_85)] text-primary" : ""}
              style={{fontFamily:"var(--font-playfair),serif"}}
            >
              Архив
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          placeholder="Поиск клиента..."
          className="rounded-lg px-3 h-9 w-[180px] border border-[oklch(0.84_0.012_85)] bg-[oklch(0.99_0.012_90)] font-serif"
          style={{fontFamily:"var(--font-playfair),serif", fontSize:"1rem"}}
          value={search}
          onChange={e => setSearch(e.target.value)}
          type="text"
          autoComplete="off"
        />
      </div>

      {/* Таблица клиентов */}
      <Card
        className="border-2 border-[oklch(0.85_0.015_85)] mx-auto rounded-[22px] shadow-md bg-[oklch(0.98_0.017_87)]"
        style={cardStyle}
      >
        <CardHeader>
          <CardTitle
            className="font-serif text-xl text-primary mb-0"
            style={{fontFamily:"var(--font-playfair),serif",letterSpacing:"0.02em"}}
          >
            Список клиентов
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto font-serif rounded-xl">
            <table className="min-w-full table-auto text-base font-serif" style={{fontFamily:"var(--font-playfair),serif"}}>
              <thead className="bg-[oklch(0.96_0.012_88)]">
                <tr className="text-[oklch(0.26_0.12_130)] text-sm">
                  <th className="py-2 px-3 font-normal text-left">Имя</th>
                  <th className="py-2 px-3 font-normal text-left">E-mail</th>
                  <th className="py-2 px-3 font-normal text-left">Телефон</th>
                  <th className="py-2 px-3 font-normal text-left">Статус</th>
                  <th className="py-2 px-3 font-normal text-left">Дата</th>
                  <th className="py-2 px-3 font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {!loading && filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                      Нет клиентов.
                    </td>
                  </tr>
                )}
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-[oklch(0.31_0.13_140)]">
                      Загрузка...
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client: any) => (
                    <tr key={client.id} className="border-b border-[oklch(0.92_0.017_80)] last:border-b-0">
                      <td className="py-2 px-3 font-semibold">{client.name}</td>
                      <td className="py-2 px-3">{client.email || <span className="text-gray-300">—</span>}</td>
                      <td className="py-2 px-3">{client.phone || <span className="text-gray-300">—</span>}</td>
                      <td className="py-2 px-3">
                        {client.status === "В работе" ? (
                          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 font-medium">В работе</Badge>
                        ) : client.status === "Новый" ? (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200 font-medium">Новый</Badge>
                        ) : (
                          <Badge>{client.status}</Badge>
                        )}
                      </td>
                      <td className="py-2 px-3">{formatDateHuman(client.created_at)}</td>
                      <td className="py-2 px-3">
                        <div className="flex gap-2 items-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-full p-2 hover:bg-[oklch(0.9_0.014_85)]"
                            title="Открыть"
                            onClick={() => router.push(`/dashboard/client/${client.id}`)}
                          >
                            <Eye size={19} className="text-[oklch(0.35_0.18_130)]" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-full p-2 hover:bg-[oklch(0.9_0.014_85)]"
                            title="Редактировать"
                            onClick={() => router.push(`/dashboard/client/${client.id}/edit`)}
                          >
                            <Edit2 size={19} className="text-[oklch(0.33_0.14_97)]" />
                          </Button>
                          {activeTab === "active" ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="rounded-full p-2 hover:bg-[oklch(0.91_0.013_80)]"
                              title="В архив"
                              onClick={() => handleArchiveClient(client.id, true)}
                            >
                              <Archive size={19} className="text-[oklch(0.22_0.14_90)]" />
                            </Button>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="rounded-full p-2 hover:bg-[oklch(0.91_0.011_132)]"
                              title="Вернуть из архива"
                              onClick={() => handleArchiveClient(client.id, false)}
                            >
                              <Archive size={19} className="text-green-600" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-full p-2 hover:bg-[oklch(0.99_0.065_34)]"
                            title="Удалить"
                            onClick={() => handleDeleteClient(client.id)}
                          >
                            <Trash size={18} className="text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}