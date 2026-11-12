import { Desk } from "@/components/desk";
import { Gate } from "@/components/gate";
import { Setup } from "@/components/setup";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { currentUser, safeNext } from "@/lib/auth";
import { listLetters, listProducts } from "@/lib/records";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string; letter?: string; next?: string }>;
}) {
  const params = await searchParams;
  const user = await currentUser();
  if (!user) {
    return (
      <>
        <SiteHeader />
        <main className="flex-1">
          <Gate next={safeNext(params.next)} />
        </main>
        <SiteFooter />
      </>
    );
  }
  const [letters, products] = await Promise.all([
    listLetters(user.id),
    listProducts(user.id),
  ]);
  const active =
    letters.find((item) => item.id === params.letter) ?? letters[0] ?? null;
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {active && products.length > 0 ? (
          <Desk
            letter={active}
            letters={letters.map((item) => ({
              id: item.id,
              buyerName: item.buyerName,
              buyerOrg: item.buyerOrg,
            }))}
            products={products}
            hash={active.hash}
            cancelled={params.cancelled === "1"}
          />
        ) : (
          <Setup
            merchant={user.merchantName}
            hasProducts={products.length > 0}
            hasLetters={letters.length > 0}
          />
        )}
      </main>
      <SiteFooter />
    </>
  );
}
