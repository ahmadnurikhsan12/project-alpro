"use client";

import { ReceiptText, ShoppingBasket, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Card } from "@/components/ui";
import { pick, randInt, shuffle, type Difficulty } from "@/lib/math/spldv";
import { cn } from "@/lib/utils";
import { GameHud, type GameProps } from "./game-shell";
import { NumberField, rupiah, toInt } from "./shared";

const MISSIONS = 4;
const ITEMS: [string, string][] = [
  ["pensil", "buku tulis"],
  ["roti", "susu kotak"],
  ["apel", "jeruk"],
  ["bakso", "es teh"],
  ["penggaris", "penghapus"],
  ["donat", "jus"],
  ["stiker", "gantungan kunci"],
];

function makeMission(d: Difficulty) {
  const [itemA, itemB] = pick(Math.random, ITEMS);
  const step = d === "mudah" ? 1000 : 500;
  for (let t = 0; t < 200; t++) {
    const pa = randInt(Math.random, d === "sulit" ? 4 : 2, d === "sulit" ? 24 : 12) * step;
    const pb = randInt(Math.random, d === "sulit" ? 4 : 2, d === "sulit" ? 24 : 12) * step;
    if (pa === pb) continue;
    let a1 = randInt(Math.random, 1, 4);
    let b1 = randInt(Math.random, 1, 4);
    let a2 = randInt(Math.random, 1, 4);
    let b2 = randInt(Math.random, 1, 4);
    if (d === "mudah") {
      if (Math.random() < 0.5) a2 = a1;
      else b2 = b1;
    } else if (d === "sedang") {
      const k = randInt(Math.random, 2, 3);
      a1 = randInt(Math.random, 1, 2);
      a2 = a1 * k;
    } else {
      a1 = randInt(Math.random, 2, 5);
      a2 = randInt(Math.random, 2, 5);
      b1 = randInt(Math.random, 2, 5);
      b2 = randInt(Math.random, 2, 5);
      if (a1 === a2 || b1 === b2) continue;
    }
    if (a1 * b2 - a2 * b1 === 0) continue;
    const qa = randInt(Math.random, 1, d === "sulit" ? 6 : 4);
    const qb = randInt(Math.random, 1, d === "sulit" ? 6 : 4);
    const cart = qa * pa + qb * pb;
    const enough = Math.random() < 0.5;
    const budget = Math.max(step, enough ? cart + randInt(Math.random, 0, 4) * step : cart - randInt(Math.random, 1, 4) * step);
    return { itemA, itemB, pa, pb, receipts: shuffle(Math.random, [{ a: a1, b: b1 }, { a: a2, b: b2 }]), qa, qb, cart, budget, enough: budget >= cart };
  }
  return { itemA, itemB, pa: 2000, pb: 3000, receipts: [{ a: 1, b: 1 }, { a: 2, b: 1 }], qa: 2, qb: 2, cart: 10000, budget: 12000, enough: true };
}

