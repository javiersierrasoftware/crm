import { Resend } from 'resend';
import nodemailer from 'nodemailer';

interface SendMailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromName: string;
  fromEmail: string;
  orgId?: string;
}

/**
 * Centrally manages outgoing email dispatches.
 * Uses Resend API or SMTP/Nodemailer, fallbacks to global configuration secrets.
 */
export async function sendMail(params: SendMailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const provider = process.env.EMAIL_PROVIDER || 'smtp';
    const fromAddress = `"${params.fromName}" <${params.fromEmail || process.env.EMAIL_FROM || 'no-reply@creatix-crm.com'}>`;

    // 1. Resend Provider Dispatch
    if (provider === 'resend' && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const result = await resend.emails.send({
        from: fromAddress,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text || '',
      });

      if (result.error) {
        return { success: false, error: result.error.message };
      }
      return { success: true, messageId: result.data?.id };
    }

    // 2. SMTP/Nodemailer Fallback Dispatch
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (!host || !user || !pass) {
      // Mock sending in local environments if no SMTP secrets are configured
      console.log(`[MOCK EMAIL SEND] To: ${params.to} | Subject: ${params.subject}`);
      return { success: true, messageId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // SSL
      auth: {
        user,
        pass,
      },
    });

    const info = await transporter.sendMail({
      from: fromAddress,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('Mail dispatch error:', error);
    return { success: false, error: error.message || 'Error en el envío de correo' };
  }
}
