import Link from "next/link";
import { PrintButton } from "@/components/print-button";
import { categoryLabel, formatUsd, formatWhen } from "@/lib/money";
import { agentCredit, statusLabel } from "@/lib/present";
import type { Exhibit } from "@/lib/types";
import { cn } from "cn";

export function ExhibitDocument({ exhibit }: { exhibit: Exhibit }) {
  const refused = exhibit.status === "refused";
  const letter = exhibit.letter;
  return (
    <article className="mx-auto w-full max-w-3xl px-5 py-10">
      <div className="no-print mb-8 flex items-center justify-between gap-3">
        <Link
          href="/evidence"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          All exhibits
        </Link>
        <PrintButton />
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div
          className={cn(
            "h-1",
            refused
              ? "bg-destructive"
              : exhibit.status === "captured" || exhibit.status === "rehearsal"
                ? "bg-pass"
                : "bg-brass",
          )}
        />
        <div className="p-6 sm:p-8">
          <p className="text-[11px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
            Dispute exhibit · {letter.merchantName}
          </p>
          <h1 className="mt-2 font-heading text-4xl tracking-tight sm:text-5xl">
            {statusLabel(exhibit.status)}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            {refused
              ? `${letter.merchantName} refused this cart before a PayPal order existed. The letter, the agent's words, and the broken limits are the record.`
              : exhibit.status === "captured"
                ? `${letter.merchantName} settled this cart in the PayPal sandbox after every limit on ${letter.buyerName}'s letter held.`
                : exhibit.status === "rehearsal"
                  ? "Every limit held. This settlement was filed without PayPal credentials, so the ids below are marked as a rehearsal."
                  : "The cart matched the letter and is waiting on PayPal."}
          </p>

          <dl className="mt-8 grid gap-x-8 gap-y-5 border-y border-border py-6 text-sm sm:grid-cols-2">
            <Field term="Exhibit" detail={exhibit.id} mono />
            <Field term="Filed" detail={formatWhen(exhibit.createdAt)} />
            <Field
              term="Buyer"
              detail={`${letter.buyerName}, ${letter.buyerOrg}`}
            />
            <Field term="Request" detail={exhibit.prompt || "—"} />
            <Field term="Letter SHA-256" detail={exhibit.mandateHash} mono />
            <Field term="Basket" detail={formatUsd(exhibit.verdict.basketCents)} />
            {exhibit.paypal?.orderId ? (
              <Field term="PayPal order" detail={exhibit.paypal.orderId} mono />
            ) : null}
            {exhibit.paypal?.captureId ? (
              <Field term="PayPal capture" detail={exhibit.paypal.captureId} mono />
            ) : null}
          </dl>

          <section className="mt-8">
            <h2 className="font-heading text-3xl">What the agent said</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {agentCredit(exhibit.proposal)}
            </p>
            <p className="mt-4 text-sm leading-6">{exhibit.proposal.rationale}</p>
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {exhibit.verdict.lines.map((line, index) => (
                <li key={`${line.sku}-${index}`} className="py-3 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">
                      {line.qty} × {line.name}
                    </span>
                    <span className="tabular-nums">
                      {line.lineTotalCents ? formatUsd(line.lineTotalCents) : "—"}
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{line.because}</p>
                  {line.category !== "unknown" ? (
                    <p className="mt-1 text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                      {categoryLabel(line.category)}
                      {line.subscription ? " · subscription" : ""}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="font-heading text-3xl">How the letter was applied</h2>
            <ul className="mt-4 grid gap-2">
              {exhibit.verdict.rules.map((rule) => (
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
          </section>
        </div>
      </div>
    </article>
  );
}

function Field({
  term,
  detail,
  mono,
}: {
  term: string;
  detail: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
        {term}
      </dt>
      <dd className={mono ? "mt-1 font-mono text-xs leading-5 break-all" : "mt-1 leading-6"}>
        {detail}
      </dd>
    </div>
  );
}