export function MisiBelanja({ difficulty, onFinish }: GameProps) {
  const missions = useMemo(() => Array.from({ length: MISSIONS }, () => makeMission(difficulty)), [difficulty]);
  const [i, setI] = useState(0);
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [as, setAs] = useState("");
  const [bs, setBs] = useState("");
  const [wrong1, setWrong1] = useState(0);
  const [cartS, setCartS] = useState("");
  const [decision, setDecision] = useState<boolean | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [gained, setGained] = useState(0);

  const m = missions[i];
  const stage1Points = Math.max(15, 60 - wrong1 * 15);

  const checkPrices = () => {
    const a = toInt(as);
    const b = toInt(bs);
    if (a === null || b === null) return setMsg({ ok: false, text: "Isi kedua harga dengan angka, mis. 3000 atau 3.000." });
    if (a === m.pa && b === m.pb) {
      setScore((s) => s + stage1Points);
      setGained(stage1Points);
      setMsg({ ok: true, text: `Tepat! Harga 1 ${m.itemA} ${rupiah(m.pa)} dan 1 ${m.itemB} ${rupiah(m.pb)}. +${stage1Points} poin.` });
      setStage(2);
    } else {
      setWrong1((w) => w + 1);
      const ok = m.receipts.map((r) => r.a * a + r.b * b === r.a * m.pa + r.b * m.pb);
      setMsg({
        ok: false,
        text: ok.some(Boolean) ? `Harga itu hanya cocok dengan nota ${ok[0] ? "A" : "B"}. Cek nota lainnya! (−15 poin)` : "Harga itu tidak cocok dengan kedua nota. Coba susun SPLDV dan eliminasi. (−15 poin)",
      });
    }
  };

  const checkCart = () => {
    const total = toInt(cartS);
    if (total === null || decision === null) return setMsg({ ok: false, text: "Isi total harga dan pilih apakah uangnya cukup." });
    const totalOk = total === m.cart;
    const decOk = decision === m.enough;
    const pts = (totalOk ? 20 : 0) + (decOk ? 20 : 0);
    setScore((s) => s + pts);
    setGained((g) => g + pts);
    if (totalOk && decOk) setCorrect((c) => c + 1);
    setMsg({
      ok: totalOk && decOk,
      text: `Total yang benar: ${m.qa} × ${rupiah(m.pa)} + ${m.qb} × ${rupiah(m.pb)} = ${rupiah(m.cart)}. Uang ${rupiah(m.budget)} ${m.enough ? "cukup" : "tidak cukup"}. +${pts} poin.`,
    });
    setStage(3);
  };

  const next = () => {
    if (i === MISSIONS - 1) {
      onFinish({ score, correct, total: MISSIONS, summary: `${correct} dari ${MISSIONS} misi diselesaikan sempurna.` });
      return;
    }
    setI(i + 1);
    setStage(1);
    setAs("");
    setBs("");
    setWrong1(0);
    setCartS("");
    setDecision(null);
    setMsg(null);
    setGained(0);
  };

  return (
    <>
      <GameHud
        items={[
          { label: "Misi", value: `${i + 1}/${MISSIONS}` },
          { label: "Skor", value: score },
          { label: "Tahap", value: stage === 1 ? "1 · Harga satuan" : "2 · Belanja" },
        ]}
      />
      <div className="grid gap-5 md:grid-cols-2">
        {m.receipts.map((r, k) => (
          <Card key={k} className="relative overflow-hidden border-dashed">
            <p className="flex items-center gap-2 text-sm font-bold text-emerald-700">
              <ReceiptText className="h-4 w-4" /> Nota {k === 0 ? "A" : "B"}
            </p>
            <dl className="mt-3 space-y-1 font-mono text-sm">
              <div className="flex justify-between">
                <dt>
                  {r.a} × {m.itemA}
                </dt>
                <dd>?</dd>
              </div>
              <div className="flex justify-between">
                <dt>
                  {r.b} × {m.itemB}
                </dt>
                <dd>?</dd>
              </div>
              <div className="mt-2 flex justify-between border-t border-dashed border-slate-300 pt-2 font-bold">
                <dt>TOTAL</dt>
                <dd>{rupiah(r.a * m.pa + r.b * m.pb)}</dd>
              </div>
            </dl>
          </Card>
        ))}
      </div>

      <Card className="mt-5">
        {stage === 1 ? (
          <>
            <p className="font-semibold text-ink">Tahap 1: Berapa harga satuan setiap barang? (nilai tahap: {stage1Points})</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <NumberField wide label={`1 ${m.itemA} (Rp)`} value={as} onChange={setAs} onEnter={checkPrices} />
              <NumberField wide label={`1 ${m.itemB} (Rp)`} value={bs} onChange={setBs} onEnter={checkPrices} />
              <Button onClick={checkPrices} disabled={!as || !bs}>
                Cek harga
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="flex items-center gap-2 font-semibold text-ink">
              <ShoppingBasket className="h-5 w-5 text-emerald-600" /> Tahap 2: Daftar belanja Ibu: {m.qa} {m.itemA} dan {m.qb} {m.itemB}.
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm text-ink-soft">
              <Wallet className="h-4 w-4" /> Uang yang dibawa: <strong>{rupiah(m.budget)}</strong>
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <NumberField wide label="Total harga (Rp)" value={cartS} onChange={setCartS} disabled={stage === 3} />
              <div>
                <p className="mb-1 text-sm font-semibold text-ink">Uangnya cukup?</p>
                <div className="flex gap-2" role="radiogroup" aria-label="Apakah uangnya cukup">
                  {[true, false].map((v) => (
                    <button
                      key={String(v)}
                      type="button"
                      role="radio"
                      aria-checked={decision === v}
                      disabled={stage === 3}
                      onClick={() => setDecision(v)}
                      className={cn("h-11 rounded-xl border-2 px-4 font-semibold", decision === v ? "border-brand-500 bg-brand-50 text-brand-800" : "border-slate-200 bg-white")}
                    >
                      {v ? "Cukup" : "Tidak cukup"}
                    </button>
                  ))}
                </div>
              </div>
              {stage === 2 && (
                <Button onClick={checkCart} disabled={!cartS || decision === null}>
                  Bayar
                </Button>
              )}
            </div>
          </>
        )}
        {msg && (
          <p role="status" className={cn("mt-3 rounded-lg px-3 py-2 text-sm font-medium", msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900")}>
            {msg.text}
          </p>
        )}
        {stage === 3 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-ink-muted">Poin misi ini: {gained}</p>
            <Button onClick={next}>{i === MISSIONS - 1 ? "Lihat hasil akhir" : "Misi berikutnya"}</Button>
          </div>
        )}
      </Card>
    </>
  );
}
