/**
 * Teks tampilan refleksi (bahasa Indonesia). Kunci = id prompt & opsi pada
 * src/lib/tutor/reflection-prompts.ts. Jawaban tersimpan sebagai id, bukan teks.
 */
export interface ReflectionCopy {
  question: string;
  options?: Record<string, string>;
  /** Untuk skala: label ujung. */
  scaleLabels?: [string, string];
}

export const REFLECTION_COPY: Record<string, ReflectionCopy> = {
  bagian_menantang: {
    question: "Bagian mana yang paling menantang bagimu?",
    options: {
      analisis: "Membaca dan menganalisis koefisien",
      pilih_variabel: "Memilih variabel yang dieliminasi",
      pengali: "Menentukan pengali",
      operasi: "Memilih menjumlahkan atau mengurangkan",
      hitung: "Menghitung nilai variabel",
      grafik: "Menghubungkan dengan grafik",
    },
  },
  alasan_variabel: {
    question: "Mengapa kamu memilih variabel itu untuk dieliminasi?",
    options: {
      mudah_disamakan: "Koefisiennya lebih mudah disamakan",
      koefisien_kecil: "Koefisiennya tampak lebih kecil",
      asal_pilih: "Memilih saja",
      tidak_yakin: "Saya belum yakin alasannya",
    },
  },
  bandingan_alternatif: {
    question: "Dibanding variabel yang lain, pekerjaan dengan pilihanmu terasa…",
    options: {
      lebih_ringan: "Lebih ringan",
      sama: "Kurang lebih sama",
      lebih_berat: "Lebih berat",
      belum_membandingkan: "Saya belum membandingkan",
    },
  },
  aturan_tanda_sama: {
    question: "Jika koefisien variabel yang dieliminasi sama besar dan bertanda sama, apa yang dilakukan pada kedua persamaan?",
    options: { dikurangkan: "Dikurangkan", dijumlahkan: "Dijumlahkan", tergantung_tanda: "Tergantung hal lain" },
  },
  makna_titik_potong: {
    question: "Titik potong dua garis pada grafik adalah pasangan (x, y) yang…",
    options: {
      memenuhi_kedua: "Memenuhi kedua persamaan sekaligus",
      memenuhi_satu: "Hanya memenuhi salah satu persamaan",
      belum_paham: "Saya belum paham",
    },
  },
  keyakinan: { question: "Seberapa yakin kamu dapat mengulang langkah ini pada sistem lain tanpa bantuan?", scaleLabels: ["Belum yakin", "Sangat yakin"] },
  cara_memprediksi: {
    question: "Bagaimana kamu membuat prediksimu tadi?",
    options: { substitusi_hitung: "Menghitung dengan substitusi", perkiraan: "Memperkirakan dari angka-angkanya", menebak: "Menebak" },
  },
  makna_penyelesaian: {
    question: "Apa yang membuat sebuah pasangan (x, y) disebut penyelesaian SPLDV?",
    options: {
      memenuhi_kedua: "Memenuhi kedua persamaan sekaligus",
      memenuhi_satu: "Memenuhi salah satu persamaan saja",
      dekat_garis: "Letaknya dekat dengan salah satu garis",
    },
  },
  keyakinan_prediksi: { question: "Seberapa yakin kamu pada prediksimu sebelum diuji?", scaleLabels: ["Belum yakin", "Sangat yakin"] },
};
