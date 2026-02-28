"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Edit2, Archive, Trash, Heart, BookOpen, Hourglass } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

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

// Цвета и шрифты
const cardStyle = {
  fontFamily: "var(--font-playfair),serif",
  background: "oklch(0.98 0.017 87)",
  border: "1.5px solid oklch(0.85 0.015 85)",
  borderRadius: "22px",
  boxShadow: "0 2px 9px 0 oklch(0.81 0.015 81 / 0.11)",
};

const quoteList = [
  {
    content: "Только тот, кто предпринимает абсурдные попытки, сможет достичь невозможного.",
    author: "Альберт Эйнштейн"
  },
  {
    content: "Будь собой. Прочие роли уже заняты.",
    author: "Оскар Уайльд"
  },
  {
    content: "Жизнь измеряется не количеством вдохов, а моментами, когда захватывает дух.",
    author: "Майя Энджелоу"
  },
  {
    content: "Даже путь в тысячу ли начинается с первого шага.",
    author: "Лао-цзы"
  },
  {
    content: "Трудности — это то, что делает успех вкуснее.",
    author: "Мишель Обама"
  }
];

// --- Вспомог: Винтажный тултип для recharts
function VintageTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div style={{
      background: "oklch(0.99 0.017 96)",
      border: "1px solid oklch(0.86 0.018 82)",
      borderRadius: "13px",
      fontFamily: "var(--font-playfair),serif",
      padding: "10px 18px",
      color: "oklch(0.29 0.15 90)",
      boxShadow: "0 2px 8px oklch(0.85 0.017 61 / 10%)",
      fontSize: "1.07rem"
    }}>
      <div style={{ color: "oklch(0.37 0.13 137)", fontWeight: 600 }}>{label}</div>
      <div style={{ marginTop: 2, color: "oklch(0.29 0.14 66)" }}>
        Доход: <span style={{ fontWeight: 700 }}>{payload[0].value} ₽</span>
      </div>
    </div>
  );
}

