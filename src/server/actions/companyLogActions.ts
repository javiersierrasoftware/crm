'use server';

import { connectToDatabase } from '../database/mongodb';
import { getTenantContext } from '../permissions/tenant';
import CompanyLog from '@/models/CompanyLog';
import Company from '@/models/Company';
import Organization from '@/models/Organization';
import { sendMail } from '../email/sender';
import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';

export async function createCompanyLog(params: {
  companyId: string;
  type: 'note' | 'email' | 'whatsapp' | 'system';
  title: string;
  content: string;
}) {
  try {
    const context = await getTenantContext();
    const organizationId = context.organizationId;

    if (!organizationId) {
      return { success: false, error: 'No se encuentra en un contexto de organización activo' };
    }

    if (!params.companyId || !params.title || !params.content) {
      return { success: false, error: 'Parámetros incompletos para registrar bitácora' };
    }

    await connectToDatabase();

    const log = new CompanyLog({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      companyId: new mongoose.Types.ObjectId(params.companyId),
      actorId: new mongoose.Types.ObjectId(context.userId),
      actorName: context.userName || 'Asesor',
      type: params.type,
      title: params.title,
      content: params.content,
    });

    await log.save();

    revalidatePath(`/dashboard/companies/${params.companyId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error al guardar la nota en la bitácora' };
  }
}

export async function getCompanyLogs(companyId: string) {
  try {
    const context = await getTenantContext();
    const organizationId = context.organizationId;

    if (!organizationId) {
      return [];
    }

    await connectToDatabase();

    const logs = await CompanyLog.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      companyId: new mongoose.Types.ObjectId(companyId),
    }).sort({ createdAt: -1 });

    return JSON.parse(JSON.stringify(logs));
  } catch (err) {
    console.error('Error fetching company logs:', err);
    return [];
  }
}

export async function sendCompanyEmailAction(companyId: string, subject: string, htmlBody: string) {
  try {
    const context = await getTenantContext();
    const organizationId = context.organizationId;

    if (!organizationId) {
      return { success: false, error: 'No se encuentra en un contexto de organización activo' };
    }

    await connectToDatabase();

    const [company, org] = await Promise.all([
      Company.findById(companyId),
      Organization.findById(organizationId),
    ]);

    if (!company) {
      return { success: false, error: 'Empresa no encontrada' };
    }

    const recipient = company.emailComercial || company.emailNotificacion;
    if (!recipient) {
      return { success: false, error: 'La empresa no cuenta con una dirección de correo registrada' };
    }

    const fromName = org ? org.name : 'CREATIX CRM';

    // Call sendMail utility using current Gmail/SMTP config
    const mailResult = await sendMail({
      to: recipient,
      subject,
      html: `<div style="font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #333;">${htmlBody.replace(/\n/g, '<br/>')}</div>`,
      text: htmlBody,
      fromName,
      fromEmail: process.env.SMTP_USER || 'no-reply@creatix-crm.com',
    });

    if (!mailResult.success) {
      return { success: false, error: mailResult.error || 'Error al despachar el correo' };
    }

    // Log the successful dispatch to bitácora
    const log = new CompanyLog({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      companyId: new mongoose.Types.ObjectId(companyId),
      actorId: new mongoose.Types.ObjectId(context.userId),
      actorName: context.userName || 'Asesor',
      type: 'email',
      title: `Correo enviado: ${subject}`,
      content: htmlBody,
    });

    await log.save();
    revalidatePath(`/dashboard/companies/${companyId}`);

    return { success: true };
  } catch (error: any) {
    console.error('sendCompanyEmailAction error:', error);
    return { success: false, error: error.message || 'Error en el envío de correo' };
  }
}
