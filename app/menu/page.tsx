import { readMenu } from "@/lib/data";
import MenuExperience from "@/components/MenuExperience";

export const dynamic = "force-dynamic";

// Tüm masalar için ortak, tek menü. Görüntüleme/önizleme burada.
// (Masaya özel sipariş için /masa/[tableId] QR kodları kullanılır.)
export default async function SharedMenuPage() {
  const menu = await readMenu();
  return <MenuExperience initialMenu={menu} table="Genel" />;
}