// --- Тихий таймер сессии для психолога ---
function formatTimer(sec: number) {
  const mm = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const ss = (sec % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function DashboardPage() {
  const router = useRouter();

  // --- States for clients, search, etc. ---
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [loading, setLoading] = useState(true);

  // --- Stats ---
  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    sessions: 0
  });

  // --- Сессии (даты, суммы, всё для графиков и счетчика) ---
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [calendarSessions, setCalendarSessions] = useState<any[]>([]); // Для прогноза на месяц
  const [incomeByWeek, setIncomeByWeek] = useState<any[]>([]);
  const [avgPrice, setAvgPrice] = useState<number>(0);
  const [predictedMonthIncome, setPredictedMonthIncome] = useState<number>(0);

  // --- "До сессии" ---
  const [nextSession, setNextSession] = useState<any>(null);
  const [timeToNext, setTimeToNext] = useState<number | null>(null);

  // --- Quote states ---
  const [currentQuote, setCurrentQuote] = useState<{content: string, author: string} | null>(null);
  const [quoteLiked, setQuoteLiked] = useState(false);
  const [toastText, setToastText] = useState("");
  const [showToast, setShowToast] = useState(false);

  // --- Saved Quotes Modal ---
  const [showDiary, setShowDiary] = useState(false);
  const [favoriteQuotes, setFavoriteQuotes] = useState<{content: string, author: string, id: number}[]>([]);
  const [loadingDiary, setLoadingDiary] = useState(false);

  // --- Privacy Mode ---
  const [privacyMode, setPrivacyMode] = useState(false);

  // --- Тихий таймер сессии ---
  const DEFAULT_TIMER = 3000; // 50 минут = 3000 секунд
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIMER);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!isActive) return;
    if (timeLeft <= 0) {
      setIsActive(false);
      setTimeLeft(0);
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev > 0) return prev - 1;
        else return 0;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleToggleTimer = () => {
    setIsActive(prev => !prev);
  };

  const handleResetTimer = () => {
    setTimeLeft(DEFAULT_TIMER);
    setIsActive(false);
  };

  // --- END Тихий таймер ---

  const handleTogglePrivacy = () => {
    setPrivacyMode(prev => {
      const next = !prev;
      if (next) showUserToast("Приватный режим включен");
      return next;
    });
  };

  // --- Helpers ---
  function showUserToast(text: string) {
    setToastText(text);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  }

  // --- Загрузка клиентов и статистики, сессий и календаря ---
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

      // Количество сессий — общая статистика
      let { data: allNotes, error: nerr } = await supabase
        .from("notes")
        .select("id");
      const sessionCount = allNotes ? allNotes.length : 0;

      setStats({ total, inProgress, sessions: sessionCount });

      // --- Доход за последние 4 недели (stats for BarChart) ---
      let since = new Date();
      since.setDate(since.getDate() - 28);
      let { data: notes, error: errN } = await supabase
        .from("notes")
        .select("date,price") // поле price = стоимость сессии
        .gte("date", since.toISOString().slice(0,10));
      // Сгруппировать по неделям (понедельник вс. воскресенье)
      const grouped: { [w: string]: number } = {};
      const weeks: string[] = [];
      if (notes) {
        notes.forEach((n: any) => {
          const d = new Date(n.date);
          // Номер недели относительно сейчас
          const now = new Date();
          const weekIdx =
            Math.floor(
              (now.getTime() -
                new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime() -
                (d.getTime() -
                  new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay()).getTime())
              ) / (7 * 24 * 60 * 60 * 1000)
            );
          // Например: "неделя -3", "неделя -2", "неделя -1", "неделя 0"
          const monday = new Date(d);
          monday.setDate(monday.getDate() - (monday.getDay() === 0 ? 6 : monday.getDay() - 1));
          const weekStr = `${monday.getDate().toString().padStart(2, '0')}.${(monday.getMonth() + 1)
            .toString()
            .padStart(2, '0')}`;
          if (!grouped[weekStr]) grouped[weekStr] = 0;
          grouped[weekStr] += n.price || 0;
        });
        // Составить массив по порядку (последние 4 недели)
        let weeksArr: any[] = [];
        const now = new Date();
        for (let i = 3; i >= 0; i--) {
          let monday = new Date(now);
          monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1) - 7 * i);
          const weekStr = `${monday.getDate().toString().padStart(2, '0')}.${(monday.getMonth() + 1)
            .toString()
            .padStart(2, '0')}`;
          weeksArr.push({
            week: weekStr,
            income: grouped[weekStr] ?? 0,
          });
        }
        setIncomeByWeek(weeksArr);
        setRecentSessions(notes);
      }

      // --- Подгружаем записи календаря на текущий месяц для прогноза ---
      let monthStart = new Date();
      monthStart.setDate(1);
      let monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthStart.getMonth() + 1, 0);
      let { data: calendarData } = await supabase
        .from("calendar")
        .select("date, price")
        .gte("date", monthStart.toISOString().slice(0, 10))
        .lte("date", monthEnd.toISOString().slice(0, 10));
      setCalendarSessions(calendarData || []);

      // Средняя стоимость сессии (по notes)
      if (notes && notes.length > 0) {
        const totalSum = notes.reduce((acc, n) => acc + (typeof n.price === "number" ? n.price : 0), 0);
        const avg =
          notes.length > 0 ? Math.round(totalSum / notes.length) : 0;
        setAvgPrice(avg);
      }

      setLoading(false);
    }
    fetchData();
  }, []);

  // --- Прогноз на месяц по среднему чеку ---
  useEffect(() => {
    if (calendarSessions.length && avgPrice) {
      setPredictedMonthIncome(calendarSessions.length * avgPrice);
    } else {
      setPredictedMonthIncome(0);
    }
  }, [calendarSessions, avgPrice]);

  // --- Поиск ближайшей сессии на сегодня (по календарю) для счетчика ---
  useEffect(() => {
    async function fetchNearestSession() {
      // Calendar table, время в формате date+время (ISO 8601) или как хранится в вашей таблице
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

  // --- Таймер для счетчика "До сессии" ---
  useEffect(() => {
    let timer: any;
    function update() {
      if (!nextSession?.date) {
        setTimeToNext(null);
        return;
      }
      const now = new Date();
      const sessionTime = new Date(nextSession.date);
      const mins = Math.round((sessionTime.getTime() - now.getTime()) / 60000);
      setTimeToNext(mins > 0 ? mins : 0);
    }
    update();
    timer = setInterval(update, 1000 * 20); // обновлять каждую 20 секунд
    return () => clearInterval(timer);
  }, [nextSession]);

  // --- Quote of the Day ---
  useEffect(() => {
    // Select random quote once at mount
    const idx = Math.floor(Math.random() * quoteList.length);
    setCurrentQuote(quoteList[idx]);
    setQuoteLiked(false);
  }, []);

  // --- Load Diary if opened ---
  useEffect(() => {
    if (showDiary) {
      setLoadingDiary(true);
      supabase
        .from("favorite_quotes")
        .select("*")
        .order("id", { ascending: false })
        .then(({ data, error }) => {
          if (!error && data) {
            setFavoriteQuotes(data);
          } else {
            setFavoriteQuotes([]);
          }
          setLoadingDiary(false);
        });
    }
  }, [showDiary]);

  // --- Diary Delete Handler ---
  async function handleDeleteQuote(id: number) {
    setLoadingDiary(true);
    const { error } = await supabase
      .from("favorite_quotes")
      .delete()
      .eq("id", id);

    if (!error) {
      setFavoriteQuotes(favoriteQuotes => favoriteQuotes.filter(q => q.id !== id));
      showUserToast("Цитата удалена.");
    } else {
      showUserToast("Ошибка удаления.");
    }
    setLoadingDiary(false);
  }

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

  // --- Handlers ---
  async function handleSaveQuote() {
    if (!currentQuote) return;
    setQuoteLiked(true);
    // Insert into Supabase
    const { error } = await supabase
      .from("favorite_quotes")
      .insert({
        content: currentQuote.content,
        author: currentQuote.author
      });
    if (!error) {
      showUserToast("Сохранено в дневник!");
    } else {
      showUserToast("Ошибка сохранения.");
      setQuoteLiked(false);
    }
  }

  async function handleArchiveClient(id: string, archive: boolean) {
    await supabase
      .from("clients")
      .update({ archived: archive })
      .eq("id", id);
    setClients(cs =>
      cs.map(cl => cl.id === id ? { ...cl, archived: archive } : cl)
    );
    showUserToast(archive ? "Клиент отправлен в архив." : "Клиент возвращён.");
  }

  async function handleDeleteClient(id: string) {
    if (!confirm("Удалить клиента?")) return;
    await supabase.from("clients").delete().eq("id", id);
    setClients(cs => cs.filter(cl => cl.id !== id));
    showUserToast("Клиент удалён.");
  }

  function handleTab(tab: string) {
    setActiveTab(tab === "active" ? "active" : "archived");
  }

  // [Optionally] Toast component
  function Toast({ message, show }: { message: string; show: boolean }) {
    return (
      <div
        className={`fixed bottom-7 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-[oklch(0.85_0.03_75)] shadow-lg text-primary font-semibold transition-all duration-400 ${
          show
            ? "opacity-100 pointer-events-auto scale-100"
            : "opacity-0 pointer-events-none scale-95"
        }`}
        style={{ fontFamily: "var(--font-playfair),serif", letterSpacing: "0.01em" }}
      >
        {message}
      </div>
    );
  }

  // --- ДИАЛОГ-ДНЕВНИК --- //
  function DiaryDialog() {
    // Кастомные классы под стиль старой книги во фрактальном развороте:
    // (soft cream bg, "тени по краям", изгиб центра; на мобилке: скругление, на пк: две "страницы")
    return (
      <div
        className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(85,74,56,0.22)] backdrop-blur-[2px]"
        style={{ fontFamily: "var(--font-playfair),serif" }}
      >
        {/* Центр книги */}
        <div
          className="relative max-w-2xl w-full px-0 md:px-1"
        >
          {/* book shadow L/R */}
          <div className="absolute left-0 top-0 h-full w-10 md:w-16 bg-gradient-to-r from-[rgba(90,75,45,0.15)] via-transparent to-transparent pointer-events-none rounded-s-[40px] z-10" />
          <div className="absolute right-0 top-0 h-full w-10 md:w-16 bg-gradient-to-l from-[rgba(90,75,45,0.14)] via-transparent to-transparent pointer-events-none rounded-e-[40px] z-10" />
          {/* center crease */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-full bg-gradient-to-b from-[oklch(0.90_0.02_91)]/60 via-transparent to-[oklch(0.84_0.01_75)]/60 z-20 pointer-events-none"></div>
          {/* страницы книги */}
          <div
            className="relative flex flex-col md:flex-row bg-gradient-to-b from-[oklch(0.99_0.017_96)] via-[oklch(0.98_0.017_87)] to-[oklch(0.96_0.01_88)] border-2 border-[oklch(0.85_0.013_85)] shadow-xl rounded-2xl md:rounded-[32px] md:overflow-hidden py-8 px-6 md:py-12 md:px-16"
            style={{
              minHeight: 340,
              boxShadow: "0 8px 38px 0 oklch(0.71 0.016 60 / 8%), 0 1.5px 0px 0px oklch(0.85 0.017 80 / 12%)"
            }}
          >
            {/* Кнопка закрытия */}
            <button
              className="absolute top-3 right-4 z-30 text-[oklch(0.31_0.13_140)] hover:underline text-xl"
              onClick={() => setShowDiary(false)}
              title="Закрыть дневник"
            >
              ✕
            </button>
            {/* Новый заголовок "Дневник вдохновения" по центру в одну строку */}
            <div className="w-full flex justify-center items-center absolute left-1/2 -translate-x-1/2 -top-5">
              <BookOpen className="mr-2 text-[oklch(0.34_0.18_130)]" size={26}/>
              <span
                className="text-2xl font-serif font-semibold text-center select-none"
                style={{
                  fontFamily: "var(--font-playfair),serif",
                  textShadow: "0 2px 3px oklch(0.92 0.012 83 / 45%)"
                }}
              >
                Дневник вдохновения
              </span>
            </div>
            {/* Список сохранённых цитат */}
            <div className="flex-1 w-full flex flex-col gap-2 mt-12 md:mt-10">
              {loadingDiary ? (
                <div className="py-20 text-center text-[oklch(0.31_0.13_140)] text-lg">Загрузка...</div>
              ) : favoriteQuotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[220px] md:min-h-[320px] px-2 text-center">
                  <span
                    className="text-[1.15rem] md:text-xl italic tracking-wide text-[oklch(0.30_0.15_100)]"
                    style={{fontFamily: "var(--font-playfair),serif"}}
                  >
                    Здесь будут храниться мысли, которые коснулись твоего сердца
                  </span>
                </div>
              ) : (
                <ul className="space-y-6 max-h-[500px] overflow-y-auto pb-1 pr-2 md:pr-4 mt-2">
                  {favoriteQuotes.map(q => (
                    <li
                      key={q.id}
                      className="relative rounded-2xl border-2 border-[oklch(0.75_0.018_77)] bg-gradient-to-br from-[oklch(0.97_0.01_94)] to-[oklch(0.94_0.01_89)] shadow-lg group transition hover:shadow-2xl p-6"
                      style={{
                        fontFamily: "var(--font-playfair),serif",
                        boxShadow: "0 2.5px 22px 0 oklch(0.76 0.018 70 / 16%)"
                      }}
                    >
                      {/* Delete button */}
                      <button
                        className="absolute top-3 right-3 p-1.5 rounded-full opacity-60 hover:opacity-100 hover:bg-red-50 transition z-20"
                        title="Удалить цитату"
                        onClick={() => handleDeleteQuote(q.id)}
                        aria-label="Удалить из дневника"
                        disabled={loadingDiary}
                      >
                        <Trash className="text-red-400" size={20}/>
                      </button>
                      <blockquote
                        className="text-lg md:text-xl italic font-normal text-[oklch(0.32_0.16_85)] leading-snug select-text"
                        style={{
                          fontFamily: "var(--font-playfair),serif",
                          fontStyle: "italic",
                          fontSize: "1.22rem"
                        }}
                      >
                        “{q.content}”
                      </blockquote>
                      <div
                        className="mt-3 text-right text-sm md:text-base text-[oklch(0.30_0.17_56)] font-serif font-semibold not-italic"
                        style={{
                          fontFamily: "Georgia,serif",
                          fontStyle: "normal",
                          letterSpacing: "0.015em"
                        }}
                      >
                        — {q.author}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Счетчик до сессии ---
  function NextSessionCounter() {
    if (!nextSession || typeof timeToNext !== "number") return null;
    // "Если до сессии меньше 15 минут — пусть текст становится пульсирующим и зеленым."
    const pulse =
      timeToNext < 15
        ? "animate-pulse text-green-700"
        : "text-[oklch(0.31_0.13_140)]";
    return (
      <div
        className="rounded-xl bg-[oklch(0.95_0.012_95)] border-2 border-[oklch(0.83_0.012_90)] px-4 py-3 font-serif text-lg flex items-center gap-2 shadow"
        style={{
          fontFamily: "var(--font-playfair),serif",
          marginBottom: 12,
          boxShadow: "0 2px 10px 0 oklch(0.85 0.017 80 / 7%)",
          maxWidth: 390,
        }}
      >
        <span className={pulse} style={{ fontWeight: 700 }}>
          Следующая встреча через&nbsp;
          {timeToNext} мин
        </span>
        <span className="ml-2 text-[oklch(0.29_0.14_90)] text-sm">
          (<span>
            {nextSession?.client_name
              ? nextSession.client_name
              : "без имени"}
            {nextSession?.title ? `, ${nextSession.title}` : ""}
          </span>)
        </span>
      </div>
    );
  }

  // --- Тихий таймер UI ---
  function SilentTimer() {
    // Увядание и грациозность — через прозрачность, Playfair, мини-крестик сброса
    return (
      <div
        className="flex items-center ml-4"
        style={{ userSelect: "none" }}
        title="Тихий таймер сессии"
      >
        <button
          type="button"
          onClick={handleToggleTimer}
          className={`
            rounded-full border transition
            bg-[oklch(0.96_0.012_92)]
            border-[oklch(0.89_0.012_84)]
            hover:bg-[oklch(0.97_0.01_94)]
            active:bg-[oklch(0.95_0.01_87)]
            shadow-none flex items-center justify-center
            p-1.5 mr-2 opacity-85
            focus:outline-none
            duration-200
          `}
          style={{
            boxShadow: "0 1px 3px oklch(0.90 0.01 88 / 6%)",
            fontFamily: "var(--font-playfair),serif",
            minWidth: 32,
            minHeight: 32,
            height: 32,
            width: 32,
          }}
          aria-label={
            isActive ? "Пауза таймера сессии" : "Запустить таймер сессии"
          }
        >
          <Hourglass
            size={19}
            className={`${
              isActive ? "text-[oklch(0.22_0.14_133)]" : "text-[oklch(0.27_0.14_82)]"
            }`}
            style={{
              opacity: isActive ? 0.96 : 0.68,
              transition: "color .28s, opacity .28s"
            }}
          />
        </button>
        <span
          className="text-muted-foreground px-2 select-none"
          style={{
            fontFamily: "var(--font-playfair),serif",
            fontSize: "1.04rem",
            opacity: "0.62",
            letterSpacing: ".02em",
            minWidth: 56,
            fontWeight: 500
          }}
        >
          {formatTimer(timeLeft)}
        </span>
        <button
          type="button"
          onClick={handleResetTimer}
          aria-label="Сбросить таймер"
          className={`
            p-0 ml-1 opacity-65 hover:opacity-95
            focus:outline-none text-[oklch(0.42_0.18_121)]
            transition rounded-full w-6 h-6 flex items-center justify-center
            bg-transparent border-none
          `}
          style={{
            fontSize: 17,
            fontFamily: "var(--font-playfair),serif",
            lineHeight: 1,
          }}
        >
          <span style={{fontWeight: "bold"}}>&times;</span>
        </button>
      </div>
    );
  }

  // --- Main Render ---
  return (
    <>
      {/* Цитата дня */}
      <main className="max-w-6xl mx-auto py-8 px-4" style={{fontFamily:"var(--font-playfair),serif"}}>
        <div className="mb-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div
            className="bg-[oklch(0.98_0.017_87)] border-[oklch(0.87_0.026_83)] border-2 rounded-2xl px-7 py-5 shadow-md flex flex-col sm:flex-row sm:items-center gap-5 flex-1 min-w-[260px]"
            style={{fontFamily:"var(--font-playfair),serif", maxWidth: "480px"}}
          >
            <div className="flex-1">
              <div className="text-[1.25rem] text-[oklch(0.26_0.12_130)] font-serif mb-1 select-none" style={{letterSpacing:"0.02em"}}>
                <span className="opacity-60">✨ Цитата дня</span>
              </div>
              {currentQuote && (
                <>
                  <div className="text-xl font-semibold font-serif leading-tight mb-1" style={{letterSpacing:"0.01em"}}>
                    “{currentQuote.content}”
                  </div>
                  <div className="text-[1rem] mt-1 text-right text-[oklch(0.27_0.11_120)] italic">— {currentQuote.author}</div>
                </>
              )}
            </div>
            <div className="flex flex-col items-center ml-2">
              <Button
                variant="ghost"
                className={`rounded-full p-2 transition border ${
                  quoteLiked
                    ? "bg-red-200 border-red-300"
                    : "bg-[oklch(0.98_0.017_87)] border-[oklch(0.86_0.018_82)]"
                }`}
                aria-label="Сохранить цитату"
                onClick={handleSaveQuote}
                disabled={quoteLiked}
                style={{ display: "inline-flex", alignItems: "center" }}
              >
                {quoteLiked ? (
                  <Heart className="text-red-500 fill-red-500" size={26} />
                ) : (
                  <Heart className="text-red-400" size={26} />
                )}
              </Button>
              <button
                className="mt-3 text-[oklch(0.31_0.13_140)] underline text-sm hover:text-[oklch(0.36_0.14_145)]"
                style={{fontFamily:"var(--font-playfair),serif"}}
                onClick={() => setShowDiary(true)}
              >
                <BookOpen className="inline-block mr-1 mb-1" size={18} />
                Дневник вдохновения
              </button>
            </div>
          </div>

          {/* Быстрое меню */}
          <div className="flex gap-3 sm:gap-5 flex-wrap pt-2">
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
              onClick={() => router.push("/dashboard/services")}
            >
              Мои услуги
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

        {/** ==== ПРО СЕССИИ/КАЛЕНДАРЬ: План на сегодня / счетчик ==== */}
        <section className="mb-7" style={{fontFamily: "var(--font-playfair),serif"}}>
          <div className="flex flex-col md:flex-row md:gap-8 gap-3 items-start">
            <div>
              <div className="font-serif font-semibold text-xl mb-1 text-[oklch(0.29_0.14_100)]" style={{letterSpacing: ".03em"}}>
                План на сегодня
              </div>
              <NextSessionCounter />
              {/* Можно добавить еще выдачу заметок календаря сегодняшнего дня */}
            </div>

            <div>
              <Card
                style={{
                  ...cardStyle,
                  minWidth: 260,
                  marginTop: 2,
                  marginBottom: 2,
                  fontSize: "1.12rem",
                  background: "oklch(0.99 0.02 95)",
                  borderColor: "oklch(0.82 0.012 80)",
                  boxShadow: "0 2px 15px 0 oklch(0.81 0.015 81 / 0.09)",
                }}
              >
                <CardHeader>
                  <div
                    className="text-base mb-0 font-semibold text-[oklch(0.22_0.14_133)]"
                    style={{fontFamily:"var(--font-playfair),serif"}}
                  >
                    Прогноз на месяц
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-semibold text-[oklch(0.29_0.16_85)]" style={{fontSize: "1.08rem"}}>
                    {calendarSessions.length
                      ? <>
                          На&nbsp;
                          <span style={{fontWeight:700,color:"oklch(0.37_0.13_137)"}}>
                            {calendarSessions.length}
                          </span>{" "}
                          сессий &times;&nbsp;{avgPrice}₽:<br />
                          <span
                            style={{
                              fontWeight: 700,
                              color: "oklch(0.21 0.16 70)",
                              fontSize: "1.28em",
                              textShadow: "0 1.5px 10px oklch(0.97 0.05 80 / 14%)"
                            }}
                          >
                            ≈ {predictedMonthIncome} ₽
                          </span>
                        </>
                      : "Нет записей на месяц"
                    }
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Статистика БЛОК */}
        <div className={`flex gap-7 mb-10 flex-wrap ${privacyMode ? 'backdrop-blur-md' : ''}`}>
          <Card
            className="min-w-[170px] flex-1 py-4 px-6 border-2 border-[oklch(0.85_0.015_85)] bg-[oklch(0.98_0.017_87)] text-center shadow-md"
            style={cardStyle}
          >
            <div className="text-[oklch(0.28_0.13_130)] text-sm mb-2">Клиентов всего</div>
            <div className="text-3xl font-bold font-serif tracking-wide">{stats.total}</div>
          </Card>
          <Card
            className="min-w-[170px] flex-1 py-4 px-6 border-2 border-[oklch(0.80_0.019_109)] bg-[oklch(0.98_0.017_87)] text-center shadow-md"
            style={cardStyle}
          >
            <div className="text-[oklch(0.23_0.17_120)] text-sm mb-2">В работе</div>
            <div className="text-3xl font-bold font-serif tracking-wide">{stats.inProgress}</div>
          </Card>
          <Card
            className="min-w-[170px] flex-1 py-4 px-7 border-2 border-[oklch(0.82_0.01_110)] bg-[oklch(0.98_0.017_87)] text-center shadow-md"
            style={cardStyle}
          >
            <div className="text-[oklch(0.27_0.12_124)] text-sm mb-2">Сессий всего</div>
            <div className="text-3xl font-bold font-serif tracking-wide">{stats.sessions}</div>
          </Card>
        </div>

        {/* График дохода последних 4 недель */}
        <div
          className="mb-8 mt-4 bg-[oklch(0.98_0.018_93)] rounded-2xl border-2 border-[oklch(0.85_0.018_85)] py-5 px-6 shadow font-serif"
          style={{
            fontFamily: "var(--font-playfair),serif",
            boxShadow: "0 2px 12px 0 oklch(0.86 0.013 88 / 7%)",
            maxWidth: 520,
            marginLeft: "auto",
            marginRight: "auto"
          }}
        >
          <div
            className="mb-1 text-xl font-semibold font-serif text-[oklch(0.22_0.14_130)]"
            style={{letterSpacing: ".02em"}}
          >
            Доход по неделям
          </div>
          <div style={{width:"100%", height: 190, minHeight: 115}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeByWeek}>
                <CartesianGrid strokeDasharray="3 2" stroke="oklch(0.87 0.012 83 / 0.64)" />
                <XAxis
                  dataKey="week"
                  tick={{ fontFamily: "var(--font-playfair),serif", fontWeight: 600, fill: "#4d4730", fontSize: 15}}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="oklch(0.86 0.017 66)"
                  tick={{ fontFamily: "var(--font-playfair),serif", fontWeight: 400, fill: "#7a7058", fontSize: 15}}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<VintageTooltip />} cursor={{ fill: "oklch(0.95 0.04 87 / 0.18)" }} />
                <Bar
                  dataKey="income"
                  fill="oklch(0.44 0.16 73)"
                  radius={[9, 9, 0, 0]}
                  barSize={32}
                  maxBarSize={38}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Таблица клиентов */}
        <Card
          className="border-2 border-[oklch(0.85_0.015_85)] mx-auto rounded-[22px] shadow-md bg-[oklch(0.98_0.017_87)]"
          style={cardStyle}
        >
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div className="flex items-center">
                <CardTitle className="font-serif text-2xl text-primary mb-0 flex items-center" style={{fontFamily:"var(--font-playfair),serif",letterSpacing:"0.03em"}}>
                  Мои клиенты
                  {/* Privacy Mode Button */}
                  <button
                    type="button"
                    aria-label={privacyMode ? "Выключить приватный режим" : "Включить приватный режим"}
                    onClick={handleTogglePrivacy}
                    className={`
                      ml-2
                      rounded-full
                      border
                      shadow-none
                      transition
                      focus:outline-none
                      focus:ring-1
                      focus:ring-[oklch(0.80_0.019_109)]
                      hover:bg-[oklch(0.96_0.012_90)]
                      active:bg-[oklch(0.94_0.012_72)]
                      bg-[oklch(0.96_0.012_92)]
                      border-[oklch(0.89_0.012_84)]
                      p-1.5
                      text-[oklch(0.23_0.16_120)]
                      opacity-80
                      hover:opacity-100
                      duration-200
                      outline-none
                      flex items-center justify-center
                    `}
                    style={{
                      boxShadow: "0 1px 3px oklch(0.90 0.01 88 / 7%)",
                      fontFamily: "var(--font-playfair),serif",
                      minWidth: 32,
                      minHeight: 32,
                      height: 32,
                      width: 32,
                    }}
                    tabIndex={0}
                  >
                    {privacyMode ? (
                      <EyeOff size={18} className="text-[oklch(0.26_0.09_77)]" />
                    ) : (
                      <Eye size={18} className="text-[oklch(0.28_0.12_120)]" />
                    )}
                  </button>
                  {/* Таймер сессии — справа от кнопки режима приватности */}
                  <SilentTimer />
                </CardTitle>
              </div>
              <div className="flex items-center gap-4 mt-1">
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
                  style={{fontFamily:"var(--font-playfair),serif",fontSize:"1rem"}}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  type="text"
                  autoComplete="off"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto font-serif rounded-xl">
              <table className="min-w-full table-auto text-base font-serif" style={{fontFamily:"var(--font-playfair),serif"}}>
                <thead className="bg-[oklch(0.96_0.012_88)]">
                  <tr className="text-[oklch(0.26_0.12_130)] text-sm">
                    <th className="py-2 px-3 font-normal text-left">Имя</th>
                    <th className={`py-2 px-3 font-normal text-left ${privacyMode ? 'backdrop-blur-md' : ''}`}>E-mail</th>
                    <th className={`py-2 px-3 font-normal text-left ${privacyMode ? 'backdrop-blur-md' : ''}`}>Телефон</th>
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
                        <td className="py-2 px-3 font-semibold">{privacyMode ? <span className="blur-sm select-none">••••••••</span> : client.name}</td>
                        <td className={`py-2 px-3 ${privacyMode ? 'backdrop-blur-md' : ''}`}>
                          {privacyMode ? (
                            <span className="blur-sm select-none">••••••••</span>
                          ) : client.email || <span className="text-gray-300">—</span>}
                        </td>
                        <td className={`py-2 px-3 ${privacyMode ? 'backdrop-blur-md' : ''}`}>
                          {privacyMode ? (
                            <span className="blur-sm select-none">••••••••</span>
                          ) : client.phone || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="py-2 px-3">
                          {client.status === "В работе" ? (
                            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 font-medium">В работе</Badge>
                          ) : client.status === "Новый" ? (
                            <Badge className="bg-blue-100 text-blue-700 border-blue-200 font-medium">Новый</Badge>
                          ) : (
                            <Badge>{client.status}</Badge>
                          )}
                        </td>
                        <td className="py-2 px-3">{privacyMode ? <span className="blur-[2px] select-none">••••••••</span> : formatDateHuman(client.created_at)}</td>
                        <td className="py-2 px-3">
                          <div className="flex gap-2 items-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="rounded-full p-2 hover:bg-[oklch(0.9_0.014_85)]"
                              title="Открыть"
                              onClick={() => router.push(`/dashboard/client/${client.id}`)}
                              disabled={privacyMode}
                            >
                              <Eye size={19} className="text-[oklch(0.35_0.18_130)]" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="rounded-full p-2 hover:bg-[oklch(0.9_0.014_85)]"
                              title="Редактировать"
                              onClick={() => router.push(`/dashboard/client/${client.id}/edit`)}
                              disabled={privacyMode}
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
                                disabled={privacyMode}
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
                                disabled={privacyMode}
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
                              disabled={privacyMode}
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
      <Toast message={toastText} show={showToast} />
      {showDiary && <DiaryDialog />}
    </>
  );
}