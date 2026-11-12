import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Setup({
  merchant,
  hasProducts,
  hasLetters,
}: {
  merchant: string;
  hasProducts: boolean;
  hasLetters: boolean;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-12">
      <div>
        <p className="text-[11px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
          {merchant}
        </p>
        <h1 className="mt-2 font-heading text-4xl tracking-tight sm:text-5xl">
          The desk is waiting on a shelf and a letter.
        </h1>
        <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground">
          Clearance checks an agent&apos;s cart against a letter you sign.
          Stock the products first, then name the buyer and the limits.
        </p>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2">
        <li className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            {hasProducts ? "Shelf is stocked" : "Step one"}
          </p>
          <h2 className="mt-2 font-heading text-2xl">What you sell</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Each product has a price, a category, and whether it renews.
            The agent can only order what is on this shelf.
          </p>
          <Button
            className="mt-4 h-11"
            nativeButton={false}
            render={<Link href="/shelf" />}
          >
            {hasProducts ? "Edit the shelf" : "Stock the shelf"}
          </Button>
        </li>
        <li className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            {hasLetters ? "A letter is signed" : "Step two"}
          </p>
          <h2 className="mt-2 font-heading text-2xl">The buyer&apos;s letter</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Categories, a unit price, a quantity, subscriptions, and a basket
            cap. Saving the letter signs it.
          </p>
          <Button
            className="mt-4 h-11"
            variant={hasProducts ? "default" : "outline"}
            nativeButton={false}
            render={<Link href="/letters" />}
          >
            {hasLetters ? "See the letters" : "Write a letter"}
          </Button>
        </li>
      </ol>
    </div>
  );
}
