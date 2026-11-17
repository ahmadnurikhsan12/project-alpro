import type { OptionDiagnosis, QuestionMediation } from "@/lib/tutor/types";

/**
 * METADATA TUTOR untuk 16 soal latihan RMT (practice-rmt.ts).
 *
 * Soal-soal ini menekankan konsep dan representasi, sehingga pola kesalahan pilihan ganda tidak
 * berasal dari katalog prosedural (mis. salah operasi) melainkan ditulis khusus (`opsi_khusus`):
 * `observe` menyatakan apa yang tampak dari pilihan siswa (sebagai pola, bukan vonis) dan `ask`
 * berupa pertanyaan pengarah — bukan jawaban. Pemetaan `phase` adalah INTERPRETASI penerapan,
 * bukan klaim dari buku.
 */
const k = (observe: string, ask: string): OptionDiagnosis => ({ code: "opsi_khusus", observe, ask });

export const RMT_MEDIATION: Record<string, QuestionMediation> = {
  // ------------------------------------------------------------ Modul 4
  "p-r4-01": {
    phase: "input",
    skill: "konsep",
    options: {
      b: k("Pilihanmu menyatakan bahwa penjumlahan langsung memberi nilai x dan y. Padahal yang dihasilkan penjumlahan adalah sebuah persamaan baru.", "Coba jumlahkan x + y = 10 dan x − y = 4. Apa yang kamu peroleh: sebuah persamaan, atau langsung nilai x dan y?"),
      c: k("Pilihanmu menyatakan bahwa aturan ini hanya dihafal. Matematika biasanya punya alasan yang bisa ditelusuri.", "Jika sebuah pasangan memenuhi persamaan (1) dan juga memenuhi persamaan (2), apa yang bisa kamu katakan tentang jumlah kedua ruas kiri dan jumlah kedua ruas kanan?"),
      d: k("Pilihanmu menyatakan bahwa ruas kanan kedua persamaan selalu sama. Periksa dengan contoh: apakah ruas kanan x + y = 10 dan x − y = 4 sama?", "Apakah alasan penjumlahan itu bergantung pada besar ruas kanannya, atau pada kenyataan bahwa kedua persamaan itu benar?"),
    },
    ladder: {
      2: "Pikirkan dua kesamaan yang sama-sama benar, misalnya dua timbangan yang seimbang. Apa yang terjadi jika isi kedua timbangan itu digabung?",
      3: "Tulis: ruas kiri (1) = ruas kanan (1) dan ruas kiri (2) = ruas kanan (2). Lalu jumlahkan sisi kirinya dan sisi kanannya. Apakah hasilnya masih sebuah kesamaan?",
    },
  },
  "p-r4-02": {
    phase: "input",
    skill: "konsep",
    options: {
      b: k("Pilihanmu menyatakan titik itu hanya memenuhi persamaan pertama. Titik potong berada di dua garis sekaligus.", "Substitusikan x = 7 dan y = 3 ke persamaan kedua. Apakah ruas kiri sama dengan ruas kanan?"),
      c: k("Pilihanmu menyatakan x dan y selalu sama. Pada titik itu x dan y justru berbeda.", "Apakah nilai x dan nilai y pada titik (7, 3) sama besar? Apakah itu ada hubungannya dengan arti titik potong?"),
      d: k("Pilihanmu menyatakan kedua garis sejajar. Garis sejajar tidak memiliki titik potong, sedangkan soal menyebut ada titik potong.", "Jika dua garis berpotongan di satu titik, berapa banyak titik yang berada di kedua garis sekaligus?"),
    },
    ladder: {
      2: "Titik yang berada pada sebuah garis memenuhi persamaan garis itu. Titik potong berada pada garis yang mana saja?",
      3: "Uji koordinat titik potong pada persamaan (1), lalu pada persamaan (2). Bandingkan ruas kiri dengan ruas kanan masing-masing.",
    },
  },
  "p-r4-03": {
    phase: "input",
    skill: "konsep",
    target: { kind: "pair" },
    ladder: {
      2: "Pasangan penyelesaian harus muncul di kedua daftar sekaligus. Cocokkan satu per satu pasangan di daftar pertama dengan daftar kedua.",
      3: "Pilih satu pasangan yang kamu curigai, lalu substitusikan ke persamaan (1) dan persamaan (2) untuk memastikan.",
    },
  },
  "p-r4-04": {
    phase: "input",
    skill: "konsep",
    tfWrong: k("Pernyataan ini dapat diuji dengan contoh pasangan sebelum kamu memutuskan.", "Pilih pasangan yang memenuhi x + y = 5, misalnya (2, 3). Apakah pasangan itu juga memenuhi 2x + 2y = 10?"),
    ladder: {
      2: "Dua persamaan yang memiliki pasangan penyelesaian yang persis sama akan menghasilkan garis yang sama. Uji dengan beberapa pasangan.",
      3: "Ambil dua pasangan yang memenuhi persamaan pertama. Substitusikan keduanya ke persamaan yang sudah dikalikan 2 dan lihat hasilnya.",
    },
  },
  "p-r4-05": {
    phase: "elaborasi",
    skill: "ruas_kanan",
    options: {
      b: k("Pilihanmu menyoroti angka pengalinya. Pengali 3 pada suku-suku kiri sudah benar; yang perlu diperiksa adalah bagian lain dari persamaan.", "Perhatikan 3x + 6y: apakah kedua sukunya sudah dikalikan dengan pengali yang sama? Lalu bagaimana dengan ruas kanannya?"),
      c: k("Pilihanmu mengubah suku y menjadi tidak dikalikan. Padahal semua suku di ruas kiri harus dikalikan.", "Jika suku y di ruas kiri tidak ikut dikalikan, apakah persamaan barunya masih setara dengan persamaan awal?"),
      d: k("Pilihanmu menyatakan tidak ada kekeliruan. Coba uji dengan pasangan yang memenuhi persamaan awal.", "Pasangan (1, 3) memenuhi x + 2y = 7. Apakah pasangan itu juga memenuhi persamaan yang ditulis siswa?"),
    },
    ladder: {
      2: "Mengalikan persamaan berarti mengalikan setiap suku di kedua ruas dengan bilangan yang sama. Periksa suku mana yang belum berubah pada tulisan siswa.",
      3: "Tulis ulang 3(x + 2y) = 3(7). Hitung ruas kiri dan ruas kanan terpisah, lalu bandingkan dengan tulisan siswa.",
    },
  },
  "p-r4-06": {
    phase: "elaborasi",
    skill: "hitung_eliminasi",
    target: { kind: "combined_const", eliminate: "y" },
    ladder: {
      2: "Operasi yang dilakukan pada ruas kiri juga dilakukan pada ruas kanan. Tentukan operasi apa yang dipakai pada ruas kiri, lalu pakai juga pada ruas kanan.",
      3: "Tulis ruas kanan kedua persamaan, lalu lakukan operasi yang sama dengan yang membuat suku y hilang.",
    },
  },
  "p-r4-07": {
    phase: "output",
    skill: "konsep",
    options: {
      b: k("Pilihanmu menyatakan x menjadi nol. Pada soal ini suku x ikut hilang bersama suku y.", "Setelah (x + y) − (x + y), suku apa saja yang tersisa di ruas kiri?"),
      c: k("Pilihanmu menyatakan ada tepat satu penyelesaian. Padahal kedua garis pada soal sejajar.", "Jika kedua garis sejajar, apakah ada titik yang berada di kedua garis sekaligus?"),
      d: k("Pilihanmu menyatakan y menjadi nol. Pada soal ini suku y ikut hilang bersama suku x.", "Setelah kedua persamaan dikurangkan, masih adakah variabel di ruas kiri?"),
    },
    ladder: {
      2: "Lakukan pengurangan pada ruas kiri dan ruas kanan secara terpisah. Perhatikan apakah masih ada variabel yang tersisa.",
      3: "Hitung (x + y) − (x + y), lalu hitung 2 − 5. Tuliskan keduanya sebagai satu pernyataan dan nilailah apakah mungkin benar.",
    },
  },
  "p-r4-08": {
    phase: "output",
    skill: "konsep",
    options: {
      b: k("Pilihanmu menyatakan x dan y selalu bernilai sama. Pada kebanyakan sistem, nilainya berbeda.", "Pada sistem x + y = 10 dan x − y = 4, apakah x dan y sama besar?"),
      c: k("Pilihanmu menyatakan hanya variabel pertama yang berpengaruh. Kedua variabel sama-sama menentukan titik potong.", "Pada grafik, titik potong memiliki berapa koordinat, dan apakah keduanya penting?"),
      d: k("Pilihanmu menyatakan hasilnya dibulatkan. Eliminasi menghasilkan nilai yang tepat, bukan perkiraan.", "Apakah pemeriksaan substitusi menunjukkan hasil yang pas, atau hanya mendekati?"),
    },
    ladder: {
      2: "Pikirkan apa yang sebenarnya dicari dari dua persamaan dua variabel, lalu apakah hasil itu berubah jika caranya berbeda.",
      3: "Bayangkan grafik kedua persamaan. Apakah letak titik potongnya bergantung pada variabel mana yang kamu hilangkan lebih dulu?",
    },
  },

  // ------------------------------------------------------------ Modul 6
  "p-r6-01": {
    phase: "output",
    skill: "periksa_solusi",
    tfWrong: k("Pernyataan ini dapat diuji dengan sebuah contoh pasangan sebelum kamu memutuskan.", "Pasangan (6, 0) memenuhi x + 2y = 6. Apakah pasangan itu juga memenuhi 3x − y = 11? Lalu apakah pasangan itu penyelesaian sistem?"),
    ladder: {
      2: "Ingat definisi penyelesaian SPLDV: sebuah pasangan nilai yang membuat KEDUA persamaan bernilai benar.",
      3: "Buat atau pilih satu pasangan yang hanya memenuhi satu persamaan, lalu uji pada persamaan yang satunya.",
    },
  },
  "p-r6-02": {
    phase: "output",
    skill: "periksa_solusi",
    ladder: {
      2: "Hitung ruas kiri persamaan pertama dengan memasukkan nilai x dan y yang diberikan, lalu bandingkan dengan ruas kanannya.",
      3: "Ulangi untuk persamaan kedua. Pasangan hanya disebut penyelesaian jika kedua perbandingan itu menunjukkan kesamaan.",
    },
  },
  "p-r6-03": {
    phase: "output",
    skill: "periksa_solusi",
    ladder: {
      2: "Periksa kedua persamaan satu per satu, jangan berhenti setelah satu persamaan terpenuhi.",
      3: "Substitusikan nilai x dan y ke persamaan kedua. Bandingkan hasil ruas kirinya dengan ruas kanan, termasuk tandanya.",
    },
  },
  "p-r6-04": {
    phase: "input",
    skill: "periksa_solusi",
    options: {
      b: k("Pilihanmu menyatakan satu persamaan lebih penting. Dalam sistem, kedua persamaan memiliki kedudukan yang sama.", "Jika persamaan kedua dilewatkan, apa yang bisa salah dari kesimpulanmu?"),
      c: k("Pilihanmu menyatakan pemeriksaan membuat hasil otomatis benar. Pemeriksaan hanya mengungkapkan apakah hasil benar atau tidak.", "Apa yang kamu lakukan jika pemeriksaan menunjukkan satu persamaan tidak terpenuhi?"),
      d: k("Pilihanmu menyatakan persamaan pertama biasanya salah tulis. Soal-soal ini menuliskan kedua persamaan dengan benar.", "Apakah alasan memeriksa kedua persamaan berkaitan dengan salah tulis, atau dengan definisi penyelesaian?"),
    },
    ladder: {
      2: "Pikirkan kembali kapan sebuah pasangan nilai disebut penyelesaian sistem, dan apa yang terjadi jika hanya satu persamaan yang diperiksa.",
      3: "Bayangkan grafik kedua persamaan: titik yang hanya berada di satu garis bukan titik potong. Hubungkan dengan alasan memeriksa keduanya.",
    },
  },
  "p-r6-05": {
    phase: "output",
    skill: "periksa_solusi",
    ladder: {
      2: "Substitusi berarti mengganti huruf dengan angkanya. Ganti x dan y pada bentuk 4x − 3y, lalu hitung perkalian terlebih dahulu.",
      3: "Tulis 4 dikali nilai x, lalu 3 dikali nilai y, kemudian kurangkan hasil keduanya.",
    },
  },
  "p-r6-06": {
    phase: "elaborasi",
    skill: "hitung_eliminasi",
    target: { kind: "pair" },
    ladder: {
      2: "Titik potong dua garis adalah pasangan yang memenuhi kedua persamaan. Pilih variabel yang koefisiennya paling mudah dihilangkan.",
      3: "Perhatikan tanda koefisien y pada kedua persamaan, tentukan operasi yang membuat y hilang, lalu hitung x.",
    },
  },
  "p-r6-07": {
    phase: "output",
    skill: "periksa_solusi",
    options: {
      b: k("Pilihanmu menyalahkan soal. Lebih mungkin ada kekeliruan pada perhitungan sendiri, dan itu bisa dicari.", "Bagian mana dari perhitunganmu yang rawan salah: tanda, ruas kanan, atau pengali?"),
      c: k("Pilihanmu menyatakan memenuhi satu persamaan sudah cukup. Penyelesaian harus memenuhi kedua persamaan.", "Jika pasangan itu berada di garis pertama tetapi tidak di garis kedua, apakah ia titik potong?"),
      d: k("Pilihanmu menyatakan eliminasi selalu benar. Prosesnya benar hanya jika setiap langkahnya benar.", "Apa gunanya memeriksa jika eliminasi selalu benar?"),
    },
    ladder: {
      2: "Hasil substitusi yang tidak sesuai adalah informasi berharga. Pikirkan apa yang diberitahukan hasil itu tentang pasangan dan tentang prosesnya.",
      3: "Pikirkan langkah berikutnya: tempat apa saja pada proses eliminasi yang biasanya menimbulkan kesalahan, lalu periksa satu per satu.",
    },
  },
  "p-r6-08": {
    phase: "output",
    skill: "konsep",
    options: {
      b: k("Pilihanmu menyatakan garis tegak melalui titik asal. Garis seperti itu dipenuhi oleh titik-titik dengan x tertentu, bukan y tertentu.", "Titik-titik apa yang memenuhi y = 2: yang x-nya sama, atau yang y-nya sama?"),
      c: k("Pilihanmu menyatakan garis miring yang sejajar garis awal. Persamaan y = 2 tidak memuat x sehingga arahnya khusus.", "Jika x berubah tetapi y tetap 2, bagaimana letak titik-titiknya?"),
      d: k("Pilihanmu menyatakan hanya satu titik. Persamaan y = 2 tidak membatasi nilai x.", "Berapa banyak titik yang memiliki y = 2 jika x boleh bernilai apa saja?"),
    },
    ladder: {
      2: "Persamaan y = 2 tidak menyebut x, sehingga x boleh bernilai apa saja. Bayangkan titik-titik yang memenuhinya di bidang koordinat.",
      3: "Tentukan tiga titik yang memenuhi y = 2 dengan nilai x berbeda, lalu bayangkan garis yang melalui ketiganya.",
    },
  },
};
