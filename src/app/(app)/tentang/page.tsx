import { Info } from "lucide-react";
import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Tentang MathQuest dan RMT" };

const ELEMEN = [
  { t: "Analisis tugas", d: "Memahami apa yang diminta dan diketahui sebelum bertindak. Di Lab: mengisi tabel koefisien dan menentukan hubungan koefisien." },
  { t: "Perencanaan tindakan", d: "Memilih strategi dan alasannya sebelum mengerjakan. Di Lab: memilih variabel yang dieliminasi dan memprediksi hasilnya." },
  { t: "Refleksi", d: "Meninjau cara berpikirmu dan membandingkannya dengan cara lain. Di akhir aktivitas: tebakan, perbandingan strategi, dan pertanyaan pilihan." },
];

const FITUR = [
  ["Materi (7 modul)", "Representasi saling terhubung (tabel, persamaan, grafik), pertanyaan prediksi, dan refleksi."],
  ["SPLDV Lab", "Learning Activity: analisis, rencana, prediksi, eliminasi, periksa, refleksi."],
  ["Latihan dan tutor L1–L4", "Petunjuk bertahap tanpa membuka jawaban, dan kesempatan mencoba lagi."],
  ["Tebak Nilai dan Eliminasi Kilat", "Memprediksi sebelum mencoba dan merefleksikan cara bermain."],
  ["Pretest dan Posttest", "Mengukur kemampuan sebelum dan sesudah belajar; dinilai di server."],
  ["Tanya Tutor AI", "Bertanya bebas tentang SPLDV (opsional, memakai layanan AI gratis pihak ketiga)."],
];

export default function TentangPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tentang"
        title="Tentang MathQuest dan RMT"
        description="Media belajar SPLDV untuk siswa SMP kelas VIII, dirancang dengan pendekatan Rigorous Mathematical Thinking."
        icon={<Info className="h-5 w-5" />}
      />

      <Card>
        <h2 className="text-lg font-bold text-ink">Apa itu RMT?</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Rigorous Mathematical Thinking (RMT) adalah pendekatan belajar matematika dari Kinard dan Kozulin. Fokusnya bukan sekadar mendapat jawaban, tetapi berpikir dengan teliti: menganalisis soal, merencanakan langkah, memprediksi, memeriksa
          hasil, dan menjelaskan alasan, dengan bantuan alat seperti tabel, grafik, dan persamaan yang saling terhubung.
        </p>
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-ink">Tiga kegiatan belajar (Learning Activity)</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {ELEMEN.map((e) => (
            <li key={e.t} className="rounded-xl bg-slate-50 p-4">
              <h3 className="font-bold text-ink">{e.t}</h3>
              <p className="mt-1 text-sm text-ink-soft">{e.d}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-ink">Di mana RMT muncul di MathQuest?</h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-soft">
          {FITUR.map(([n, d]) => (
            <li key={n}>
              <strong className="text-ink">{n}.</strong> {d}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="border-amber-200 bg-amber-50">
        <h2 className="text-lg font-bold text-amber-900">Yang perlu kamu ketahui (batasan)</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-amber-900">
          <li>MathQuest <strong>tidak menggantikan guru</strong>. Kalau bingung, tanyakan kepada gurumu.</li>
          <li>MathQuest <strong>bukan penerapan penuh LPAD</strong>. Cara penerapan RMT di sini adalah tafsiran pengembang dan belum terbukti efektif.</li>
          <li>Petunjuk L1–L4 dan umpan baliknya memakai <strong>aturan matematika</strong>, bukan AI. Hanya halaman Tanya Tutor AI yang memakai AI, dan jawabannya bisa keliru.</li>
          <li>Pretest dan posttest adalah gambaran kemampuan, bukan nilai rapor.</li>
        </ul>
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-ink">Data dan privasi</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Kamu bisa belajar tanpa login. Progres dan hasil asesmen tersimpan di perangkatmu. Untuk uji coba, kamu memakai kode peserta anonim, bukan nama. Di Tanya Tutor AI, pertanyaanmu dikirim ke layanan AI pihak ketiga, jadi jangan menulis data
          pribadi.
        </p>
      </Card>
    </div>
  );
}
