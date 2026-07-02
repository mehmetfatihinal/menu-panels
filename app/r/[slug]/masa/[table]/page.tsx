import { notFound } from "next/navigation";
import { getMenuBySlug } from "@/lib/business";
import MenuExperience from "@/components/MenuExperience";

export const dynamic = "force-dynamic";

// Masaya özel menü — QR bu adrese gider (sipariş bu masaya yazılır)
export default async function PublicTableMenu({
  params,
}: {
  params: Promise<{ slug: string; table: string }>;
}) {
  const { slug, table } = await params;
  const result = await getMenuBySlug(slug);
  if (!result) notFound();
  return (
    <MenuExperience
      initialMenu={result.menu}
      table={decodeURIComponent(table)}
      slug={slug}
    />
  );
}
