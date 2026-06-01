import type { HTMLAttributes } from "react";
import { cn, statusTone } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-1 text-xs font-medium", className)} {...props} />;
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge className={statusTone(status)}>{status.toLowerCase()}</Badge>;
}
