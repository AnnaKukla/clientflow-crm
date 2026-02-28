'use client';

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Trash } from "lucide-react";

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string | null;
  main_request: string | null;
  therapy_goals: string | null;
};

type Note = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
};

function formatDateHuman(dateStr: string) {
  // "23 февраля 2024"
  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "long",
    year: "numeric"
  };
  const date = new Date(dateStr);
  // Capitalized month
  const result = date.toLocaleDateString("ru-RU", options);
  // Make first letter lowercase for month name (e.g. "февраля")
  return result.replace(
    /(\d{2}) (\p{L}+)( \d{4})/u,
    (_, d, m, y) =>
      `${d} ${m.charAt(0).toLowerCase()}${m.slice(1)}${y}`
  );
}

function formatDateTimeExact(dateStr: string) {
  // "23.02.2024, 14:30"
  const date = new Date(dateStr);
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ClientCardPage() {
  const router = useRouter();
  const params = useParams();
  const id =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : "";

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);

  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const fetchClientAndNotes = async () => {
    setLoading(true);
    setNotesLoading(true);

    // Явно запрашиваем только существующие поля клиента
    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .select(
        "id, name, email, phone, status, main_request, therapy_goals"
      )
      .eq("id", id)
      .maybeSingle();

    if (!clientError && clientData) {
      setClient(clientData as Client);
    } else {
      setClient(null);
    }
    setLoading(false);

    // Запрашиваем заметки
    const { data: notesData } = await supabase
      .from("notes")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false });

    setNotes(notesData || []);
    setNotesLoading(false);
  };

  useEffect(() => {
    if (id) fetchClientAndNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingNote(true);
    setNoteError(null);

    // Получаем user_id из сессии
    const {
      data: { user },
      error: sessionError,
    } = await supabase.auth.getUser();
    if (sessionError || !user) {
      setNoteError("Ошибка получения пользователя.");
      setAddingNote(false);
      return;
    }

    const { error, data } = await supabase
      .from("notes")
      .insert({
        content: newNote,
        client_id: id,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      setNoteError("Ошибка при сохранении заметки.");
    } else if (data) {
      setNotes((prev) => [{ ...data }, ...prev]);
      setNewNote("");
    }
    setAddingNote(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm("Удалить эту заметку? Вернуть её будет нельзя.")) return;
    setDeletingNoteId(noteId);
    await supabase.from("notes").delete().eq("id", noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
    setDeletingNoteId(null);
  };

  // Сортировка - новые заметки сверху (на случай, если с бэка придут неотсортированными)
  const sortedNotes = [...notes].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <main className="max-w-2xl mx-auto py-8 px-4">
      <Button
        variant="outline"
        className="mb-6"
        onClick={() => router.push("/dashboard")}
      >
        &larr; Назад к списку
      </Button>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">
          Загрузка...
        </div>
      ) : !client ? (
        <div className="text-center py-10 text-red-600 font-semibold">
          Клиент не найден
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-6">{client.name}</h1>

          {/* Восстановленный винтажный вид "Запрос" и "Цели терапии" */}
          <div className="flex flex-col gap-5 mb-10">
            <div
              className="rounded-[24px] px-7 py-6"
              style={{
                background: "oklch(0.98 0.017 87)",
                border: "1.5px solid oklch(0.85 0.015 85)",
                boxShadow: "0 2px 9px 0 oklch(0.81 0.015 81 / 0.11)",
              }}
            >
              <div
                className="font-serif text-[1.72rem] leading-tight mb-2 text-primary"
                style={{ fontFamily: "var(--font-playfair),serif" }}
              >
                Запрос
              </div>
              <div className="text-lg whitespace-pre-line text-foreground" style={{ minHeight: "1.9em" }}>
                {client.main_request?.trim()
                  ? client.main_request
                  : <span className="text-gray-400">—</span>}
              </div>
            </div>
            <div
              className="rounded-[24px] px-7 py-6"
              style={{
                background: "oklch(0.98 0.017 87)",
                border: "1.5px solid oklch(0.85 0.015 85)",
                boxShadow: "0 2px 9px 0 oklch(0.81 0.015 81 / 0.11)",
              }}
            >
              <div
                className="font-serif text-[1.72rem] leading-tight mb-2 text-primary"
                style={{ fontFamily: "var(--font-playfair),serif" }}
              >
                Цели терапии
              </div>
              <div className="text-lg whitespace-pre-line text-foreground" style={{ minHeight: "1.9em" }}>
                {client.therapy_goals?.trim()
                  ? client.therapy_goals
                  : <span className="text-gray-400">—</span>}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Информация</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-base">
                <div>
                  <span className="text-gray-500">Email: </span>
                  {client.email ? (
                    <a
                      href={`mailto:${client.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {client.email}
                    </a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
                <div>
                  <span className="text-gray-500">Телефон: </span>
                  {client.phone || <span className="text-gray-400">—</span>}
                </div>
                <div>
                  <span className="text-gray-500">Статус: </span>
                  {client.status === "Новый" ? (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                      Новый
                    </Badge>
                  ) : client.status === "В работе" ? (
                    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                      В работе
                    </Badge>
                  ) : (
                    <Badge>{client.status}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Заметки сессий</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={handleAddNote}
                  className="mb-6 flex flex-col gap-3"
                >
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Новая заметка по сессии..."
                    rows={3}
                    disabled={addingNote}
                    required
                  />
                  {noteError && (
                    <div className="text-sm text-red-600 bg-red-50 rounded px-2 py-1">
                      {noteError}
                    </div>
                  )}
                  <div>
                    <Button
                      type="submit"
                      disabled={addingNote || !newNote.trim()}
                    >
                      {addingNote ? "Сохранение..." : "Сохранить"}
                    </Button>
                  </div>
                </form>
                <div className="flex flex-col gap-4">
                  {notesLoading ? (
                    <div className="text-muted-foreground text-center py-4">
                      Загрузка заметок...
                    </div>
                  ) : sortedNotes.length === 0 ? (
                    <div className="text-gray-400 text-sm text-center">
                      Нет заметок.
                    </div>
                  ) : (
                    sortedNotes.map((note) => (
                      <Card
                        key={note.id}
                        className="rounded-[18px] border-[1.5px] px-0 py-0 bg-[oklch(0.98_0.02_88)] border-[oklch(0.82_0.015_82)] shadow-[0_2px_8px_0_oklch(0.85_0.015_85_/_0.048)] overflow-hidden flex flex-col"
                        style={{
                          marginBottom: "0.25em",
                        }}
                      >
                        <div className="flex items-center justify-between px-5 pt-4 pb-2">
                          <div
                            className="font-serif text-lg text-primary"
                            style={{ fontFamily: "var(--font-playfair),serif" }}
                          >
                            Сессия от {formatDateHuman(note.created_at)}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="hover:bg-rose-50 text-rose-500"
                            title="Удалить заметку"
                            disabled={deletingNoteId === note.id}
                            onClick={() => handleDeleteNote(note.id)}
                          >
                            <Trash size={18} />
                          </Button>
                        </div>
                        <div className="px-5 pb-3">
                          <div className="whitespace-pre-line text-base text-foreground">
                            {note.content}
                          </div>
                          <div className="text-xs text-gray-400 text-right font-serif mt-4" style={{ fontFamily: "var(--font-playfair),serif" }}>
                            {formatDateTimeExact(note.created_at)}
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </main>
  );
}
