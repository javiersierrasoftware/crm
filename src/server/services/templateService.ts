import EmailTemplate, { IEmailTemplate } from '@/models/EmailTemplate';
import { getTenantContext, assertRole } from '../permissions/tenant';
import { writeAuditLog } from '../audit/audit';
import { emailTemplateSchema } from '@/schemas/emailTemplate';
import mongoose from 'mongoose';

/**
 * Renders template HTML by replacing tags with values. Escapes values to mitigate XSS risks.
 */
export function renderTemplate(templateHtml: string, variables: Record<string, string>): string {
  let rendered = templateHtml;

  const escapeHtml = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  Object.entries(variables).forEach(([key, value]) => {
    // If the key is 'unsubscribeUrl', we don't escape it because it's a URL in an href attribute
    const replacementValue = key === 'unsubscribeUrl' ? value : escapeHtml(value);
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    rendered = rendered.replace(regex, replacementValue || '');
  });

  return rendered;
}

/**
 * Seeds pre-designed standard templates to a newly onboarded organization.
 */
export async function seedDefaultTemplates(orgId: string): Promise<void> {
  const count = await EmailTemplate.countDocuments({
    organizationId: new mongoose.Types.ObjectId(orgId),
  });

  if (count > 0) return; // Skip if already has templates

  const defaults = [
    {
      name: 'Presentación Comercial',
      subject: 'Potencia el crecimiento comercial de {{company.name}}',
      previewText: 'Conoce cómo podemos ayudarte a optimizar tus procesos.',
      bodyHtml: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937;">
          <h2 style="color: #4f46e5; margin-bottom: 20px;">Hola {{contact.firstName}},</h2>
          <p>Espero que te encuentres muy bien.</p>
          <p>Me pongo en contacto contigo porque he estado analizando las operaciones de <strong>{{company.name}}</strong> en la ciudad de <strong>{{company.city}}</strong> y considero que podemos colaborar estratégicamente para optimizar su embudo comercial.</p>
          <p>En <strong>{{organization.name}}</strong> ayudamos a empresas del sector a:</p>
          <ul style="padding-left: 20px; line-height: 1.6;">
            <li>Reducir el tiempo de conversión de prospectos.</li>
            <li>Centralizar la comunicación omnicanal con sus clientes.</li>
            <li>Automatizar flujos repetitivos para que su equipo se enfoque en cerrar acuerdos.</li>
          </ul>
          <p>¿Tendrás 10 minutos esta semana para una llamada de presentación breve?</p>
          <p style="margin-top: 30px;">Atentamente,</p>
          <p><strong>{{sender.name}}</strong><br/>{{sender.email}}<br/>{{organization.name}}</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="font-size: 11px; color: #9ca3af; text-align: center;">
            Este mensaje fue enviado a {{contact.email}} por motivos comerciales. <br/>
            Si no deseas recibir más correos de nuestra parte, puedes <a href="{{unsubscribeUrl}}" style="color: #4f46e5;">cancelar la suscripción aquí</a>.
          </p>
        </div>
      `,
      bodyText: 'Hola {{contact.firstName}},\n\nEspero que te encuentres muy bien.\n\nMe pongo en contacto contigo porque he estado analizando las operaciones de {{company.name}} y considero que podemos colaborar para optimizar su embudo comercial.\n\n¿Tendrás 10 minutos esta semana para una llamada breve?\n\nAtentamente,\n{{sender.name}}\n{{organization.name}}\n\nSi deseas cancelar tu suscripción haz clic aquí: {{unsubscribeUrl}}',
    },
    {
      name: 'Solicitud de Reunión',
      subject: 'Reunión breve: {{organization.name}} & {{company.name}}',
      previewText: '¿Agendamos una breve conversación comercial?',
      bodyHtml: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937;">
          <h2 style="color: #4f46e5; margin-bottom: 20px;">Estimado/a {{contact.firstName}} {{contact.lastName}},</h2>
          <p>Espero que estés teniendo una excelente semana.</p>
          <p>Te escribo para dar seguimiento a nuestro interés en conversar con el equipo directivo de <strong>{{company.name}}</strong>. Nos gustaría compartir contigo algunas métricas del sector y mejores prácticas que hemos implementado con empresas similares.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="mailto:{{sender.email}}?subject=Reunión%20Agendada" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Responder para agendar reunión</a>
          </div>
          <p>¿Qué día te queda mejor para una videollamada corta de 15 minutos? ¿Martes o jueves?</p>
          <p style="margin-top: 30px;">Cordialmente,</p>
          <p><strong>{{sender.name}}</strong><br/>{{organization.name}}</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="font-size: 11px; color: #9ca3af; text-align: center;">
            Para cambiar tus preferencias de correo, haz clic en <a href="{{unsubscribeUrl}}" style="color: #4f46e5;">darse de baja</a>.
          </p>
        </div>
      `,
      bodyText: 'Estimado/a {{contact.firstName}},\n\n¿Qué día te queda mejor para una videollamada corta de 15 minutos para conversar sobre {{company.name}}? ¿Martes o jueves?\n\nCordialmente,\n{{sender.name}}\n{{organization.name}}\n\nCancelar suscripción: {{unsubscribeUrl}}',
    },
    {
      name: 'Seguimiento tras Primer Contacto',
      subject: '¿Alguna duda sobre lo que conversamos, {{contact.firstName}}?',
      previewText: 'Te dejo un resumen de la información y portafolio de servicios.',
      bodyHtml: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937;">
          <h2 style="color: #4f46e5; margin-bottom: 20px;">Hola {{contact.firstName}},</h2>
          <p>Fue un gusto conversar contigo en días pasados sobre las proyecciones de <strong>{{company.name}}</strong>.</p>
          <p>Tal como lo prometí, te comparto un resumen de las soluciones que podemos estructurar para ustedes y el portafolio de servicios adjunto.</p>
          <p>Quedo atento a tus comentarios o si consideras conveniente que tengamos una segunda sesión técnica con otros líderes de tu equipo.</p>
          <p style="margin-top: 30px;">Quedo a tu entera disposición,</p>
          <p><strong>{{sender.name}}</strong><br/>{{organization.name}}</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="font-size: 11px; color: #9ca3af; text-align: center;">
            Recibes este correo porque tuvimos contacto comercial reciente. <br/>
            Si deseas dejar de recibir correos, puedes <a href="{{unsubscribeUrl}}" style="color: #4f46e5;">cancelar tu suscripción</a>.
          </p>
        </div>
      `,
      bodyText: 'Hola {{contact.firstName}},\n\nFue un gusto conversar contigo sobre las proyecciones de {{company.name}}.\n\nQuedo atento a tus comentarios para organizar la segunda sesión.\n\nAtentamente,\n{{sender.name}}\n{{organization.name}}\n\nDarse de baja: {{unsubscribeUrl}}',
    },
    {
      name: 'Reactivación de Prospecto',
      subject: 'Retomemos la conversación comercial en {{company.name}}',
      previewText: 'Tenemos novedades tecnológicas de interés para tu sector.',
      bodyHtml: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937;">
          <h2 style="color: #4f46e5; margin-bottom: 20px;">Hola {{contact.firstName}},</h2>
          <p>Hace algún tiempo estuvimos conversando sobre la optimización de los procesos comerciales de <strong>{{company.name}}</strong>.</p>
          <p>Quería contarte que hemos lanzado nuevas automatizaciones de marketing y reportería avanzada especialmente útiles para negocios en <strong>{{company.city}}</strong>.</p>
          <p>¿Sigue siendo una prioridad para ustedes mejorar la conversión del equipo comercial? Nos encantaría mostrarte una demostración corta de las novedades sin compromiso.</p>
          <p>¿Cómo está tu agenda para conversar el próximo martes?</p>
          <p style="margin-top: 30px;">Saludos cordiales,</p>
          <p><strong>{{sender.name}}</strong><br/>{{organization.name}}</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="font-size: 11px; color: #9ca3af; text-align: center;">
            Haz clic aquí si deseas <a href="{{unsubscribeUrl}}" style="color: #4f46e5;">cancelar la suscripción</a>.
          </p>
        </div>
      `,
      bodyText: 'Hola {{contact.firstName}},\n\nHace algún tiempo conversamos sobre la optimización comercial en {{company.name}}.\n\n¿Sigue siendo prioridad mejorar la conversión del equipo comercial? ¿Conversamos el martes?\n\nSaludos,\n{{sender.name}}\n{{organization.name}}\n\nCancelar suscripción: {{unsubscribeUrl}}',
    },
  ];

  const docs = defaults.map((d) => ({
    ...d,
    organizationId: new mongoose.Types.ObjectId(orgId),
  }));

  await EmailTemplate.insertMany(docs);
}

