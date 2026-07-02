import { notFound } from "next/navigation";
import { getMenuBySlug } from "@/lib/business";
import MenuExperience from "@/components/MenuExperience";

export const dynamic = "force-dynamic";

// İşletmenin ortak menüsü (masa ayrımı olmadan görüntüleme)
export default async function PublicMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getMenuBySlug(slug);
  if (!result) notFound();
  return <MenuExperience initialMenu={result.menu} table="Genel" slug={slug} />;
}
