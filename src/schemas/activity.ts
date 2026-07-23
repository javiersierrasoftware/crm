import { z } from 'zod';

export const activitySchema = z.object({
  title: z
    .string()
    .min(2, { message: 'El título debe tener al menos 2 caracteres' })
    .max(150, { message: 'El título no debe superar los 150 caracteres' }),
  description: z.string().optional().or(z.literal('')),
  type: z.enum([
    'call',
    'email',
    'meeting',
    'videocall',
    'visit',
    'whatsapp',
    'task',
    'note',
    'followup',
  ]),
  date: z.string().min(1, { message: 'Debe seleccionar una fecha' }),
  time: z.string().optional().or(z.literal('')),
  duration: z.coerce.number().min(0).default(0),
  assignedAgentId: z.string().optional().or(z.literal('')),
  companyId: z.string().optional().or(z.literal('')),
  contactId: z.string().optional().or(z.literal('')),
  opportunityId: z.string().optional().or(z.literal('')),
  status: z.enum(['pending', 'completed', 'cancelled']).default('pending'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  result: z.string().optional().or(z.literal('')),
});

export type ActivitySchemaInput = z.infer<typeof activitySchema>;
