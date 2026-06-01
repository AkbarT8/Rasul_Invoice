import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
  remember: z.boolean().optional().default(true)
});

export const clientSchema = z.object({
  name: z.string().min(1).max(200),
  companyName: z.string().max(200).optional().nullable(),
  email: z.string().email().max(200).optional().nullable().or(z.literal('')),
  phone: z.string().max(80).optional().nullable(),
  country: z.string().max(120).optional().nullable(),
  notes: z.string().max(20000).optional().nullable()
});

export const STATUSES = ['DRAFT', 'PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'] as const;

export const proformaSchema = z.object({
  number: z.string().min(1).max(80),
  date: z.string().optional().nullable(),
  status: z.enum(STATUSES).optional().default('DRAFT'),
  currency: z.string().min(1).max(8).default('USD'),
  notes: z.string().max(20000).optional().nullable()
});

export const columnSchema = z.object({
  name: z.string().min(1).max(80),
  type: z.enum(['text', 'number', 'date', 'select']).optional().default('text'),
  width: z.number().int().min(60).max(800).optional().default(160),
  hidden: z.boolean().optional().default(false),
  options: z.array(z.string().max(80)).optional().default([])
});

export const columnReorderSchema = z.object({
  order: z.array(z.string().min(1)).min(1)
});

export const cellUpdateSchema = z.object({
  rowId: z.string().min(1),
  columnId: z.string().min(1),
  value: z.string().nullable().optional(),
  color: z.string().nullable().optional()
});

export const bulkCellUpdateSchema = z.object({
  updates: z.array(cellUpdateSchema).min(1).max(2000)
});

export const userCreateSchema = z.object({
  email: z.string().email().max(200),
  name: z.string().min(1).max(120),
  password: z.string().min(8).max(200),
  role: z.enum(['ADMIN', 'USER']).default('USER'),
  clientIds: z.array(z.string()).optional().default([])
});
