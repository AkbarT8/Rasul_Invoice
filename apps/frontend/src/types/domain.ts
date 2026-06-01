export type Role = "ADMIN" | "USER";
export type ProformaStatus = "DRAFT" | "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
};

export type Client = {
  id: string;
  name: string;
  companyName: string;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  proformas?: Proforma[];
  _count?: { proformas: number };
};

export type Proforma = {
  id: string;
  clientId: string;
  proformaNumber: string;
  date: string;
  status: ProformaStatus;
  currency: string;
  notes?: string | null;
  client?: Client;
  columns?: CustomColumn[];
  rows?: ArticleRow[];
  _count?: { rows: number; columns: number; attachments: number };
  createdAt: string;
  updatedAt: string;
};

export type CustomColumn = {
  id: string;
  proformaId: string;
  key: string;
  name: string;
  type: "text" | "number" | "date" | "currency" | "select" | "richText";
  position: number;
  hidden: boolean;
};

export type ArticleRow = {
  id: string;
  proformaId: string;
  position: number;
  cells: Record<string, unknown>;
  colors: Record<string, string>;
};

export type DashboardSummary = {
  totalClients: number;
  totalProformas: number;
  totalArticles: number;
  pendingOrders: number;
  completedOrders: number;
  recentProformas: Proforma[];
};
