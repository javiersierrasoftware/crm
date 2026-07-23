'use server';

import { sendMail } from '../email/sender';

interface ContactFormData {
  name: string;
  email: string;
  message: string;
}

interface DemoFormData {
  name: string;
  email: string;
  company: string;
  size?: string;
}

export async function submitLandingFormAction(
  type: 'contact' | 'demo',
  data: ContactFormData | DemoFormData
) {
  try {
    const toEmail = process.env.SMTP_USER || 'ticsoft.contacto@gmail.com';
    const fromEmail = process.env.SMTP_USER || 'ticsoft.contacto@gmail.com';

    if (type === 'contact') {
      const contactData = data as ContactFormData;
      if (!contactData.name || !contactData.email || !contactData.message) {
        return { success: false, error: 'Todos los campos son obligatorios.' };
      }

      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 0;">Nueva Solicitud de Contacto</h2>
          <p>Se ha recibido un nuevo mensaje de contacto desde el formulario de la landing page:</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold; width: 150px;">Nombre:</td>
              <td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${contactData.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Correo:</td>
              <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-family: monospace;">${contactData.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; vertical-align: top;">Mensaje:</td>
              <td style="padding: 8px; line-height: 1.5; background: #f8fafc; border-radius: 5px;">${contactData.message.replace(/\n/g, '<br/>')}</td>
            </tr>
          </table>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 30px;"/>
          <p style="font-size: 11px; color: #64748b; text-align: center; margin-bottom: 0;">CREATIX CRM - Sistema de Notificaciones de la Landing Page</p>
        </div>
      `;

      const res = await sendMail({
        to: toEmail,
        subject: `[Contacto Landing] Mensaje de ${contactData.name}`,
        html,
        fromName: 'Landing CREATIX CRM',
        fromEmail,
      });

      return res;
    } else {
      const demoData = data as DemoFormData;
      if (!demoData.name || !demoData.email || !demoData.company) {
        return { success: false, error: 'Todos los campos son obligatorios.' };
      }

      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 0;">Solicitud de Demostración Comercial</h2>
          <p>Un cliente potencial ha solicitado una demostración guiada del CRM:</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold; width: 150px;">Nombre Solicitante:</td>
              <td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${demoData.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Correo de Contacto:</td>
              <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-family: monospace;">${demoData.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Empresa:</td>
              <td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${demoData.company}</td>
            </tr>
            ${demoData.size ? `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Tamaño de Equipo:</td>
              <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-transform: uppercase;">${demoData.size}</td>
            </tr>
            ` : ''}
          </table>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 30px;"/>
          <p style="font-size: 11px; color: #64748b; text-align: center; margin-bottom: 0;">CREATIX CRM - Sistema de Notificaciones de la Landing Page</p>
        </div>
      `;

      const res = await sendMail({
        to: toEmail,
        subject: `[Demo Landing] Solicitud de Demostración - ${demoData.company}`,
        html,
        fromName: 'Landing CREATIX CRM',
        fromEmail,
      });

      return res;
    }
  } catch (error: any) {
    console.error('Error submitting landing form:', error);
    return { success: false, error: error.message || 'Error inesperado al enviar el mensaje.' };
  }
}
