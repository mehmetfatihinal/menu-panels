import { readMenu } from "@/lib/data";
import MenuExperience from "@/components/MenuExperience";

export const dynamic = "force-dynamic";

export default async function TablePage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId } = await params;
  const menu = await readMenu();
  return <MenuExperience initialMenu={menu} table={decodeURIComponent(tableId)} />;
}
