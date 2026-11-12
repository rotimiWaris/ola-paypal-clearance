import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { currentUser } from "@/lib/auth";
import { formatUsd, formatWhen } from "@/lib/money";
import { statusLabel } from "@/lib/present";
import { listExhibits } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function EvidencePage() {
  const user = await currentUser();
  if (!user) redirect("/?next=/evidence");
  const exhibits = await listExhibits(user.id);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
        <p className="text-[11px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
          Filed records
        </p>
        <h1 className="mt-2 font-heading text-4xl tracking-tight sm:text-5xl">
          Exhibits
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Every cart this desk decides is filed here, including refusals. A
          refusal has no PayPal order. A capture does.
        </p>
        {exhibits.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-border px-5 py-8 text-sm">
            Nothing has been filed. Ask the agent for a cart on the desk.
          </p>
        ) : (
          <ul className="mt-8 flex flex-col gap-3">
            {exhibits.map((exhibit) => (
              <li key={exhibit.id}>
                <Link
                  href={`/evidence/${exhibit.id}`}
                  className="grid gap-3 rounded-2xl border border-border bg-card px-5 py-4 transition-colors hover:border-brass/60 sm:grid-cols-[14rem_minmax(0,1fr)_auto] sm:items-center"
                >
                  <span className="text-sm whitespace-nowrap text-muted-foreground">
                    {formatWhen(exhibit.createdAt)}
                  </span>
                  <span>
                    <span
                      className={
                        exhibit.status === "refused"
                          ? "text-[11px] font-medium tracking-[0.14em] text-destructive uppercase"
                          : "text-[11px] font-medium tracking-[0.14em] text-pass uppercase"
                      }
                    >
                      {statusLabel(exhibit.status)}
                    </span>
                    <span className="mt-1 block text-sm">
                      {exhibit.prompt || exhibit.proposal.rationale}
                    </span>
                  </span>
                  <span className="font-heading text-2xl tabular-nums sm:text-right">
                    {formatUsd(exhibit.verdict.basketCents)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
