import { z } from 'zod';

export const contactSchema = z.object({
  firstName: z
    .string()
    .min(2, { message: 'El nombre debe tener al menos 2 caracteres' })
    .max(100, { message: 'El nombre no debe superar los 100 caracteres' }),
  lastName: z
    .string()
    .min(2, { message: 'El apellido debe tener al menos 2 caracteres' })
    .max(100, { message: 'El apellido no debe superar los 100 caracteres' }),
  position: z.string().max(100).optional().or(z.literal('')),
  department: z.string().max(100).optional().or(z.literal('')),
  email: z
    .string()
    .email({ message: 'Ingrese un correo electrónico válido' }),
  phone: z.string().max(30).optional().or(z.literal('')),
  whatsApp: z.string().max(30).optional().or(z.literal('')),
  linkedIn: z.string().max(250).optional().or(z.literal('')),
  companyId: z.string().optional().or(z.literal('')),
  isPrimary: z.boolean().default(false),
  status: z.enum(['active', 'inactive']).default('active'),
  dataSource: z.string().max(100).optional().or(z.literal('')),
  tags: z.array(z.string()).default([]),
  commercialConsent: z.boolean().default(false),
  consentDate: z.coerce.date().optional(),
  consentChannel: z.string().max(100).optional().or(z.literal('')),
  subscriptionStatus: z.enum(['subscribed', 'unsubscribed', 'bounced']).default('subscribed'),
  observations: z.string().optional().or(z.literal('')),
});

export type ContactSchemaInput = z.infer<typeof contactSchema>;
