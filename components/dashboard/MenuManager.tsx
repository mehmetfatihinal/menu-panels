"use client";

import { useEffect, useState } from "react";
import type { Category, Menu, MenuItem } from "@/lib/types";
import UploadButton from "./UploadButton";
import BulkImport from "./BulkImport";
import { useLang } from "@/lib/i18n";

type ProductDraft = {
  categoryId: string;
  id?: string;
  name: string;
  description: string;
  price: string;
  image: string;
  available: boolean;
};

type CategoryDraft = {
  id?: string;
  name: string;
  coverSrc: string;
  coverVideo: string;
};

export default function MenuManager() {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [product, setProduct] = useState<ProductDraft | null>(null);
  const [category, setCategory] = useState<CategoryDraft | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { t } = useLang();

  const load = async () => {
    const m = await fetch("/api/menu", { cache: "no-store" }).then((r) => r.json());
    setMenu(m);
  };
  useEffect(() => {
    load();
  }, []);

  const currency = menu?.restaurant.currency ?? "₺";

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
    if (!product || !product.name.trim()) return;
    setBusy(true);
    const method = product.id ? "PATCH" : "POST";
    await fetch("/api/products", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: product.id,
        categoryId: product.categoryId,
        name: product.name,
        description: product.description,
        price: Number(product.price) || 0,
        image: product.image,
        available: product.available,
      }),
    });
    setBusy(false);
    setProduct(null);
    load();
  };

  const saveCategory = async () => {
    if (!category || !category.name.trim()) return;
    setBusy(true);
    const method = category.id ? "PATCH" : "POST";
    await fetch("/api/categories", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: category.id,
        name: category.name,
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
              setCategory({ name: "", coverSrc: "", coverVideo: "" })
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
              <img
                src={cat.cover.src}
                alt=""
                className="h-10 w-10 rounded-lg object-cover"
              />
              <div className="flex-1">
                <div className="font-semibold">{cat.name}</div>
                <div className="text-xs text-gray-400">
                  {cat.items.length} {t("productsWord")}
                  {cat.cover.video ? ` · 🎬 ${t("videoTag")}` : ""}
                </div>
              </div>
              <button
                onClick={() =>
                  setCategory({
                    id: cat.id,
                    name: cat.name,
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
                    name: "",
                    description: "",
                    price: "",
                    image: "",
                    available: true,
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
                  <img
                    src={item.image}
                    alt=""
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{item.name}</div>
                    <div className="truncate text-xs text-gray-400">
                      {item.description || "—"}
                    </div>
                  </div>
                  <div className="w-20 text-right font-semibold">
                    {item.price} {currency}
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
                        name: item.name,
                        description: item.description,
                        price: String(item.price),
                        image: item.image,
                        available: item.available,
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
          <Field label={t("productName")}>
            <input
              value={product.name}
              onChange={(e) => setProduct({ ...product, name: e.target.value })}
              className="input"
              placeholder="Adana Kebap"
            />
          </Field>
          <Field label={t("description")}>
            <textarea
              value={product.description}
              onChange={(e) => setProduct({ ...product, description: e.target.value })}
              className="input h-20 resize-none"
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
          <Field label={t("categoryName")}>
            <input
              value={category.name}
              onChange={(e) => setCategory({ ...category, name: e.target.value })}
              className="input"
            />
          </Field>
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
