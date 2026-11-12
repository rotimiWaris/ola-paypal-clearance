import { CaptureOnArrival } from "@/components/capture-on-arrival";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const dynamic = "force-dynamic";

export default async function ApprovedPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const orderId = params.token ?? "";
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {orderId ? (
          <CaptureOnArrival orderId={orderId} />
        ) : (
          <p className="mx-auto max-w-xl px-5 py-16 text-sm">
            PayPal did not return an order id, so there is nothing to capture.
          </p>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
