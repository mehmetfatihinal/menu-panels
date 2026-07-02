"use client";

import { useEffect, useState } from "react";
import { startAmbient, stopAmbient } from "@/lib/sounds";

export default function AudioController() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    return () => stopAmbient();
  }, []);

  const toggle = () => {
    if (on) {
      stopAmbient();
      setOn(false);
    } else {
      startAmbient();
      setOn(true);
    }
  };

  return (
    <button
      onClick={toggle}
      title={on ? "Müziği kapat" : "Arka plan müziği"}
      className="sans flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur transition hover:bg-black/50"
    >
      {on ? (
        // çalıyor - eşitleyici ikonu
        <span className="flex items-end gap-[3px]">
          <span className="h-3 w-[3px] animate-[pulse_0.8s_ease-in-out_infinite] bg-white" />
          <span className="h-4 w-[3px] animate-[pulse_0.6s_ease-in-out_infinite] bg-white" />
          <span className="h-2 w-[3px] animate-[pulse_1s_ease-in-out_infinite] bg-white" />
        </span>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      )}
    </button>
  );
}
