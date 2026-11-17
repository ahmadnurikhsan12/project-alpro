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

/**
 * Kunci: id prompt, atau "konteks/id" bila teksnya berbeda per konteks (mis. "keyakinan").
 * `copyFor` mencari "konteks/id" lebih dulu.
 */
export const REFLECTION_COPY: Record<string, ReflectionCopy> = {
  "tebak_nilai/keyakinan": { question: "Seberapa yakin kamu dapat menemukan pasangan rahasia dengan lebih sedikit tebakan lain kali?", scaleLabels: ["Belum yakin", "Sangat yakin"] },
  "eliminasi_kilat/keyakinan": { question: "Seberapa yakin kamu pada ketelitianmu saat dikejar waktu?", scaleLabels: ["Belum yakin", "Sangat yakin"] },
  "lesson/keyakinan": { question: "Seberapa yakin kamu dapat menjelaskan materi ini kepada temanmu dengan kata-katamu sendiri?", scaleLabels: ["Belum yakin", "Sangat yakin"] },
  strategi: {
    question: "Strategi apa yang paling sering kamu pakai untuk menebak pasangan rahasia?",
    options: { substitusi: "Menghitung dengan substitusi", penyesuaian_sinyal: "Menyesuaikan dari sinyal tebakan sebelumnya", eliminasi: "Memakai eliminasi", menebak: "Menebak saja" },
  },
  prediksi_membantu: {
    question: "Apakah memprediksi sebelum menebak membantumu?",
    options: { sangat: "Sangat membantu", sedikit: "Sedikit membantu", tidak: "Tidak membantu" },
  },
  sinyal_membantu: {
    question: "Apakah sinyal terlalu kecil atau terlalu besar membantumu mendekati jawaban?",
    options: { sangat: "Sangat membantu", sedikit: "Sedikit membantu", tidak: "Tidak membantu" },
  },
  prioritas: {
    question: "Pada permainan tadi, mana yang lebih kamu utamakan?",
    options: { cepat: "Kecepatan", teliti: "Ketelitian", seimbang: "Keduanya seimbang" },
  },
  penyebab_salah: {
    question: "Jika ada jawabanmu yang salah, apa penyebab yang paling mungkin?",
    options: { terburu: "Terburu-buru", konsep: "Konsepnya belum jelas", hitung: "Salah hitung", tidak_ada_salah: "Tidak ada yang salah" },
  },
  strategi_berikutnya: {
    question: "Pada permainan berikutnya, apa yang akan kamu lakukan?",
    options: { pelan_dulu: "Lebih pelan agar teliti", periksa_ulang: "Memeriksa ulang sebelum menjawab", tetap_cepat: "Tetap secepat ini" },
  },
  penjelasan_sendiri: {
    question: "Dapatkah kamu menjelaskan ide utama materi ini dengan kata-katamu sendiri?",
    options: { lengkap: "Ya, dengan lengkap", sebagian: "Sebagian saja", belum: "Belum bisa" },
  },
  representasi_membantu: {
    question: "Bentuk penyajian mana yang paling membantumu memahami materi ini?",
    options: { tabel: "Tabel", persamaan: "Persamaan", grafik: "Grafik", ketiganya: "Ketiganya saling melengkapi", belum_jelas: "Belum jelas bagiku" },
  },
  bagian_sulit: {
    question: "Bagian mana dari materi ini yang paling sulit bagimu?",
    options: { konsep: "Memahami konsepnya", langkah: "Mengingat langkah-langkahnya", hitungan: "Menghitungnya", istilah: "Memahami istilahnya", tidak_ada: "Tidak ada yang sulit" },
  },
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

/** Teks refleksi untuk sebuah prompt pada sebuah konteks (konteks lebih spesifik didahulukan). */
export function copyFor(context: string, id: string): ReflectionCopy | undefined {
  return REFLECTION_COPY[`${context}/${id}`] ?? REFLECTION_COPY[id];
}
