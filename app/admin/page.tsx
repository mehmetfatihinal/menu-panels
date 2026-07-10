import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { listBusinessesWithOwners } from "@/lib/admin-data";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const rows = await listBusinessesWithOwners();
  return <AdminDashboard rows={rows} />;
}