export async function getEmailTemplates(): Promise<IEmailTemplate[]> {
  const context = await getTenantContext();
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  // Auto seed default templates for ease of onboarding
  await seedDefaultTemplates(organizationId);

  return await EmailTemplate.find({
    organizationId: new mongoose.Types.ObjectId(organizationId),
  }).sort({ createdAt: -1 });
}

export async function getEmailTemplateById(id: string): Promise<IEmailTemplate> {
  const context = await getTenantContext();
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const template = await EmailTemplate.findOne({
    _id: id,
    organizationId: new mongoose.Types.ObjectId(organizationId),
  });

  if (!template) {
    throw new Error('Plantilla no encontrada o no pertenece a su organización');
  }

  return template;
}

export async function createEmailTemplate(data: any): Promise<IEmailTemplate> {
  const context = await assertRole(['OWNER', 'ADMIN', 'MARKETING']);
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const parsed = emailTemplateSchema.parse(data);

  const template = new EmailTemplate({
    ...parsed,
    organizationId: new mongoose.Types.ObjectId(organizationId),
  });

  const saved = await template.save();

  // Audit Log
  await writeAuditLog({
    organizationId,
    userId: context.userId,
    userName: context.userName,
    action: 'create_template',
    entityType: 'EmailTemplate',
    entityId: saved._id as mongoose.Types.ObjectId,
    details: { name: saved.name, subject: saved.subject },
  });

  return saved;
}

