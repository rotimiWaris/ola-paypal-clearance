"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categoryLabel, formatUsd } from "@/lib/money";
import type { Product } from "@/lib/types";

export function ShelfEditor({
  merchantName,
  merchantPlace,
  products,
}: {
  merchantName: string;
  merchantPlace: string;
  products: (Product & { id: string })[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const categories = [...new Set(products.map((product) => product.category))];

  async function saveCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setCompanyError(null);
    const response = await fetch("/api/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchantName: form.get("merchantName"),
        merchantPlace: form.get("merchantPlace"),
      }),
    });
    const body = (await response.json()) as { error?: string };
    setPending(false);
    if (!response.ok) {
      setCompanyError(body.error || "The company could not be saved.");
      return;
    }
    router.refresh();
  }

  async function addProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setError(null);
    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        category: data.get("category"),
        price: data.get("price"),
        note: data.get("note"),
        subscription: data.get("subscription") === "on",
      }),
    });
    const body = (await response.json()) as { error?: string };
    setPending(false);
    if (!response.ok) {
      setError(body.error || "The product could not be added.");
      return;
    }
    form.reset();
    router.refresh();
  }

  async function remove(id: string) {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
    setPending(false);
    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setError(body.error || "The product could not be removed.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-10">
      <div>
        <p className="text-[11px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
          Shelf
        </p>
        <h1 className="mt-2 font-heading text-4xl tracking-tight sm:text-5xl">
          What the agent is allowed to name
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Prices live here. A cart cannot invent a price, and it cannot order
          a product you have not listed.
        </p>
      </div>

      <form
        className="grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        onSubmit={(event) => void saveCompany(event)}
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Company
          <Input
            name="merchantName"
            defaultValue={merchantName}
            required
            className="h-11 bg-background"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          City
          <Input
            name="merchantPlace"
            defaultValue={merchantPlace}
            className="h-11 bg-background"
          />
        </label>
        <Button type="submit" className="h-11" disabled={pending}>
          Save company
        </Button>
        {companyError ? (
          <p className="text-sm text-destructive sm:col-span-3">{companyError}</p>
        ) : null}
      </form>

      <form
        className="grid gap-3 rounded-2xl border border-border bg-card p-5"
        onSubmit={(event) => void addProduct(event)}
      >
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
          Add a product
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Name
            <Input name="name" required className="h-11 bg-background" placeholder="Espresso beans, 1 kg" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Category
            <Input
              name="category"
              required
              list="categories"
              className="h-11 bg-background"
              placeholder="pantry"
            />
            <datalist id="categories">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Price, USD
            <Input name="price" required inputMode="decimal" className="h-11 bg-background" placeholder="22.00" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Note
            <Input name="note" className="h-11 bg-background" placeholder="Optional" />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input name="subscription" type="checkbox" className="size-4 accent-primary" />
          This product renews on its own
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div>
          <Button type="submit" className="h-11" disabled={pending}>
            Add to the shelf
          </Button>
        </div>
      </form>

      {products.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-5 py-8 text-sm">
          The shelf is empty. Add the first product, then write a letter that
          names which categories a buyer may order.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {products.map((product) => (
            <li key={product.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {categoryLabel(product.category)}
                  {product.subscription ? " · subscription" : ""}
                  {product.note ? ` · ${product.note}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <p className="font-heading text-2xl tabular-nums">
                  {formatUsd(product.unitPriceCents)}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => void remove(product.id)}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
