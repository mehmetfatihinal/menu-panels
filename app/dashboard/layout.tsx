import Sidebar from "@/components/dashboard/Sidebar";
import MobileNav from "@/components/dashboard/MobileNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard min-h-screen bg-gray-100 md:flex">
      <div className="hidden md:sticky md:top-0 md:block md:h-screen">
        <Sidebar />
      </div>
      <MobileNav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
