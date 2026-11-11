"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui";
import { shuffle, type Difficulty } from "@/lib/math/spldv";
import { cn } from "@/lib/utils";
import { GameHud, type GameProps } from "./game-shell";

const BASIC = [
  { term: "Variabel", def: "Huruf pengganti bilangan yang belum diketahui nilainya." },
  { term: "Koefisien", def: "Bilangan yang dikalikan dengan variabel, beserta tandanya." },
  { term: "Konstanta", def: "Suku berupa bilangan tetap tanpa variabel." },
  { term: "Suku", def: "Bagian bentuk aljabar yang dipisahkan tanda + atau −." },
  { term: "PLDV", def: "Satu persamaan dengan dua variabel yang masing-masing berpangkat satu." },
  { term: "SPLDV", def: "Dua PLDV dengan variabel yang sama dan diselesaikan bersama-sama." },
  { term: "Eliminasi", def: "Menghilangkan satu variabel dengan menjumlahkan atau mengurangkan persamaan." },
  { term: "Substitusi", def: "Mengganti variabel dengan nilai yang sudah diketahui." },
];
const ADVANCED = [
  { term: "KPK", def: "Kelipatan persekutuan terkecil, dipakai untuk menyamakan koefisien." },
  { term: "Titik potong", def: "Titik pertemuan dua garis; koordinatnya adalah penyelesaian SPLDV." },
  { term: "Garis sejajar", def: "Posisi dua garis yang menandakan SPLDV tidak memiliki penyelesaian." },
  { term: "Himpunan penyelesaian", def: "Himpunan semua pasangan (x, y) yang memenuhi sistem." },
];

const COUNT: Record<Difficulty, number> = { mudah: 6, sedang: 7, sulit: 8 };

export function PasangkanIstilah({ difficulty, onFinish }: GameProps) {
  const pairs = useMemo(() => {
    const pool = difficulty === "mudah" ? BASIC : [...BASIC, ...ADVANCED];
    return shuffle(Math.random, pool).slice(0, COUNT[difficulty]);
  }, [difficulty]);
  const defs = useMemo(() => shuffle(Math.random, pairs.map((p) => p.term)), [pairs]);
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [wrongDef, setWrongDef] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const start = useRef(Date.now());
  const finished = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start.current) / 1000)), 500);
    return () => clearInterval(t);
  }, []);

  const n = pairs.length;
  const perPair = 200 / n;

  useEffect(() => {
    if (matched.length === n && !finished.current) {
      finished.current = true;
      const secs = (Date.now() - start.current) / 1000;
      const bonus = Math.max(0, Math.round(100 * (1 - secs / (n * 20))));
      const score = Math.max(0, Math.round(200 - mistakes * 5 + bonus));
      setTimeout(() => onFinish({ score, correct: n, total: n, summary: `${n} pasangan, ${mistakes} kesalahan, bonus waktu ${bonus}.` }), 600);
    }
  }, [matched, n, mistakes, onFinish]);

  const pickDef = (term: string) => {
    if (!selected || matched.includes(term)) return;
    if (term === selected) {
      setMatched((m) => [...m, term]);
      setSelected(null);
    } else {
      setMistakes((x) => x + 1);
      setWrongDef(term);
      setTimeout(() => setWrongDef(null), 500);
    }
  };

  const defOf = (term: string) => pairs.find((p) => p.term === term)!.def;

  return (
    <>
      <GameHud
        items={[
          { label: "Cocok", value: `${matched.length}/${n}` },
          { label: "Salah", value: mistakes },
          { label: "Waktu", value: `${elapsed}s` },
          { label: "Skor sementara", value: Math.max(0, Math.round(matched.length * perPair - mistakes * 5)) },
        ]}
      />
      <p className="mb-3 text-sm text-ink-muted">{selected ? `Pilih pengertian untuk "${selected}".` : "Pilih sebuah istilah di kolom kiri."}</p>
      <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
        <Card className="p-3 sm:p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">Istilah</p>
          <div className="grid gap-2">
            {pairs.map((p) => {
              const done = matched.includes(p.term);
              return (
                <button
                  key={p.term}
                  type="button"
                  disabled={done}
                  aria-pressed={selected === p.term}
                  onClick={() => setSelected(p.term)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left font-bold transition",
                    done ? "border-emerald-300 bg-emerald-50 text-emerald-800" : selected === p.term ? "border-grape-500 bg-grape-50 text-grape-800" : "border-slate-200 bg-white hover:border-grape-300",
                  )}
                >
                  {p.term}
                  {done && <CheckCircle2 className="h-5 w-5" />}
                </button>
              );
            })}
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">Pengertian</p>
          <div className="grid gap-2">
            {defs.map((term) => {
              const done = matched.includes(term);
              return (
                <button
                  key={term}
                  type="button"
                  disabled={done || !selected}
                  onClick={() => pickDef(term)}
                  className={cn(
                    "rounded-xl border-2 px-4 py-3 text-left text-sm transition disabled:cursor-default",
                    done
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : wrongDef === term
                        ? "animate-shake border-rose-400 bg-rose-50"
                        : selected
                          ? "border-slate-200 bg-white hover:border-grape-400 hover:bg-grape-50/50"
                          : "border-slate-200 bg-white opacity-80",
                  )}
                >
                  {done && <span className="mr-1 font-bold">{term}:</span>}
                  {defOf(term)}
                </button>
              );
            })}
          </div>
        </Card>
      </div>
    </>
  );
}
