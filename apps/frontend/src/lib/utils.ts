import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: value > 99999 ? "compact" : "standard" }).format(value);
}

export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(value));
}

export function statusTone(status: string) {
  const tones: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    PROCESSING: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
    COMPLETED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    CANCELLED: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
  };
  return tones[status] ?? tones.DRAFT;
}