export async function updateEmailTemplate(id: string, data: any): Promise<IEmailTemplate> {
  const context = await assertRole(['OWNER', 'ADMIN', 'MARKETING']);
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const template = await EmailTemplate.findOne({
    _id: id,
    organizationId: new mongoose.Types.ObjectId(organizationId),
  });

  if (!template) {
    throw new Error('Plantilla no encontrada o no pertenece a su organización');
  }

  const parsed = emailTemplateSchema.parse(data);

  Object.assign(template, parsed);
  const updated = await template.save();

  // Audit Log
  await writeAuditLog({
    organizationId,
    userId: context.userId,
    userName: context.userName,
    action: 'update_template',
    entityType: 'EmailTemplate',
    entityId: updated._id as mongoose.Types.ObjectId,
    details: { name: updated.name },
  });

  return updated;
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  const context = await assertRole(['OWNER', 'ADMIN', 'MARKETING']);
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const template = await EmailTemplate.findOne({
    _id: id,
    organizationId: new mongoose.Types.ObjectId(organizationId),
  });

  if (!template) {
    throw new Error('Plantilla no encontrada o no pertenece a su organización');
  }

  await EmailTemplate.deleteOne({ _id: id });

  // Audit Log
  await writeAuditLog({
    organizationId,
    userId: context.userId,
    userName: context.userName,
    action: 'delete_template',
    entityType: 'EmailTemplate',
    entityId: template._id as mongoose.Types.ObjectId,
    details: { name: template.name },
  });
}
