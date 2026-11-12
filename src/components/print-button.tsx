"use client";

import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button
      variant="outline"
      className="no-print"
      onClick={() => window.print()}
    >
      Print exhibit
    </Button>
  );
}
