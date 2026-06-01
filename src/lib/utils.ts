import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(d: Date | string | null | undefined, locale = 'ru-RU') {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(d: Date | string | null | undefined, locale = 'ru-RU') {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]!));
}

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

export const STATUS_TONES: Record<string, string> = {
  DRAFT:      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  PENDING:    'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  PROCESSING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  COMPLETED:  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  CANCELLED:  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
};

export const CELL_COLORS: Record<string, { bg: string; text?: string; hex: string; ring: string; label: string }> = {
  none:   { bg: '',                                          hex: '',        ring: 'ring-border',           label: 'Без цвета' },
  green:  { bg: 'bg-emerald-100 dark:bg-emerald-900/40',     hex: 'D1FAE5',  ring: 'ring-emerald-400',      label: 'Зелёный'   },
  red:    { bg: 'bg-rose-100 dark:bg-rose-900/40',           hex: 'FFE4E6',  ring: 'ring-rose-400',         label: 'Красный'   },
  yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/40',       hex: 'FEF3C7',  ring: 'ring-yellow-400',       label: 'Жёлтый'    },
  blue:   { bg: 'bg-blue-100 dark:bg-blue-900/40',           hex: 'DBEAFE',  ring: 'ring-blue-400',         label: 'Синий'     },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/40',       hex: 'EDE9FE',  ring: 'ring-purple-400',       label: 'Фиолетовый'},
  orange: { bg: 'bg-orange-100 dark:bg-orange-900/40',       hex: 'FFEDD5',  ring: 'ring-orange-400',       label: 'Оранжевый' },
  gray:   { bg: 'bg-gray-200 dark:bg-gray-700/60',           hex: 'E5E7EB',  ring: 'ring-gray-400',         label: 'Серый'     }
};

export const CURRENCIES: Record<string, string> = {
  USD: '$', EUR: '€', RUB: '₽', UZS: 'UZS', KZT: '₸', GBP: '£', CNY: '¥', TRY: '₺'
};

export function withCurrency(value: number | string, currency: string) {
  const num = Number(value) || 0;
  const sym = CURRENCIES[currency] || currency;
  return `${num.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${sym}`;
}
