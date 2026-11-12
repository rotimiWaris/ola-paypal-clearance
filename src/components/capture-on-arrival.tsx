"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function CaptureOnArrival({ orderId }: { orderId: string }) {
  const [message, setMessage] = useState("Capturing the cleared cart in PayPal…");
  const [exhibitId, setExhibitId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    })
      .then(async (response) => {
        const body = (await response.json()) as {
          exhibit?: { id: string; paypal?: { captureId?: string } };
          error?: string;
          exhibitId?: string;
          debugId?: string;
        };
        if (!active) return;
        if (!response.ok || !body.exhibit) {
          setFailed(true);
          setExhibitId(body.exhibitId ?? null);
          setMessage(
            [body.error || "PayPal did not capture the order.", body.debugId]
              .filter(Boolean)
              .join(" "),
          );
          return;
        }
        setExhibitId(body.exhibit.id);
        setMessage(
          body.exhibit.paypal?.captureId
            ? `Captured. PayPal id ${body.exhibit.paypal.captureId}.`
            : "PayPal accepted the capture.",
        );
      })
      .catch(() => {
        if (!active) return;
        setFailed(true);
        setMessage("The capture request did not reach Clearance.");
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-5 py-16">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
      <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
        PayPal return
      </p>
      <h1 className="font-heading text-4xl tracking-tight">
        {failed ? "Capture did not finish" : "Settlement"}
      </h1>
      <p className="text-sm leading-6">{message}</p>
      <div className="flex flex-wrap gap-3">
        {exhibitId ? (
          <Button
            nativeButton={false}
            render={<Link href={`/evidence/${exhibitId}`} />}
          >
            Open the exhibit
          </Button>
        ) : null}
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/" />}
        >
          Back to the desk
        </Button>
      </div>
      </div>
    </div>
  );
}
