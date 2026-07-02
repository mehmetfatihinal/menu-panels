"use client";

// Hafif bir ses motoru: harici mp3 dosyasına gerek kalmadan
// sayfa çevirme efektini ve arka plan ambient müziğini Web Audio ile üretir.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// --- Gerçek ses dosyası (Pixabay page-flip) + sentez yedeği ---
// public/sounds/page-flip.mp3 varsa onu çalar; yoksa aşağıdaki sentezlenmiş
// kağıt sesine düşer. Dosya bir kez indirilip AudioBuffer olarak önbelleğe alınır.
const FLIP_FILE = "/sounds/page-flip.mp3";
let flipBuffer: AudioBuffer | null = null;
let flipState: "idle" | "loading" | "ok" | "missing" = "idle";
// arrayBuffer'ı erkenden (kullanıcı etkileşiminden önce) indirmeye başla
const flipBytesPromise: Promise<ArrayBuffer | null> | null =
  typeof window !== "undefined"
    ? fetch(FLIP_FILE)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .catch(() => null)
    : null;

function ensureFlipBuffer(ac: AudioContext) {
  if (flipState === "loading" || flipState === "ok" || flipState === "missing") return;
  flipState = "loading";
  Promise.resolve(flipBytesPromise).then((bytes) => {
    if (!bytes) {
      flipState = "missing";
      return;
    }
    ac.decodeAudioData(
      bytes.slice(0),
      (buf) => {
        flipBuffer = buf;
        flipState = "ok";
      },
      () => {
        flipState = "missing";
      }
    );
  });
}

/**
 * Sayfa çevirme sesi.
 * Öncelik: public/sounds/page-flip.mp3 (gerçek kayıt).
 * Yoksa: sayfanın havada yay çizip masaya oturmasını taklit eden sentez ses.
 */
export function playPageFlip() {
  const ac = getCtx();
  if (!ac) return;

  ensureFlipBuffer(ac);

  // Gerçek dosya hazırsa onu çal
  if (flipState === "ok" && flipBuffer) {
    const src = ac.createBufferSource();
    src.buffer = flipBuffer;
    const g = ac.createGain();
    g.gain.value = 0.9;
    src.connect(g).connect(ac.destination);
    src.start();
    return;
  }

  // Aksi halde sentezlenmiş kağıt sesi (yedek)
  const t0 = ac.currentTime;
  const dur = 0.5 + Math.random() * 0.12;

  // Beyaz gürültü kaynağı
  const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const src = ac.createBufferSource();
  src.buffer = buffer;

  // "Whoosh": sayfanın havadaki arkı — frekans 2600Hz'den 600Hz'e süpürülür
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 0.8;
  const startF = 2400 + Math.random() * 500;
  bp.frequency.setValueAtTime(startF, t0);
  bp.frequency.exponentialRampToValueAtTime(620, t0 + dur);

  // Çift tepeli zarf: kalkış (fwip) -> arkta yumuşama -> masaya oturma (tap)
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.4, t0 + 0.04);
  g.gain.exponentialRampToValueAtTime(0.1, t0 + dur * 0.5);
  g.gain.exponentialRampToValueAtTime(0.5, t0 + dur * 0.66);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  // İnce çıtırtı katmanı: kağıdın yüksek frekanslı hışırtısı
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 2000;
  const gc = ac.createGain();
  gc.gain.setValueAtTime(0.0001, t0);
  gc.gain.exponentialRampToValueAtTime(0.14, t0 + 0.05);
  gc.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 0.9);

  src.connect(bp).connect(g).connect(ac.destination);
  src.connect(hp).connect(gc).connect(ac.destination);

  src.start(t0);
  src.stop(t0 + dur);
}

/** Ürün sepete eklenince kısa, hoş bir "tık" sesi. */
export function playPop() {
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(520, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(880, ac.currentTime + 0.12);
  gain.gain.setValueAtTime(0.0001, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.25);
  osc.connect(gain).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 0.25);
}

// --- Arka plan ambient müziği ---
let ambientNodes: { osc: OscillatorNode[]; master: GainNode } | null = null;

/** Yumuşak, döngüsel bir akor pad'i başlatır. */
export function startAmbient() {
  const ac = getCtx();
  if (!ac || ambientNodes) return;

  const master = ac.createGain();
  master.gain.setValueAtTime(0.0001, ac.currentTime);
  master.gain.exponentialRampToValueAtTime(0.06, ac.currentTime + 2);
  master.connect(ac.destination);

  // sıcak, sakin bir akor (Am9 civarı)
  const freqs = [220, 261.63, 329.63, 392];
  const osc: OscillatorNode[] = [];

  freqs.forEach((f, i) => {
    const o = ac.createOscillator();
    o.type = i % 2 === 0 ? "sine" : "triangle";
    o.frequency.value = f;

    // hafif çok sesli / detune ile canlılık
    const detune = ac.createOscillator();
    detune.frequency.value = 0.05 + i * 0.03;
    const detuneGain = ac.createGain();
    detuneGain.gain.value = 3;
    detune.connect(detuneGain).connect(o.detune);

    const g = ac.createGain();
    g.gain.value = 0.25 / freqs.length;

    o.connect(g).connect(master);
    o.start();
    detune.start();
    osc.push(o, detune);
  });

  ambientNodes = { osc, master };
}

export function stopAmbient() {
  const ac = getCtx();
  if (!ac || !ambientNodes) return;
  const { osc, master } = ambientNodes;
  master.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 1.5);
  const stopAt = ac.currentTime + 1.6;
  osc.forEach((o) => o.stop(stopAt));
  ambientNodes = null;
}

export function isAmbientPlaying() {
  return ambientNodes !== null;
}
