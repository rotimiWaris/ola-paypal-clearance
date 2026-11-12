"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Gate({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        mode === "signup" ? "/api/auth/signup" : "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "The account request failed.");
      router.push(mode === "signup" ? "/shelf" : next);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The account request failed.");
      setPending(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-12 lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-start">
      <div>
        <p className="text-[11px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
          Merchant desk
        </p>
        <h1 className="mt-2 font-heading text-4xl tracking-tight sm:text-5xl">
          Your shelf. Their letter. Then PayPal.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
          Create an account for your company. Stock what you sell, then write
          the letter a buyer signs: the categories, the price caps, and how
          long it lasts. An agent may propose a cart. Clearance accepts it
          only when every limit holds, and only then does PayPal see the order.
        </p>
      </div>
      <form
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5"
        onSubmit={(event) => void submit(event)}
      >
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === "signup" ? "default" : "outline"}
            className="h-11 flex-1"
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
          >
            Create an account
          </Button>
          <Button
            type="button"
            variant={mode === "login" ? "default" : "outline"}
            className="h-11 flex-1"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
          >
            Sign in
          </Button>
        </div>
        {mode === "signup" ? (
          <>
            <Field label="Your name" name="name" autoComplete="name" />
            <Field label="Company" name="merchantName" autoComplete="organization" />
            <Field label="City" name="merchantPlace" autoComplete="address-level2" />
          </>
        ) : null}
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
        {mode === "signup" ? (
          <p className="text-sm leading-6 text-muted-foreground">
            The buyer is not this account. After you sign in, you write their
            letter and the limits their agent has to live inside.
          </p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="h-11" disabled={pending}>
          {pending ? "Saving…" : mode === "signup" ? "Create the desk" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      <Input name={name} type={type} autoComplete={autoComplete} required className="h-11 bg-background" />
    </label>
  );
}
