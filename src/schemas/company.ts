import { z } from 'zod';

export const companySchema = z.object({
  razonSocial: z
    .string()
    .min(2, { message: 'La razón social debe tener al menos 2 caracteres' })
    .max(150, { message: 'La razón social no debe superar los 150 caracteres' }),
  nit: z.string().max(50).optional().or(z.literal('')),
  actividad: z.string().max(100).optional().or(z.literal('')),
  category: z.string().optional().or(z.literal('')),
  dirComercial: z.string().max(250).optional().or(z.literal('')),
  munComercial: z.string().max(100).optional().or(z.literal('')),
  telCom1: z.string().max(30).optional().or(z.literal('')),
  emailComercial: z
    .string()
    .email({ message: 'Ingrese un correo electrónico válido' })
    .optional()
    .or(z.literal('')),
  status: z.string().default('Nuevo'),

  activoTotal: z.string().optional().or(z.literal('')),
  ciiu1: z.string().optional().or(z.literal('')),
  ciiu2: z.string().optional().or(z.literal('')),
  fecMatricula: z.string().optional().or(z.literal('')),
  fecRenovacion: z.string().optional().or(z.literal('')),
  matricula: z.string().optional().or(z.literal('')),
  ultAnoRen: z.string().optional().or(z.literal('')),
  identificacion: z.string().optional().or(z.literal('')),
  emailNotificacion: z.string().optional().or(z.literal('')),

  legalName: z.string().max(150).optional().or(z.literal('')),
  taxType: z.string().max(30).optional().or(z.literal('')),
  subsector: z.string().max(100).optional().or(z.literal('')),
  size: z.enum(['micro', 'small', 'medium', 'large']).default('micro'),
  estimatedEmployees: z.coerce.number().min(0).default(0),
  country: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  whatsApp: z.string().max(30).optional().or(z.literal('')),
  website: z.string().max(250).optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  dataSource: z.string().max(100).optional().or(z.literal('')),
  assignedAgentId: z.string().optional().or(z.literal('')),
  tags: z.array(z.string()).default([]),
  interestLevel: z.enum(['low', 'medium', 'high']).default('medium'),
  leadScore: z.coerce.number().min(0).default(0),
  commercialConsent: z.boolean().default(true),
  subscriptionStatus: z.enum(['subscribed', 'unsubscribed', 'bounced']).default('subscribed'),
});

export type CompanySchemaInput = z.infer<typeof companySchema>;
