"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { categoryLabel, formatUsd, formatWhen } from "@/lib/money";
import { agentCredit } from "@/lib/present";
import type { Exhibit, Mandate, Product, Verdict } from "@/lib/types";
import { cn } from "cn";

export function Desk({
  letter,
  letters,
  products,
  hash,
  cancelled,
}: {
  letter: Mandate & { hash: string };
  letters: { id: string; buyerName: string; buyerOrg: string }[];
  products: Product[];
  hash: string;
  cancelled: boolean;
}) {
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<"idle" | "working" | "ready" | "sending">("idle");
  const [paypal, setPaypal] = useState<boolean | null>(null);
  const [exhibit, setExhibit] = useState<Exhibit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/status")
      .then((response) => response.json())
      .then((body: { paypal?: boolean }) => {
        if (active) setPaypal(Boolean(body.paypal));
      })
      .catch(() => {
        if (active) setPaypal(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Tell the agent what to order. Name a product from the shelf.");
      return;
    }
    setPhase("working");
    setError(null);
    setExhibit(null);
    try {
      const response = await fetch("/api/exhibits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, letterId: letter.id }),
      });
      const body = (await response.json()) as { exhibit?: Exhibit; error?: string };
      if (!response.ok || !body.exhibit) {
        throw new Error(body.error || "The desk could not file this cart.");
      }
      setExhibit(body.exhibit);
      setPhase("ready");
    } catch (caught) {
      setPhase("idle");
      setError(caught instanceof Error ? caught.message : "The request failed.");
    }
  }

  async function settle() {
    if (!exhibit) return;
    setPhase("sending");
    setError(null);
    try {
      const path = paypal
        ? `/api/exhibits/${exhibit.id}/paypal`
        : `/api/exhibits/${exhibit.id}/rehearse`;
      const response = await fetch(path, { method: "POST" });
      const body = (await response.json()) as {
        exhibit?: Exhibit;
        approveUrl?: string;
        error?: string;
        debugId?: string;
      };
      if (!response.ok || !body.exhibit) {
        throw new Error(
          [body.error, body.debugId ? `Debug ${body.debugId}` : ""]
            .filter(Boolean)
            .join(" "),
        );
      }
      setExhibit(body.exhibit);
      if (body.approveUrl) {
        window.location.href = body.approveUrl;
        return;
      }
      setPhase("ready");
    } catch (caught) {
      setPhase("ready");
      setError(caught instanceof Error ? caught.message : "Settlement failed.");
    }
  }

  const verdict = exhibit?.verdict;
  const busy = phase === "working" || phase === "sending";

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-10 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
      <LetterCard
        letter={letter}
        letters={letters}
        hash={hash}
        copied={copied}
        onCopy={() => setCopied(true)}
      />
      <section className="flex min-w-0 flex-col gap-6">
        <div>
          <p className="text-[11px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
            Settlement desk
          </p>
          <h1 className="mt-2 font-heading text-4xl tracking-tight sm:text-5xl">
            Hold the cart. Then pay.
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground">
            {letter.buyerName}&apos;s agent may propose an order for{" "}
            {letter.buyerOrg}. {letter.merchantName} settles it in PayPal only
            after every limit in the letter holds.
          </p>
          {paypal === null ? null : (
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <span
                className={cn("size-1.5 rounded-full", paypal ? "bg-pass" : "bg-brass")}
                aria-hidden
              />
              {paypal
                ? "PayPal sandbox connected"
                : "Decisions are live. Settlement files as a rehearsal until PayPal is connected."}
            </p>
          )}
        </div>

        {cancelled ? (
          <p className="rounded-xl border border-brass/50 bg-card px-4 py-3 text-sm">
            PayPal approval was cancelled. The cart was not captured.
          </p>
        ) : null}

        <form
          className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void ask(prompt);
          }}
        >
          <label className="text-sm font-medium" htmlFor="request">
            What should {letter.buyerName}&apos;s agent ask for?
          </label>
          <Textarea
            id="request"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={3}
            disabled={busy}
            className="min-h-24 bg-background"
            placeholder="Name products from the shelf, and how many."
          />
          <div>
            <Button type="submit" disabled={busy} className="h-11 px-4">
              {phase === "working" ? "Writing the cart…" : "Ask the agent"}
            </Button>
          </div>
          <div>
            <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
              On the shelf
            </p>
            <ul className="mt-3 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
              {products.map((product) => (
                <li key={product.sku} className="bg-background">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      setPrompt((current) =>
                        current.trim() ? `${current.trim()}, ${product.name}` : product.name,
                      )
                    }
                    className="h-auto w-full justify-between gap-3 rounded-none px-3 py-2.5 text-left whitespace-normal"
                  >
                    <span>
                      <span className="block font-medium">{product.name}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {categoryLabel(product.category)}
                        {product.subscription ? " · subscription" : ""}
                      </span>
                    </span>
                    <span className="shrink-0 font-normal text-muted-foreground tabular-nums">
                      {formatUsd(product.unitPriceCents)}
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </form>

        {error ? (
          <p className="rounded-xl border border-destructive/40 bg-card px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {phase === "working" ? (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            The agent is writing a cart. The letter has not been applied yet.
          </p>
        ) : null}

        {phase === "idle" && !exhibit ? (
          <div className="rounded-2xl border border-dashed border-border px-5 py-8">
            <p className="font-heading text-2xl">Nothing has been filed on this letter today</p>
            <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              Click a product to put its name in the request. A product outside
              the letter, over the price cap, or past the basket will be
              refused before PayPal is called.
            </p>
          </div>
        ) : null}

        {verdict && exhibit ? (
          <Decision
            exhibit={exhibit}
            verdict={verdict}
            letter={letter}
            paypal={paypal}
            busy={busy}
            onSettle={() => void settle()}
          />
        ) : null}
      </section>
    </div>
  );
}

