import { readMenu } from "@/lib/data";
import AdminPanel from "@/components/AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const menu = await readMenu();
  return <AdminPanel initialMenu={menu} />;
}
