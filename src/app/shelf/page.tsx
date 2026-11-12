import { redirect } from "next/navigation";
import { ShelfEditor } from "@/components/shelf-editor";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { currentUser } from "@/lib/auth";
import { listProducts } from "@/lib/records";

export const dynamic = "force-dynamic";

export default async function ShelfPage() {
  const user = await currentUser();
  if (!user) redirect("/?next=/shelf");
  const products = await listProducts(user.id);
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <ShelfEditor
          merchantName={user.merchantName}
          merchantPlace={user.merchantPlace}
          products={products}
        />
      </main>
      <SiteFooter />
    </>
  );
}
