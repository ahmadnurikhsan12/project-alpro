/**
 * PERLINDUNGAN DATA LOKAL: data di localStorage yang tidak dapat dibaca (rusak atau berasal dari versi lain)
 * tidak boleh langsung ditimpa. Isi aslinya disalin ke kunci cadangan, dan peringatan dicatat agar ditampilkan
 * kepada siswa/guru. Cadangan tidak pernah dihapus otomatis.
 */
const WARN_KEY = "mathquest.storage-warning.v1";

export interface StorageWarning {
  key: string;
  backupKey: string;
  reason: "rusak" | "versi_berbeda";
  at: string;
}

export function readStorageWarnings(): StorageWarning[] {
  try {
    const raw = window.localStorage.getItem(WARN_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? (list as StorageWarning[]) : [];
  } catch {
    return [];
  }
}

/** Menyalin isi lama ke kunci cadangan (sekali per isi yang sama) dan mencatat peringatan. Mengembalikan true bila aman. */
export function backupUnreadable(key: string, raw: string, reason: StorageWarning["reason"]): boolean {
  try {
    const list = readStorageWarnings();
    if (list.some((w) => w.key === key && window.localStorage.getItem(w.backupKey) === raw)) return true;
    const backupKey = `${key}.backup-${Date.now()}`;
    window.localStorage.setItem(backupKey, raw);
    list.push({ key, backupKey, reason, at: new Date().toISOString() });
    window.localStorage.setItem(WARN_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/** Menutup peringatan (cadangan datanya tetap disimpan). */
export function dismissStorageWarnings() {
  try {
    window.localStorage.removeItem(WARN_KEY);
  } catch {
    /* abaikan */
  }
}

/** Menentukan alasan: JSON valid dengan versi lain → versi_berbeda; selain itu rusak. */
export function unreadableReason(raw: string): StorageWarning["reason"] {
  try {
    const v = (JSON.parse(raw) as { version?: unknown } | null)?.version;
    return v !== undefined && v !== 1 ? "versi_berbeda" : "rusak";
  } catch {
    return "rusak";
  }
}
