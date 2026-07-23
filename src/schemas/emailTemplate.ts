import { z } from 'zod';

export const emailTemplateSchema = z.object({
  name: z
    .string()
    .min(2, { message: 'El nombre de la plantilla debe tener al menos 2 caracteres' })
    .max(100, { message: 'El nombre no debe superar los 100 caracteres' }),
  subject: z
    .string()
    .min(2, { message: 'El asunto del correo debe tener al menos 2 caracteres' })
    .max(150, { message: 'El asunto no debe superar los 150 caracteres' }),
  previewText: z.string().max(150).optional().or(z.literal('')),
  bodyHtml: z.string().min(5, { message: 'El contenido HTML de la plantilla es obligatorio' }),
  bodyText: z.string().optional().or(z.literal('')),
  designJson: z.string().optional().or(z.literal('')),
});

export type EmailTemplateSchemaInput = z.infer<typeof emailTemplateSchema>;
