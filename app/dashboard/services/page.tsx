"use client";

import { useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clipboard } from "lucide-react";

// Быстрое всплывающее уведомление
function Toast({ message, show }: { message: string; show: boolean }) {
  return (
    <div
      className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-[oklch(0.85_0.03_75)] shadow-lg text-primary font-semibold transition-all duration-400 ${
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

// Данные об услугах и шаблоны для копирования
const SERVICES = [
  {
    title: "Карьерное консультирование",
    price: "3 000 ₽ / 60 мин",
    description:
      "Помощь в выборе и смене профессии, анализ ваших сильных сторон, разбор резюме и подготовка к собеседованиям. Индивидуальный подход с фокусом на ваши ценности и амбиции.",
    avito: `🔍 Твой компас в мире профессий!

Привет, я Анна — профориентолог и психолог из Сургута. Помогу найти любимое дело, даже если кажется, что вы в тупике.

В программе: разбор талантов, стратегия смены ниши и работа со страхами.

⏳ 60 мин — 3 000 ₽. Пишите в чат, подберем время!`,
  },
  {
    title: "Психодиагностика",
    price: "2 500 ₽ / 50 мин",
    description:
      "Профессиональная психологическая диагностика с использованием проверенных методик. Вы получите развернутый разбор и рекомендации по развитию. Работаю с подростками и взрослыми.",
    avito: `🧠 Узнай себя за 50 минут!

Глубокое исследование твоих особенностей: темперамент, сильные стороны, скрытые таланты.

Как эксперт в психодиагностике, я помогу тебе получить четкий психологический портрет.

⏳ 50 мин — 2 500 ₽. Сделай первый шаг к пониманию себя!`,
  },
  {
    title: "Личная терапия",
    price: "3 200 ₽ / 60 мин",
    description:
      "Индивидуальные встречи для поддержки в сложные периоды жизни. Безоценочно, конфиденциально, в атмосфере доверия. Работа с тревогой, самооценкой, отношениями.",
    avito: `🕊️ Бережная поддержка и безопасное пространство.

Работаю с тревогой, самооценкой и выгоранием. Помогаю вернуть внутренний покой и уверенность.

Конфиденциально и мягко.

⏳ 60 мин — 3 200 ₽. Напишите «Запись», и я пришлю свободные окошки.`,
  },
];

// Копирование текста по id (индексу) услуги
function copyToClipboard(idx: number, showToast: () => void) {
  const text = SERVICES[idx]?.avito;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast();
  });
}

export default function ServicesPage() {
  const [toastVisible, setToastVisible] = useState(false);

  function handleCopy(idx: number) {
    copyToClipboard(idx, () => {
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 3000);
    });
  }

  return (
    <>
      <main className="max-w-5xl mx-auto py-12 px-4">
        <h1
          className="text-4xl font-bold mb-12 font-serif text-primary"
          style={{
            fontFamily: "var(--font-playfair),serif",
            letterSpacing: "0.03em",
          }}
        >
          Мои услуги
        </h1>
        <div className="flex flex-col md:flex-row gap-10 md:gap-7">
          {SERVICES.map((service, idx) => (
            <Card
              key={service.title}
              className="flex-1 min-w-[275px] max-w-md border-2 rounded-[26px] shadow-md bg-[oklch(0.98_0.017_87)] border-[oklch(0.85_0.015_85)]"
              style={{
                fontFamily: "var(--font-playfair),serif",
                boxShadow: "0 2px 9px 0 oklch(0.81 0.015 81 / 0.11)",
              }}
            >
              <CardHeader className="pb-2">
                <CardTitle
                  className="text-2xl font-serif text-primary"
                  style={{
                    fontFamily: "var(--font-playfair),serif",
                    letterSpacing: "0.01em",
                  }}
                >
                  {service.title}
                </CardTitle>
                <div
                  className="text-lg font-semibold text-[oklch(0.45_0.04_70)] mt-1"
                  style={{ fontFamily: "var(--font-playfair),serif" }}
                >
                  {service.price}
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className="mb-5 text-base text-gray-700 min-h-[92px]"
                  style={{ fontFamily: "var(--font-playfair),serif" }}
                >
                  {service.description}
                </div>
                <Button
                  variant="outline"
                  className="gap-2 rounded-lg px-6 py-2 font-serif border border-[oklch(0.8_0.025_87)] hover:bg-[oklch(0.96_0.012_88)] transition"
                  style={{
                    fontFamily: "var(--font-playfair),serif",
                    letterSpacing: "0.02em",
                  }}
                  onClick={() => handleCopy(idx)}
                >
                  <Clipboard size={19} />
                  {"Скопировать для Авито"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <Toast message="Готово! Объявление скопировано" show={toastVisible} />
    </>
  );
}
