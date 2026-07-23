"use client";

import { useEffect, useState } from "react";
import type { Category, Menu, MenuItem, I18nText } from "@/lib/types";
import type { OptionGroup, OptionChoice } from "@/lib/options";
import UploadButton from "./UploadButton";
import BulkImport from "./BulkImport";
import { useLang, pickLang, type Lang } from "@/lib/i18n";
import { formatMoney } from "@/lib/options";

// Panelde düzenlenecek diller (görüntüleme sırası)
const LANG_ORDER: Lang[] = ["tr", "de", "en"];
const LANG_FLAGS: Record<Lang, string> = { tr: "🇹🇷", de: "🇩🇪", en: "🇬🇧" };

// Çok dilli metinden eski (tek dilli) alanı üret: öncelik de → tr → en
const legacyOf = (o: I18nText) => o.de || o.tr || o.en || "";
// "Tümüne kopyala" kaynağı: kullanıcının doldurduğu ilk dil (tr → de → en)
const firstFilled = (o: I18nText) => o.tr || o.de || o.en || "";

// Seçenek grubu/seçeneği için benzersiz id (sunucu eksikleri yine üretir)
function newId() {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

type ProductDraft = {
  categoryId: string;
  id?: string;
  code: string;
  nameI18n: I18nText;
  descriptionI18n: I18nText;
  price: string;
  image: string;
  available: boolean;
  options: OptionGroup[];
};

type CategoryDraft = {
  id?: string;
  nameI18n: I18nText;
  coverSrc: string;
  coverVideo: string;
};

export default function MenuManager() {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [product, setProduct] = useState<ProductDraft | null>(null);
  const [category, setCategory] = useState<CategoryDraft | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { t, lang } = useLang();

  const load = async () => {
    const m = await fetch("/api/menu", { cache: "no-store" }).then((r) => r.json());
    setMenu(m);
  };
  useEffect(() => {
    load();
  }, []);

  const currency = menu?.restaurant.currency ?? "₺";
  // İşletmenin ana dili — tek-alan editörü bu dile yazar (yoksa "de")
  const defaultLang: Lang = (menu?.restaurant.defaultLang ?? "de") as Lang;

  const toggle = async (item: MenuItem) => {
    await fetch("/api/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, available: !item.available }),
    });
    load();
  };

  const removeProduct = async (item: MenuItem) => {
    if (!confirm(`"${item.name}" — ${t("confirmDelProduct")}`)) return;
    await fetch(`/api/products?id=${item.id}`, { method: "DELETE" });
    load();
  };

  const removeCategory = async (cat: Category) => {
    if (!confirm(`"${cat.name}" — ${t("confirmDelCategory")}`)) return;
    await fetch(`/api/categories?id=${cat.id}`, { method: "DELETE" });
    load();
  };

  const saveProduct = async () => {
    if (!product || !legacyOf(product.nameI18n).trim()) return;
    setBusy(true);
    const method = product.id ? "PATCH" : "POST";
    await fetch("/api/products", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: product.id,
        categoryId: product.categoryId,
        code: product.code,
        nameI18n: product.nameI18n,
        descriptionI18n: product.descriptionI18n,
        // eski görünümler için düz alanlar (API de tekrar üretir)
        name: legacyOf(product.nameI18n),
        description: legacyOf(product.descriptionI18n),
        price: Number(product.price) || 0,
        image: product.image,
        available: product.available,
        options: product.options,
      }),
    });
    setBusy(false);
    setProduct(null);
    load();
  };

  const saveCategory = async () => {
    if (!category || !legacyOf(category.nameI18n).trim()) return;
    setBusy(true);
    const method = category.id ? "PATCH" : "POST";
    await fetch("/api/categories", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: category.id,
        nameI18n: category.nameI18n,
        name: legacyOf(category.nameI18n),
        coverSrc: category.coverSrc,
        coverVideo: category.coverVideo,
      }),
    });
    setBusy(false);
    setCategory(null);
    load();
  };

  if (!menu) return <div className="p-8 text-gray-400">{t("uploading")}</div>;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("navMenu")}</h1>
          <p className="text-sm text-gray-500">{t("mmSub")}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setBulkOpen(true)}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t("bulkAdd")}
          </button>
          <button
            onClick={() =>
              setCategory({ nameI18n: {}, coverSrc: "", coverVideo: "" })
            }
            className="rounded-lg bg-[#1c1712] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            {t("addCategory")}
          </button>
        </div>
      </div>

      {bulkOpen && (
        <BulkImport onClose={() => setBulkOpen(false)} onDone={load} />
      )}

      <div className="space-y-6">
        {menu.categories.map((cat) => (
          <div key={cat.id} className="card overflow-hidden">
            <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3">
              {cat.cover.src ? (
                <img
                  src={cat.cover.src}
                  alt=""
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-400">
                  🍽️
                </div>
              )}
              <div className="flex-1">
                <div className="font-semibold">
                  {pickLang(cat.nameI18n, cat.name, lang)}
                </div>
                <div className="text-xs text-gray-400">
                  {cat.items.length} {t("productsWord")}
                  {cat.cover.video ? ` · 🎬 ${t("videoTag")}` : ""}
                </div>
              </div>
              <button
                onClick={() =>
                  setCategory({
                    id: cat.id,
                    nameI18n: cat.nameI18n ?? { [lang]: cat.name },
                    coverSrc: cat.cover.src,
                    coverVideo: cat.cover.video ?? "",
                  })
                }
                className="rounded-md px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
              >
                {t("edit")}
              </button>
              <button
                onClick={() => removeCategory(cat)}
                className="rounded-md px-2.5 py-1.5 text-xs text-accent hover:bg-accent/10"
              >
                {t("del")}
              </button>
              <button
                onClick={() =>
                  setProduct({
                    categoryId: cat.id,
                    code: "",
                    nameI18n: {},
                    descriptionI18n: {},
                    price: "",
                    image: "",
                    available: true,
                    options: [],
                  })
                }
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-[#17130d] hover:brightness-110"
              >
                {t("addProduct")}
              </button>
            </div>

            <ul className="divide-y divide-gray-50">
              {cat.items.length === 0 && (
                <li className="px-5 py-6 text-center text-sm text-gray-400">
                  {t("noProductsInCat")}
                </li>
              )}
              {cat.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-400">
                      🍽️
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">
                      {item.code && (
                        <span className="mr-1.5 font-normal text-gray-400">
                          {item.code}
                        </span>
                      )}
                      {pickLang(item.nameI18n, item.name, lang)}
                    </div>
                    <div className="truncate text-xs text-gray-400">
                      {pickLang(item.descriptionI18n, item.description, lang) || "—"}
                    </div>
                  </div>
                  <div className="w-20 text-right font-semibold">
                    {formatMoney(item.price)} {currency}
                  </div>
                  <button
                    onClick={() => toggle(item)}
                    title={item.available ? t("orderOpen") : t("closedLabel")}
                    className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${
                      item.available ? "bg-emerald-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${
                        item.available ? "left-6" : "left-1"
                      }`}
                    />
                  </button>
                  <button
                    onClick={() =>
                      setProduct({
                        categoryId: cat.id,
                        id: item.id,
                        code: item.code ?? "",
                        nameI18n: item.nameI18n ?? { [lang]: item.name },
                        descriptionI18n:
                          item.descriptionI18n ??
                          (item.description ? { [lang]: item.description } : {}),
                        price: String(item.price),
                        image: item.image,
                        available: item.available,
                        options: item.options ?? [],
                      })
                    }
                    className="rounded-md px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
                  >
                    {t("edit")}
                  </button>
                  <button
                    onClick={() => removeProduct(item)}
                    className="rounded-md px-2.5 py-1.5 text-xs text-accent hover:bg-accent/10"
                  >
                    {t("del")}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Ürün formu */}
      {product && (
        <Modal
          title={product.id ? t("editProduct") : t("newProduct")}
          onClose={() => setProduct(null)}
        >
          <I18nField
            label={t("productName")}
            value={product.nameI18n}
            defaultLang={defaultLang}
            onChange={(v) => setProduct({ ...product, nameI18n: v })}
          />
          <I18nField
            label={t("description")}
            value={product.descriptionI18n}
            defaultLang={defaultLang}
            multiline
            onChange={(v) => setProduct({ ...product, descriptionI18n: v })}
          />
          <Field label={t("productNo")}>
            <input
              value={product.code}
              onChange={(e) => setProduct({ ...product, code: e.target.value })}
              className="input"
              placeholder="70"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`${t("price")} (${currency})`}>
              <input
                type="number"
                value={product.price}
                onChange={(e) => setProduct({ ...product, price: e.target.value })}
                className="input"
                placeholder="0"
              />
            </Field>
            <Field label={t("orderStatusLabel")}>
              <button
                onClick={() => setProduct({ ...product, available: !product.available })}
                className={`h-[42px] w-full rounded-lg text-sm font-medium ${
                  product.available
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {product.available ? t("openState") : t("closedState")}
              </button>
            </Field>
          </div>
          <Field label={t("imageUrlOrUpload")}>
            <input
              value={product.image}
              onChange={(e) => setProduct({ ...product, image: e.target.value })}
              className="input"
              placeholder="https://…"
            />
            <UploadButton
              accept="image/*"
              label={t("uploadImage")}
              onUploaded={(url) => setProduct({ ...product, image: url })}
            />
          </Field>
          {product.image && (
            <img
              src={product.image}
              alt=""
              className="h-24 w-full rounded-lg object-cover"
            />
          )}
          <div className="border-t border-gray-100 pt-4">
            <OptionsEditor
              value={product.options}
              onChange={(o) => setProduct({ ...product, options: o })}
              menu={menu}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={saveProduct}
              disabled={busy}
              className="flex-1 rounded-lg bg-accent py-2.5 font-medium text-white hover:brightness-110 disabled:opacity-50"
            >
              {busy ? t("saving") : t("save")}
            </button>
            <button
              onClick={() => setProduct(null)}
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-gray-600 hover:bg-gray-50"
            >
              {t("cancel")}
            </button>
          </div>
        </Modal>
      )}

      {/* Kategori formu */}
      {category && (
        <Modal
          title={category.id ? t("editCategory") : t("newCategory")}
          onClose={() => setCategory(null)}
        >
          <I18nField
            label={t("categoryName")}
            value={category.nameI18n}
            defaultLang={defaultLang}
            onChange={(v) => setCategory({ ...category, nameI18n: v })}
          />
          <Field label={t("coverImageLabel")}>
            <input
              value={category.coverSrc}
              onChange={(e) => setCategory({ ...category, coverSrc: e.target.value })}
              className="input"
              placeholder="https://…"
            />
            <UploadButton
              accept="image/*"
              label={t("uploadImage")}
              onUploaded={(url) => setCategory({ ...category, coverSrc: url })}
            />
            {category.coverSrc && (
              <img
                src={category.coverSrc}
                alt=""
                className="mt-2 h-20 w-full rounded-lg object-cover"
              />
            )}
          </Field>
          <Field label={t("coverVideoLabel")}>
            <input
              value={category.coverVideo}
              onChange={(e) => setCategory({ ...category, coverVideo: e.target.value })}
              className="input"
              placeholder="https://… .mp4"
            />
            <UploadButton
              accept="video/*"
              label={t("uploadVideo")}
              onUploaded={(url) => setCategory({ ...category, coverVideo: url })}
            />
            {category.coverVideo && (
              <video
                src={category.coverVideo}
                muted
                loop
                autoPlay
                playsInline
                className="mt-2 h-20 w-full rounded-lg object-cover"
              />
            )}
          </Field>
          <div className="mt-4 flex gap-2">
            <button
              onClick={saveCategory}
              disabled={busy}
              className="flex-1 rounded-lg bg-accent py-2.5 font-medium text-white hover:brightness-110 disabled:opacity-50"
            >
              {busy ? t("saving") : t("save")}
            </button>
            <button
              onClick={() => setCategory(null)}
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-gray-600 hover:bg-gray-50"
            >
              {t("cancel")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-500">{label}</span>
      {children}
    </label>
  );
}

// Tek-alan çok dilli editör: varsayılan olarak işletmenin ana diline yazan TEK input.
// "🌐 Diğer diller" ile açılınca 3 dilli tam editör (+ tüm dillere kopyala) görünür.
// Ana dil dışındaki diller (import edilmiş çeviriler) EZİLMEZ — draft'ta olduğu gibi kalır.
function I18nField({
  label,
  value,
  onChange,
  defaultLang,
  multiline,
}: {
  label: string;
  value: I18nText;
  onChange: (next: I18nText) => void;
  defaultLang: Lang;
  multiline?: boolean;
}) {
  const { t } = useLang();
  const [expanded, setExpanded] = useState(false);
  const hint = LANG_ORDER.filter((l) => l !== defaultLang)
    .map((l) => l.toUpperCase())
    .join(" · ");

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <button
          type="button"
          onClick={() => setExpanded((x) => !x)}
          className="text-[11px] font-medium text-accent hover:underline"
        >
          🌐 {expanded ? t("hideLangs") : `${t("otherLangs")} (${hint})`}
        </button>
      </div>

      {expanded ? (
        <div className="space-y-2 rounded-lg bg-gray-50 p-2">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                const src = value[defaultLang] || firstFilled(value);
                onChange({ tr: src, de: src, en: src });
              }}
              className="text-[11px] font-medium text-accent hover:underline"
            >
              {t("copyToAllLangs")}
            </button>
          </div>
          <LangRows
            value={value}
            multiline={multiline}
            onChange={(l, v) => onChange({ ...value, [l]: v })}
          />
        </div>
      ) : multiline ? (
        <textarea
          value={value[defaultLang] ?? ""}
          onChange={(e) => onChange({ ...value, [defaultLang]: e.target.value })}
          className="input h-16 w-full resize-none"
        />
      ) : (
        <input
          value={value[defaultLang] ?? ""}
          onChange={(e) => onChange({ ...value, [defaultLang]: e.target.value })}
          className="input w-full"
        />
      )}
    </div>
  );
}

// TR/DE/EN için üç satır (her satır bayrak + input/textarea)
function LangRows({
  value,
  onChange,
  multiline,
}: {
  value: I18nText;
  onChange: (l: Lang, v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-2">
      {LANG_ORDER.map((l) => (
        <div key={l} className="flex items-start gap-2">
          <span className="w-6 pt-2 text-center text-base leading-none">
            {LANG_FLAGS[l]}
          </span>
          {multiline ? (
            <textarea
              value={value[l] ?? ""}
              onChange={(e) => onChange(l, e.target.value)}
              className="input h-16 flex-1 resize-none"
            />
          ) : (
            <input
              value={value[l] ?? ""}
              onChange={(e) => onChange(l, e.target.value)}
              className="input flex-1"
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Ürünün ek seçenek grupları editörü (grup + seçenek ekle/sil/sırala, çok dilli, kopyala)
function OptionsEditor({
  value,
  onChange,
  menu,
}: {
  value: OptionGroup[];
  onChange: (groups: OptionGroup[]) => void;
  menu: Menu | null;
}) {
  const { t } = useLang();
  const defaultLang: Lang = (menu?.restaurant.defaultLang ?? "de") as Lang;

  const setGroup = (gi: number, patch: Partial<OptionGroup>) =>
    onChange(value.map((g, i) => (i === gi ? { ...g, ...patch } : g)));

  const addGroup = () =>
    onChange([
      ...value,
      { id: newId(), name_i18n: {}, required: false, multi: false, choices: [] },
    ]);

  const removeGroup = (gi: number) => onChange(value.filter((_, i) => i !== gi));

  const moveGroup = (gi: number, dir: -1 | 1) => {
    const j = gi + dir;
    if (j < 0 || j >= value.length) return;
    const next = value.slice();
    [next[gi], next[j]] = [next[j], next[gi]];
    onChange(next);
  };

  const setChoice = (gi: number, ci: number, patch: Partial<OptionChoice>) =>
    setGroup(gi, {
      choices: value[gi].choices.map((c, i) => (i === ci ? { ...c, ...patch } : c)),
    });

  const addChoice = (gi: number) =>
    setGroup(gi, {
      choices: [
        ...value[gi].choices,
        { id: newId(), name_i18n: {}, price_delta: 0 },
      ],
    });

  const removeChoice = (gi: number, ci: number) =>
    setGroup(gi, { choices: value[gi].choices.filter((_, i) => i !== ci) });

  const moveChoice = (gi: number, ci: number, dir: -1 | 1) => {
    const arr = value[gi].choices;
    const j = ci + dir;
    if (j < 0 || j >= arr.length) return;
    const next = arr.slice();
    [next[ci], next[j]] = [next[j], next[ci]];
    setGroup(gi, { choices: next });
  };

  // Seçeneği olan diğer ürünler (kopyalama kaynağı)
  const copySources =
    menu?.categories.flatMap((c) => c.items).filter((it) => it.options?.length) ??
    [];

  const copyFrom = (productId: string) => {
    const src = copySources.find((p) => p.id === productId);
    if (!src?.options) return;
    const cloned: OptionGroup[] = src.options.map((g) => ({
      ...g,
      id: newId(),
      choices: g.choices.map((c) => ({ ...c, id: newId() })),
    }));
    onChange([...value, ...cloned]);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">
          {t("optionsTitle")}
        </span>
        <div className="flex items-center gap-2">
          {copySources.length > 0 && (
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) copyFrom(e.target.value);
                e.currentTarget.value = "";
              }}
              className="rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-600"
            >
              <option value="">{t("copyFromProduct")}…</option>
              {copySources.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code ? `${p.code} · ` : ""}
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={addGroup}
            className="rounded-md bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent hover:bg-accent/20"
          >
            + {t("addGroup")}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {value.map((g, gi) => (
          <div key={g.id} className="rounded-lg border border-gray-200 p-3">
            <div className="mb-2 flex items-start gap-2">
              <div className="flex-1">
                <I18nField
                  label={t("groupName")}
                  value={g.name_i18n}
                  defaultLang={defaultLang}
                  onChange={(v) => setGroup(gi, { name_i18n: v })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => moveGroup(gi, -1)}
                  className="rounded px-1 text-gray-400 hover:bg-gray-100"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveGroup(gi, 1)}
                  className="rounded px-1 text-gray-400 hover:bg-gray-100"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeGroup(gi)}
                  className="rounded px-1 text-accent hover:bg-accent/10"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="mb-2 flex gap-4">
              <label className="flex items-center gap-1.5 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={g.required}
                  onChange={(e) => setGroup(gi, { required: e.target.checked })}
                />
                {t("optRequired")}
              </label>
              <label className="flex items-center gap-1.5 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={g.multi}
                  onChange={(e) => setGroup(gi, { multi: e.target.checked })}
                />
                {t("optMulti")}
              </label>
            </div>

            <div className="space-y-2 border-t border-gray-100 pt-2">
              {g.choices.map((c, ci) => (
                <div key={c.id} className="rounded-md bg-gray-50 p-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <I18nField
                        label={t("choiceName")}
                        value={c.name_i18n}
                        defaultLang={defaultLang}
                        onChange={(v) => setChoice(gi, ci, { name_i18n: v })}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => moveChoice(gi, ci, -1)}
                        className="rounded px-1 text-gray-400 hover:bg-gray-100"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveChoice(gi, ci, 1)}
                        className="rounded px-1 text-gray-400 hover:bg-gray-100"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeChoice(gi, ci)}
                        className="rounded px-1 text-accent hover:bg-accent/10"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-4">
                    <label className="flex items-center gap-1 text-[11px] text-gray-500">
                      {t("extraFee")}
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={c.price_delta}
                        onChange={(e) =>
                          setChoice(gi, ci, {
                            price_delta: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-20 rounded border border-gray-200 px-1.5 py-0.5"
                      />
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <input
                        type="checkbox"
                        checked={!!c.default}
                        onChange={(e) =>
                          setChoice(gi, ci, { default: e.target.checked })
                        }
                      />
                      {t("optDefault")}
                    </label>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addChoice(gi)}
                className="rounded-md border border-dashed border-gray-300 px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-50"
              >
                + {t("addChoice")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
