"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Reloads the server-rendered Monitoring / Health views. */
export function RefreshButton({ label = "Refresh" }: { label?: string }) {
  const router = useRouter();
  const [spinning, setSpinning] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        setSpinning(true);
        router.refresh();
        setTimeout(() => setSpinning(false), 600);
      }}
      disabled={spinning}
    >
      <RefreshCw className={spinning ? "mr-2 h-3.5 w-3.5 animate-spin" : "mr-2 h-3.5 w-3.5"} aria-hidden />
      {spinning ? "Refreshing…" : label}
    </Button>
  );
}