import { redirect } from "next/navigation";
import { getCurrentBusiness } from "@/lib/business";
import { LangProvider } from "@/lib/i18n";
import Sidebar from "@/components/dashboard/Sidebar";
import MobileNav from "@/components/dashboard/MobileNav";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const business = await getCurrentBusiness();
  if (!business) redirect("/login");

  return (
    <LangProvider>
      <div className="dashboard min-h-screen bg-gray-100 md:flex">
        <div className="hidden md:sticky md:top-0 md:block md:h-screen">
          <Sidebar slug={business.slug} name={business.name} />
        </div>
        <MobileNav slug={business.slug} />
        <main className="flex-1">{children}</main>
      </div>
    </LangProvider>
  );
}
