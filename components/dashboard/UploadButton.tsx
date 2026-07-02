"use client";

import { useRef, useState } from "react";
import { uploadToStorage } from "@/lib/upload";

export default function UploadButton({
  accept,
  label,
  onUploaded,
}: {
  accept: string;
  label: string;
  onUploaded: (url: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const url = await uploadToStorage(file);
      onUploaded(url);
    } catch (e: any) {
      setErr(e.message || "Yükleme başarısız");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div className="mt-1.5">
      <input
        ref={ref}
        type="file"
        accept={accept}
        onChange={onChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:opacity-60"
      >
        {busy ? (
          "Yükleniyor…"
        ) : (
          <>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            {label}
          </>
        )}
      </button>
      {err && <p className="mt-1 text-xs text-accent">{err}</p>}
    </div>
  );
}
