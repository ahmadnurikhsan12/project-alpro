"use client";

import { FileSearch, Lock, Search, Unlock } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Card, MathBlock } from "@/components/ui";
import { easiestVariable, formatEquation, formatNumber, generateSystem, pick, planElimination } from "@/lib/math/spldv";
import { cn } from "@/lib/utils";
import { GameHud, type GameProps } from "./game-shell";
import { NumberField, toInt } from "./shared";

const CASES = 5;
const STORIES = [
  "Kode brankas museum hilang! Pelaku meninggalkan dua catatan berisi persamaan.",
  "Seseorang menukar label harga di toko. Dua nota menjadi bukti utama.",
  "Peta harta karun menyembunyikan koordinat (x, y) di balik dua persamaan.",
  "Robot sekolah terkunci. Kata sandinya adalah pasangan bilangan rahasia.",
  "Surat kaleng berisi dua teka-teki angka. Ungkap identitas pengirimnya!",
  "Jejak sepatu di taman menunjukkan dua pola langkah yang saling berkaitan.",
];

function makeCase(difficulty: GameProps["difficulty"]) {
  const g = generateSystem(Math.random, difficulty);
  const v = easiestVariable(g.e1, g.e2);
  const plan = planElimination(g.e1, g.e2, v)!;
  const keep = plan.keep;
  const clues = [
    plan.m1 === 1 && plan.m2 === 1
      ? `Koefisien ${v} pada kedua bukti sudah sama besar — ${plan.operation === "add" ? "jumlahkan" : "kurangkan"} saja.`
      : `Untuk menghilangkan ${v}, kalikan bukti (1) dengan ${plan.m1} dan bukti (2) dengan ${plan.m2}, lalu ${plan.operation === "add" ? "jumlahkan" : "kurangkan"}.`,
    `Setelah ${v} dieliminasi, tersisa: ${plan.resultCoef === 1 ? "" : plan.resultCoef === -1 ? "−" : formatNumber(plan.resultCoef)}${keep} = ${formatNumber(plan.resultConst)}.`,
    `Saksi melihat bahwa x + y = ${g.x + g.y}.`,
  ];
  return { ...g, story: pick(Math.random, STORIES), clues };
}

export function DetektifVariabel({ difficulty, onFinish }: GameProps) {
  const cases = useMemo(() => Array.from({ length: CASES }, () => makeCase(difficulty)), [difficulty]);
  const [i, setI] = useState(0);
  const [opened, setOpened] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [xs, setXs] = useState("");
  const [ys, setYs] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [solvedCase, setSolvedCase] = useState<null | "solved" | "gave-up">(null);
  const [total, setTotal] = useState(0);
  const [solved, setSolved] = useState(0);

  const c = cases[i];
  const casePoints = Math.max(20, 100 - opened * 20 - wrong * 10);

  const accuse = () => {
    const x = toInt(xs);
    const y = toInt(ys);
    if (x === null || y === null) return setMsg({ ok: false, text: "Isi nilai x dan y dengan bilangan bulat." });
    if (x === c.x && y === c.y) {
      setTotal((t) => t + casePoints);
      setSolved((s) => s + 1);
      setSolvedCase("solved");
      setMsg({ ok: true, text: `Kasus terpecahkan! (${x}, ${y}) memenuhi kedua bukti. +${casePoints} poin.` });
    } else {
      setWrong((w) => w + 1);
      const ok1 = c.e1.a * x + c.e1.b * y === c.e1.c;
      const ok2 = c.e2.a * x + c.e2.b * y === c.e2.c;
      setMsg({
        ok: false,
        text: ok1 || ok2 ? `Hampir! Pasangan itu hanya cocok dengan bukti (${ok1 ? 1 : 2}). Harus cocok dengan keduanya. −10 poin.` : "Tuduhan salah — pasangan itu tidak cocok dengan bukti mana pun. −10 poin.",
      });
    }
  };

  const giveUp = () => {
    setSolvedCase("gave-up");
    setMsg({ ok: false, text: `Jawabannya adalah x = ${c.x}, y = ${c.y}. Kasus ini 0 poin.` });
  };

  const next = () => {
    if (i === CASES - 1) {
      onFinish({ score: total, correct: solved, total: CASES, summary: `${solved} dari ${CASES} kasus terpecahkan.` });
      return;
    }
    setI(i + 1);
    setOpened(0);
    setWrong(0);
    setXs("");
    setYs("");
    setMsg(null);
    setSolvedCase(null);
  };

  return (
    <>
      <GameHud
        items={[
          { label: "Kasus", value: `${i + 1}/${CASES}` },
          { label: "Skor", value: total },
          { label: "Nilai kasus ini", value: solvedCase ? "—" : casePoints },
        ]}
      />
      <div className="grid gap-5 md:grid-cols-[1.2fr_1fr]">
        <Card>
          <p className="flex items-center gap-2 text-sm font-bold text-brand-700">
            <FileSearch className="h-4 w-4" /> Berkas kasus #{i + 1}
          </p>
          <p className="mt-2 text-ink-soft">{c.story}</p>
          <p className="mt-3 text-sm font-semibold text-ink">Bukti utama:</p>
          <MathBlock lines={[`(1)  ${formatEquation(c.e1)}`, `(2)  ${formatEquation(c.e2)}`]} />

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <NumberField label="x =" value={xs} onChange={setXs} onEnter={accuse} disabled={!!solvedCase} />
            <NumberField label="y =" value={ys} onChange={setYs} onEnter={accuse} disabled={!!solvedCase} />
            {!solvedCase && (
              <Button onClick={accuse} disabled={!xs || !ys}>
                <Search className="h-4 w-4" /> Ajukan Tuduhan
              </Button>
            )}
          </div>
          {msg && (
            <p role="status" className={cn("mt-3 rounded-lg px-3 py-2 text-sm font-medium", msg.ok ? "bg-emerald-50 text-emerald-900" : "animate-shake bg-rose-50 text-rose-900")}>
              {msg.text}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {solvedCase ? (
              <Button onClick={next}>{i === CASES - 1 ? "Lihat hasil akhir" : "Kasus berikutnya"}</Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={giveUp}>
                Menyerah
              </Button>
            )}
          </div>
        </Card>

        <Card>
          <p className="text-sm font-bold text-ink">Petunjuk tambahan (−20 poin per petunjuk)</p>
          <ul className="mt-3 space-y-2">
            {c.clues.map((clue, k) => {
              const isOpen = k < opened || !!solvedCase;
              return (
                <li key={k}>
                  {isOpen ? (
                    <p className="flex animate-fade-up gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                      <Unlock className="mt-0.5 h-4 w-4 shrink-0" /> {clue}
                    </p>
                  ) : (
                    <button
                      type="button"
                      disabled={k !== opened}
                      onClick={() => setOpened(opened + 1)}
                      className="flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-3 text-left text-sm font-semibold text-ink-muted transition hover:border-amber-400 hover:text-amber-700 disabled:opacity-50"
                    >
                      <Lock className="h-4 w-4" /> Buka petunjuk {k + 1}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </>
  );
}
