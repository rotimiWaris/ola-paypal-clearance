"use client";

export function SignOut() {
  return (
    <button
      type="button"
      className="text-sm text-primary-foreground/75 hover:text-primary-foreground"
      onClick={() => {
        void fetch("/api/auth/logout", { method: "POST" }).then(() => {
          window.location.href = "/";
        });
      }}
    >
      Sign out
    </button>
  );
}
