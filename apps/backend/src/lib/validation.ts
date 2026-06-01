import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().optional(),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});

export function getPagination(query: unknown) {
  const parsed = paginationSchema.parse(query);
  return {
    ...parsed,
    skip: (parsed.page - 1) * parsed.pageSize,
    take: parsed.pageSize
  };
}
