import { redirect } from "next/navigation";
import { getCurrentBusiness } from "@/lib/business";
import OrdersManager from "@/components/dashboard/OrdersManager";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  // Sadece menü modunda sipariş sayfasına doğrudan erişimi engelle
  const business = await getCurrentBusiness();
  if (business && business.orders_enabled === false) redirect("/dashboard");
  return <OrdersManager />;
}
