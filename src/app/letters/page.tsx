import { redirect } from "next/navigation";
import { LetterForm } from "@/components/letter-form";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { currentUser } from "@/lib/auth";
import { pacificToday } from "@/lib/money";
import { listLetters, listProducts } from "@/lib/records";

export const dynamic = "force-dynamic";

export default async function LettersPage() {
  const user = await currentUser();
  if (!user) redirect("/?next=/letters");
  const [letters, products] = await Promise.all([
    listLetters(user.id),
    listProducts(user.id),
  ]);
  const [year, month, day] = pacificToday().split("-");
  const defaultExpires = `${Number(year) + 1}-${month}-${day}`;
  const categories = [...new Set(products.map((product) => product.category))];
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <LetterForm
          categories={categories}
          defaultExpires={defaultExpires}
          letters={letters}
        />
      </main>
      <SiteFooter />
    </>
  );
}
