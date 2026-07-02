import { NextResponse } from "next/server";
import { readMenu, readOrders, writeOrders } from "@/lib/data";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

// Siparişleri listele (admin paneli için)
export async function GET() {
  const orders = await readOrders();
  return NextResponse.json({ orders });
}

// Yeni sipariş oluştur (müşteri menüsünden)
export async function POST(req: Request) {
  const body = await req.json();
  const { table, lines } = body as {
    table: string;
    lines: { id: string; qty: number; note?: string }[];
  };

  if (!table || !Array.isArray(lines) || lines.length === 0) {
    return NextResponse.json({ error: "Sepet boş" }, { status: 400 });
  }

  // Fiyat ve stok durumunu sunucu tarafında doğrula (güvenlik)
  const menu = await readMenu();
  const allItems = menu.categories.flatMap((c) => c.items);

  const validated: Order["lines"] = [];
  for (const line of lines) {
    const item = allItems.find((i) => i.id === line.id);
    if (!item) continue;
    if (!item.available) {
      return NextResponse.json(
        { error: `"${item.name}" şu anda mevcut değil.` },
        { status: 409 }
      );
    }
    validated.push({
      id: item.id,
      name: item.name,
      price: item.price,
      qty: Math.max(1, Math.min(99, Math.floor(line.qty))),
      note: line.note,
    });
  }

  if (validated.length === 0) {
    return NextResponse.json({ error: "Geçerli ürün yok" }, { status: 400 });
  }

  const total = validated.reduce((s, l) => s + l.price * l.qty, 0);

  const order: Order = {
    id: "SIP-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
    table: String(table),
    createdAt: new Date().toISOString(),
    status: "yeni",
    lines: validated,
    total,
  };

  const orders = await readOrders();
  orders.unshift(order);
  await writeOrders(orders);

  return NextResponse.json({ ok: true, order });
}

// Sipariş durumunu güncelle (admin)
export async function PATCH(req: Request) {
  const { id, status } = await req.json();
  const orders = await readOrders();
  const order = orders.find((o) => o.id === id);
  if (!order) {
    return NextResponse.json({ error: "Sipariş bulunamadı" }, { status: 404 });
  }
  order.status = status;
  await writeOrders(orders);
  return NextResponse.json({ ok: true });
}
