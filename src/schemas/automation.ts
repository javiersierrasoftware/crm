import { z } from 'zod';

export const automationStepSchema = z.object({
  type: z.enum([
    'email',
    'wait',
    'task',
    'assign_agent',
    'change_status',
    'add_tag',
    'remove_tag',
    'add_to_list',
    'create_opportunity',
  ]),
  config: z.record(z.string(), z.any()).default({}),
  order: z.coerce.number(),
});

export const automationSchema = z.object({
  name: z
    .string()
    .min(2, { message: 'El nombre de la automatización debe tener al menos 2 caracteres' })
    .max(100, { message: 'El nombre no debe superar los 100 caracteres' }),
  triggerType: z.enum([
    'company_created',
    'contact_created',
    'list_added',
    'status_changed',
    'stage_changed',
  ]),
  triggerConfig: z.record(z.string(), z.any()).default({}),
  status: z.enum(['active', 'inactive']).default('inactive'),
  steps: z.array(automationStepSchema).default([]),
});

export type AutomationSchemaInput = z.infer<typeof automationSchema>;
