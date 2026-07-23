import { z } from 'zod';

export const opportunitySchema = z.object({
  name: z
    .string()
    .min(2, { message: 'El nombre del negocio debe tener al menos 2 caracteres' })
    .max(100, { message: 'El nombre del negocio no debe superar los 100 caracteres' }),
  companyId: z.string().min(1, { message: 'Debe seleccionar una empresa relacionada' }),
  primaryContactId: z.string().optional().or(z.literal('')),
  estimatedValue: z.coerce.number().min(0, { message: 'El valor estimado debe ser un número positivo' }),
  probability: z.coerce.number().min(0).max(100, { message: 'La probabilidad debe estar entre 0 y 100' }),
  pipelineId: z.string().min(1, { message: 'Debe seleccionar un embudo' }),
  stageId: z.string().min(1, { message: 'Debe seleccionar una etapa' }),
  expectedCloseDate: z.string().optional().or(z.literal('')),
  assignedAgentId: z.string().optional().or(z.literal('')),
  dataSource: z.string().optional().or(z.literal('')),
  products: z.array(z.string()).default([]),
  status: z.enum(['open', 'won', 'lost']).default('open'),
  lostReason: z.string().optional().or(z.literal('')),
});

export type OpportunitySchemaInput = z.infer<typeof opportunitySchema>;
