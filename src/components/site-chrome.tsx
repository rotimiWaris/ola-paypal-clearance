import Link from "next/link";
import { SignOut } from "@/components/sign-out";
import { currentUser } from "@/lib/auth";

export async function SiteHeader() {
  const user = await currentUser();
  const place = [user?.merchantName, user?.merchantPlace].filter(Boolean).join(" · ");
  return (
    <header className="bg-primary text-primary-foreground">
      <div className="h-1 bg-brass" />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
        <Link href="/" className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.22em] text-primary-foreground/70 uppercase">
            {place || "Merchant desk"}
          </p>
          <p className="font-heading text-[2rem] leading-none tracking-tight">
            Clearance
          </p>
        </Link>
        {user ? (
          <nav className="flex max-w-[11.5rem] flex-wrap justify-end gap-x-4 gap-y-1 text-sm sm:max-w-none sm:items-center">
            <Link href="/" className="text-primary-foreground/75 hover:text-primary-foreground">
              Desk
            </Link>
            <Link href="/shelf" className="text-primary-foreground/75 hover:text-primary-foreground">
              Shelf
            </Link>
            <Link href="/letters" className="text-primary-foreground/75 hover:text-primary-foreground">
              Letters
            </Link>
            <Link href="/evidence" className="text-primary-foreground/75 hover:text-primary-foreground">
              Exhibits
            </Link>
            <SignOut />
          </nav>
        ) : (
          <p className="text-sm text-primary-foreground/75">Sign in to open a desk</p>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-brass/50 bg-primary">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-5 py-6 text-sm text-primary-foreground/75 sm:flex-row sm:items-center sm:justify-between">
        <p>Clearance</p>
        <p>The agent proposes. The letter decides. PayPal settles what passed.</p>
      </div>
    </footer>
  );
}
