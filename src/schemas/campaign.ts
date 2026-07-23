import { z } from 'zod';

export const campaignSchema = z.object({
  name: z
    .string()
    .min(2, { message: 'El nombre de la campaña debe tener al menos 2 caracteres' })
    .max(100, { message: 'El nombre no debe superar los 100 caracteres' }),
  templateId: z.string().min(1, { message: 'Debe seleccionar una plantilla' }),
  listId: z.string().min(1, { message: 'Debe seleccionar una lista de destinatarios' }),
  senderName: z
    .string()
    .min(2, { message: 'El nombre del remitente debe tener al menos 2 caracteres' }),
  senderEmail: z
    .string()
    .email({ message: 'Ingrese un correo de remitente válido' }),
  scheduledAt: z.string().optional().or(z.literal('')),
});

export type CampaignSchemaInput = z.infer<typeof campaignSchema>;
