import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-5 py-16">
        <h1 className="font-heading text-4xl tracking-tight">
          That exhibit is not on this desk
        </h1>
        <p className="text-sm text-muted-foreground">
          It may have been filed in another session. The letter is still on the
          desk.
        </p>
        <Link href="/" className="text-sm underline underline-offset-4">
          Return to the desk
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
