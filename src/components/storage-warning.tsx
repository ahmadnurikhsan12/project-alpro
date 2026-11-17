"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { dismissStorageWarnings, readStorageWarnings, type StorageWarning } from "@/lib/storage/backup";

/** Peringatan bila data lokal tidak dapat dibaca. Data lama sudah disalin ke cadangan, bukan dihapus. */
export function StorageWarningBanner() {
  const [warnings, setWarnings] = useState<StorageWarning[]>([]);
  useEffect(() => {
    setWarnings(readStorageWarnings());
    // komponen halaman membaca data setelah banner dipasang; baca ulang sebentar kemudian
    const t = window.setTimeout(() => setWarnings(readStorageWarnings()), 600);
    return () => window.clearTimeout(t);
  }, []);
  if (warnings.length === 0) return null;
  return (
    <div role="alert" data-testid="storage-warning" className="mb-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div className="flex-1">
        <p className="font-semibold">Sebagian data di perangkat ini tidak dapat dibaca.</p>
        <p className="mt-1">
          Data lama (rusak atau dari versi aplikasi lain) tidak dihapus: salinannya disimpan di browser ini ({warnings.map((w) => w.backupKey).join(", ")}). Jangan menghapus data situs, dan beri tahu guru
          sebelum melanjutkan agar data dapat diselamatkan.
        </p>
        <button
          type="button"
          className="mt-2 rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-sm font-semibold text-amber-900 hover:bg-amber-100"
          onClick={() => {
            dismissStorageWarnings();
            setWarnings([]);
          }}
        >
          Saya sudah membaca
        </button>
      </div>
    </div>
  );
}
