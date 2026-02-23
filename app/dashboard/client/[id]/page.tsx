'use client';

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  primary_request: string | null;
  status: string | null;
};

type Note = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
};

function formatDate(dateStr: string) {
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
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);

  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const fetchClientAndNotes = async () => {
    setLoading(true);
    setNotesLoading(true);

    // Fetch client
    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .single();

    if (!clientError) {
      setClient(clientData as Client);
    } else {
      setClient(null);
    }
    setLoading(false);

    // Fetch notes
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

    // Get user_id (from session)
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
      setNotes(prev => [{ ...data }, ...prev]);
      setNewNote("");
    }
    setAddingNote(false);
  };

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
        <div className="text-center py-10 text-muted-foreground">Загрузка...</div>
      ) : !client ? (
        <div className="text-center py-10 text-red-600 font-semibold">Клиент не найден</div>
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-8">{client.name}</h1>

          <div className="flex flex-col gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Информация</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-base">
                <div>
                  <span className="text-gray-500">Email: </span>
                  {client.email ? (
                    <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline">{client.email}</a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
                <div>
                  <span className="text-gray-500">Телефон: </span>
                  {client.phone || <span className="text-gray-400">—</span>}
                </div>
                <div>
                  <span className="text-gray-500">Первичный запрос: </span>
                  {client.primary_request || <span className="text-gray-400">—</span>}
                </div>
                <div>
                  <span className="text-gray-500">Статус: </span>
                  {client.status === "Новый" ? (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">Новый</Badge>
                  ) : client.status === "В работе" ? (
                    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">В работе</Badge>
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
                <form onSubmit={handleAddNote} className="mb-6 flex flex-col gap-3">
                  <Textarea
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
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
                    <Button type="submit" disabled={addingNote || !newNote.trim()}>
                      {addingNote ? "Сохранение..." : "Сохранить"}
                    </Button>
                  </div>
                </form>
                <div className="flex flex-col gap-4">
                  {notesLoading ? (
                    <div className="text-muted-foreground text-center py-4">Загрузка заметок...</div>
                  ) : notes.length === 0 ? (
                    <div className="text-gray-400 text-sm text-center">Нет заметок.</div>
                  ) : (
                    notes.map(note => (
                      <div
                        key={note.id}
                        className="border rounded-md px-4 py-3 bg-gray-50 flex flex-col gap-2"
                      >
                        <div className="whitespace-pre-line">{note.content}</div>
                        <div className="text-xs text-gray-500 mt-1">{formatDate(note.created_at)}</div>
                      </div>
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