function LetterCard({
  letter,
  letters,
  hash,
  copied,
  onCopy,
}: {
  letter: Mandate;
  letters: { id: string; buyerName: string; buyerOrg: string }[];
  hash: string;
  copied: boolean;
  onCopy: () => void;
}) {
  const short = `${hash.slice(0, 12)}…${hash.slice(-8)}`;
  return (
    <aside className="h-fit overflow-hidden rounded-2xl border border-border bg-card lg:sticky lg:top-6">
      <div className="h-1 bg-brass" />
      <div className="p-5">
        <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
          Letter of authority
        </p>
        <h2 className="mt-2 font-heading text-3xl tracking-tight">{letter.buyerName}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {letter.buyerRole}, {letter.buyerOrg}. {letter.merchantName} may settle
          a cart only when every limit below holds.
        </p>
        {letters.length > 1 ? (
          <label className="mt-4 flex flex-col gap-1.5 text-sm">
            Switch letter
            <select
              className="h-11 rounded-lg border border-input bg-background px-3"
              value={letter.id}
              onChange={(event) => {
                window.location.href = `/?letter=${event.target.value}`;
              }}
            >
              {letters.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.buyerName}, {item.buyerOrg}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <dl className="mt-5 flex flex-col gap-3 border-t border-border pt-5 text-sm">
          <Limit term="Signed" detail={formatWhen(letter.signedAt)} />
          <Limit term="Through" detail={formatWhen(letter.expiresAt)} />
          <Limit
            term="Categories"
            detail={letter.categories.map((category) => categoryLabel(category)).join("\n")}
          />
          <Limit term="Unit price" detail={`${formatUsd(letter.maxUnitPriceCents)} max`} />
          <Limit term="Quantity" detail={`${letter.maxQtyPerSku} of one item`} />
          <Limit
            term="Subscriptions"
            detail={letter.allowSubscriptions ? "Authorized" : "Not authorized"}
          />
          <Limit term="Basket" detail={`${formatUsd(letter.maxBasketCents)} max`} />
        </dl>
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
          <div className="min-w-0">
            <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
              SHA-256
            </p>
            <p className="mt-1 truncate font-mono text-xs" title={hash}>
              {short}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(hash);
              onCopy();
            }}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <Button
          className="mt-4 w-full"
          variant="outline"
          nativeButton={false}
          render={<Link href="/letters" />}
        >
          Write another letter
        </Button>
      </div>
    </aside>
  );
}

function Limit({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="font-medium whitespace-pre-line">{detail}</dd>
    </div>
  );
}

