import { z } from 'zod';

export const segmentRuleSchema = z.object({
  field: z.string().min(1, { message: 'El campo de la regla es obligatorio' }),
  operator: z.enum(['equals', 'not_equals', 'contains', 'in', 'not_in', 'greater_than', 'less_than']),
  value: z.any(),
});

export const listSchema = z.object({
  name: z
    .string()
    .min(2, { message: 'El nombre de la lista debe tener al menos 2 caracteres' })
    .max(100, { message: 'El nombre no debe superar los 100 caracteres' }),
  description: z.string().optional().or(z.literal('')),
  type: z.enum(['static', 'dynamic']).default('static'),
  rulesOperator: z.enum(['AND', 'OR']).default('AND'),
  rules: z.array(segmentRuleSchema).default([]),
});

export type ListSchemaInput = z.infer<typeof listSchema>;
