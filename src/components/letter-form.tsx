"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categoryLabel, formatUsd, formatWhen } from "@/lib/money";
import type { Mandate } from "@/lib/types";

export function LetterForm({
  categories,
  defaultExpires,
  letters,
}: {
  categories: string[];
  defaultExpires: string;
  letters: (Mandate & { hash: string })[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const response = await fetch("/api/letters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerName: form.get("buyerName"),
        buyerRole: form.get("buyerRole"),
        buyerOrg: form.get("buyerOrg"),
        categories: form.getAll("categories"),
        maxUnitPrice: form.get("maxUnitPrice"),
        maxBasket: form.get("maxBasket"),
        maxQty: Number(form.get("maxQty")),
        expiresOn: form.get("expiresOn"),
        allowSubscriptions: form.get("allowSubscriptions") === "on",
      }),
    });
    const body = (await response.json()) as { error?: string; letter?: { id: string } };
    setPending(false);
    if (!response.ok || !body.letter) {
      setError(body.error || "The letter could not be signed.");
      return;
    }
    router.push(`/?letter=${body.letter.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div>
        <p className="text-[11px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
          Letter of authority
        </p>
        <h1 className="mt-2 font-heading text-4xl tracking-tight sm:text-5xl">
          Write the limits the buyer is signing.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Saving this letter signs it. Clearance stores a SHA-256 of the
          limits, and every cart is checked against that copy.
        </p>
        {categories.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-border px-5 py-8 text-sm">
            Add products on the shelf first. A letter can only allow categories
            you already sell.
          </p>
        ) : (
          <form
            className="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-card p-5"
            onSubmit={(event) => void submit(event)}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Buyer
                <Input name="buyerName" required className="h-11 bg-background" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Role
                <Input name="buyerRole" className="h-11 bg-background" placeholder="Office manager" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
                Organization
                <Input name="buyerOrg" required className="h-11 bg-background" />
              </label>
            </div>
            <fieldset>
              <legend className="text-sm font-medium">Categories the letter allows</legend>
              <div className="mt-2 flex flex-wrap gap-3">
                {categories.map((category) => (
                  <label key={category} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="categories"
                      value={category}
                      defaultChecked
                      className="size-4 accent-primary"
                    />
                    {categoryLabel(category)}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Max unit price
                <Input name="maxUnitPrice" required inputMode="decimal" className="h-11 bg-background" placeholder="24" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Max basket
                <Input name="maxBasket" required inputMode="decimal" className="h-11 bg-background" placeholder="80" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Max quantity
                <Input name="maxQty" required type="number" min={1} max={24} defaultValue={4} className="h-11 bg-background" />
              </label>
            </div>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              In force through
              <Input name="expiresOn" required type="date" defaultValue={defaultExpires} className="h-11 bg-background" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input name="allowSubscriptions" type="checkbox" className="size-4 accent-primary" />
              Subscriptions are authorized
            </label>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div>
              <Button type="submit" className="h-11" disabled={pending}>
                {pending ? "Signing…" : "Sign the letter"}
              </Button>
            </div>
          </form>
        )}
      </div>
      <aside className="flex flex-col gap-3">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
          Signed letters
        </p>
        {letters.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm">
            None yet.
          </p>
        ) : (
          letters.map((letter) => (
            <a
              key={letter.id}
              href={`/?letter=${letter.id}`}
              className="rounded-2xl border border-border bg-card px-4 py-4 hover:border-brass/60"
            >
              <p className="font-heading text-2xl">{letter.buyerName}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {letter.buyerRole}, {letter.buyerOrg}
              </p>
              <p className="mt-3 text-sm">
                {formatUsd(letter.maxUnitPriceCents)} each · {letter.maxQtyPerSku} of one item ·{" "}
                {formatUsd(letter.maxBasketCents)} basket
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Through {formatWhen(letter.expiresAt)}
              </p>
            </a>
          ))
        )}
      </aside>
    </div>
  );
}
