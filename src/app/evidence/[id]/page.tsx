import { notFound, redirect } from "next/navigation";
import { ExhibitDocument } from "@/components/exhibit-document";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { currentUser } from "@/lib/auth";
import { getExhibit } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ExhibitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/?next=/evidence");
  const { id } = await params;
  const exhibit = await getExhibit(user.id, id);
  if (!exhibit) notFound();
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <ExhibitDocument exhibit={exhibit} />
      </main>
      <SiteFooter />
    </>
  );
}