function Decision({
  exhibit,
  verdict,
  letter,
  paypal,
  busy,
  onSettle,
}: {
  exhibit: Exhibit;
  verdict: Verdict;
  letter: Mandate;
  paypal: boolean | null;
  busy: boolean;
  onSettle: () => void;
}) {
  const ordered = [...verdict.rules].sort((a, b) => Number(a.passed) - Number(b.passed));
  const settled = exhibit.status === "captured" || exhibit.status === "rehearsal";

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card" aria-live="polite">
      <div className={cn("h-1", verdict.passed ? "bg-pass" : "bg-destructive")} />
      <div className="flex flex-col gap-6 p-5 sm:p-6">
        <div>
          <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
            {verdict.passed ? "Cleared for settlement" : "Refused"}
          </p>
          <h2 className="mt-1 font-heading text-4xl tracking-tight">
            {verdict.passed ? "Every limit holds." : "This cart does not match the letter."}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {verdict.passed ? "PayPal can take this cart." : "PayPal was not called."}{" "}
            {agentCredit(exhibit.proposal)}
          </p>
          <p className="mt-3 text-sm leading-6">{exhibit.proposal.rationale}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
              <tr>
                <th className="py-2 pr-3 font-medium">Item</th>
                <th className="py-2 pr-3 font-medium">Qty</th>
                <th className="py-2 pr-3 font-medium">Unit</th>
                <th className="py-2 text-right font-medium">Line</th>
              </tr>
            </thead>
            <tbody>
              {verdict.lines.map((line, index) => (
                <tr key={`${line.sku}-${index}`} className="border-b border-border align-top">
                  <td className="py-3 pr-3">
                    <p className="font-medium">{line.name}</p>
                    <p className="mt-1 text-muted-foreground">{line.because}</p>
                    {line.violations.map((violation) => (
                      <p key={violation.detail} className="mt-1 text-destructive">
                        {violation.detail}
                      </p>
                    ))}
                  </td>
                  <td className="py-3 pr-3 tabular-nums">{line.qty}</td>
                  <td className="py-3 pr-3 tabular-nums">
                    {line.unitPriceCents ? formatUsd(line.unitPriceCents) : "—"}
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {line.lineTotalCents ? formatUsd(line.lineTotalCents) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <div className="flex items-end justify-between gap-4">
            <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
              Against the letter
            </p>
            <p className="text-right">
              <span className="block font-heading text-2xl tabular-nums">
                {formatUsd(verdict.basketCents)}
              </span>
              <span className="text-xs text-muted-foreground">
                of {formatUsd(letter.maxBasketCents)}
              </span>
            </p>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {ordered.map((rule) => (
              <li
                key={rule.id}
                className={cn(
                  "rounded-xl border px-3 py-3 text-sm",
                  rule.passed
                    ? "border-pass/25 bg-pass/8"
                    : "border-destructive/30 bg-destructive/8",
                )}
              >
                <p className="text-[11px] font-medium tracking-[0.14em] uppercase">
                  <span className={rule.passed ? "text-pass" : "text-destructive"}>
                    {rule.passed ? "Holds" : "Breaks"}
                  </span>
                  <span className="text-muted-foreground"> · {rule.label}</span>
                </p>
                <p className="mt-1 leading-5">{rule.detail}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          {verdict.passed && !settled && paypal === null ? (
            <p className="text-sm text-muted-foreground">Checking the PayPal sandbox…</p>
          ) : null}
          {verdict.passed && !settled && paypal !== null ? (
            <Button type="button" disabled={busy} className="h-11 px-4" onClick={onSettle}>
              {busy
                ? "Sending…"
                : paypal
                  ? "Send cleared cart to PayPal"
                  : "File a rehearsal settlement"}
            </Button>
          ) : null}
          <Button
            variant="outline"
            className="h-11 px-4"
            nativeButton={false}
            render={<Link href={`/evidence/${exhibit.id}`} />}
          >
            {verdict.passed ? "Open the exhibit" : "Open the refusal exhibit"}
          </Button>
        </div>
        {verdict.passed && paypal === false && !settled ? (
          <p className="text-sm leading-6 text-muted-foreground">
            A rehearsal exhibit records the cleared cart. The capture id starts
            with REHEARSAL. Sandbox money moves once PayPal credentials are set.
          </p>
        ) : null}
        {settled && exhibit.paypal?.captureId ? (
          <p className="rounded-xl bg-muted px-4 py-3 text-sm">
            Capture <span className="font-mono text-xs">{exhibit.paypal.captureId}</span>
          </p>
        ) : null}
      </div>
    </section>
  );
}
