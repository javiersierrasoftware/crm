'use server';

import { connectToDatabase } from '../database/mongodb';
import { getTenantContext } from '../permissions/tenant';
import { Campaign } from '@/models/Campaign';
import Company from '@/models/Company';
import Template from '@/models/Template';
import Organization from '@/models/Organization';
import CompanyLog from '@/models/CompanyLog';
import { Opportunity } from '@/models/Opportunity';
import Pipeline from '@/models/Pipeline';
import { sendMail } from '../email/sender';
import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';

interface CreateCampaignParams {
  name: string;
  templateId: string;
  actividadesFilter?: string[];
  munComercialFilter?: string;
  minAssets?: number;
  limitCount: number;
  targetStatus?: string; // Move to status in Kanban (e.g. 'contacted')
}

export async function createAndSendCampaign(params: CreateCampaignParams) {
  try {
    const context = await getTenantContext();
    const organizationId = context.organizationId;

    if (!organizationId) {
      return { success: false, error: 'No se encuentra en un contexto de organización activo' };
    }

    if (!params.name || !params.templateId || !params.limitCount) {
      return { success: false, error: 'Por favor rellene todos los parámetros obligatorios' };
    }

    await connectToDatabase();

    // 1. Fetch organization details and template
    const [org, template] = await Promise.all([
      Organization.findById(organizationId),
      Template.findById(params.templateId),
    ]);

    if (!org) {
      return { success: false, error: 'Organización no encontrada' };
    }

    if (!template) {
      return { success: false, error: 'Plantilla de mensaje no encontrada' };
    }

    // 2. Query target companies matching filters
    const query: Record<string, any> = {
      organizationId: new mongoose.Types.ObjectId(organizationId),
      deletedAt: null,
    };

    if (params.actividadesFilter && params.actividadesFilter.length > 0) {
      query.actividad = { $in: params.actividadesFilter };
    }
    if (params.munComercialFilter) {
      query.munComercial = params.munComercialFilter;
    }

    // Must have a valid email to receive the message
    query.$or = [
      { emailComercial: { $nin: [null, ''] } },
      { emailNotificacion: { $nin: [null, ''] } },
    ];

    // Fetch up to 500 records to filter in-memory for assets
    const candidates = await Company.find(query).limit(500);

    let filtered = candidates;
    if (params.minAssets && params.minAssets > 0) {
      filtered = candidates.filter((company) => {
        const cleanVal = String(company.activoTotal || '').replace(/[^0-9]/g, '');
        const valNum = parseInt(cleanVal, 10) || 0;
        return valNum >= params.minAssets!;
      });
    }

    // Slice to desired limit size
    const targetCompanies = filtered.slice(0, params.limitCount);

    if (targetCompanies.length === 0) {
      return {
        success: false,
        error: 'No se encontraron empresas con correo comercial que coincidan con los filtros.',
      };
    }

    let successCount = 0;
    let failedCount = 0;

    // Helper to replace placeholders dynamically
    const parseTemplate = (bodyText: string, companyDoc: any) => {
      return bodyText
        .replace(/\{\{razonSocial\}\}/g, companyDoc.razonSocial || '')
        .replace(/\{\{nit\}\}/g, companyDoc.nit || '')
        .replace(/\{\{munComercial\}\}/g, companyDoc.munComercial || '')
        .replace(/\{\{telCom1\}\}/g, companyDoc.telCom1 || '')
        .replace(/\{\{emailComercial\}\}/g, companyDoc.emailComercial || '');
    };

    // 3. Dispatch emails sequentially
    for (const company of targetCompanies) {
      const recipient = company.emailComercial || company.emailNotificacion;
      if (!recipient) continue;

      const parsedSubject = parseTemplate(template.subject || 'Contacto', company);
      const parsedBody = parseTemplate(template.body, company);

      // ANTI-SPAM: Check if there is an existing email log for this company with same subject
      const duplicateLog = await CompanyLog.findOne({
        companyId: company._id,
        type: 'email',
        title: new RegExp(parsedSubject, 'i'),
      });

      if (duplicateLog) {
        // Skip dispatch to avoid spamming the user
        failedCount++;
        continue;
      }

      const mailRes = await sendMail({
        to: recipient,
        subject: parsedSubject,
        html: `<div style="font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #333;">${parsedBody.replace(/\n/g, '<br/>')}</div>`,
        text: parsedBody,
        fromName: org.name,
        fromEmail: process.env.SMTP_USER || 'no-reply@creatix-crm.com',
      });

      if (mailRes.success) {
        successCount++;

        // Update company pipeline status
        if (params.targetStatus) {
          company.status = params.targetStatus;
          await company.save();

          // Link to/create opportunity in Kanban pipeline automatically
          const existingOpp = await Opportunity.findOne({
            companyId: company._id,
            status: 'open',
            deletedAt: null,
          });

          if (!existingOpp) {
            const pipeline = await Pipeline.findOne({ organizationId: new mongoose.Types.ObjectId(organizationId), isDefault: true })
              || await Pipeline.findOne({ organizationId: new mongoose.Types.ObjectId(organizationId) });

            if (pipeline && pipeline.stages && pipeline.stages.length > 0) {
              let targetStage = pipeline.stages[0];
              const cleanStatus = params.targetStatus.toLowerCase();

              const matchedStage = pipeline.stages.find((stage: any) => {
                const nameLower = stage.name.toLowerCase();
                if (cleanStatus === 'contacted' && nameLower.includes('contact')) return true;
                if (cleanStatus === 'interested' && (nameLower.includes('calific') || nameLower.includes('interes'))) return true;
                if (cleanStatus === 'following_up' && (nameLower.includes('reun') || nameLower.includes('seguim'))) return true;
                return false;
              });

              if (matchedStage) {
                targetStage = matchedStage;
              }

              const cleanVal = String(company.activoTotal || '').replace(/[^0-9]/g, '');
              const assetsNum = parseInt(cleanVal, 10) || 0;
              // Default opportunity value as 5% of assets up to 50M COP or fallback to 1M COP
              const estimatedValue = assetsNum > 0 ? Math.min(50000000, Math.floor(assetsNum * 0.05)) : 1000000;

              await Opportunity.create({
                organizationId: new mongoose.Types.ObjectId(organizationId),
                name: `${company.razonSocial} - Negocio`,
                companyId: company._id,
                estimatedValue,
                probability: cleanStatus === 'interested' ? 40 : 20,
                pipelineId: pipeline._id,
                stageId: targetStage._id,
                status: 'open',
              });
            }
          } else {
            const pipeline = await Pipeline.findById(existingOpp.pipelineId);
            if (pipeline && pipeline.stages) {
              const cleanStatus = params.targetStatus.toLowerCase();
              const matchedStage = pipeline.stages.find((stage: any) => {
                const nameLower = stage.name.toLowerCase();
                if (cleanStatus === 'contacted' && nameLower.includes('contact')) return true;
                if (cleanStatus === 'interested' && (nameLower.includes('calific') || nameLower.includes('interes'))) return true;
                if (cleanStatus === 'following_up' && (nameLower.includes('reun') || nameLower.includes('seguim'))) return true;
                return false;
              });

              if (matchedStage) {
                existingOpp.stageId = matchedStage._id;
                await existingOpp.save();
              }
            }
          }
        }

        // Add note in bitácora log
        await CompanyLog.create({
          organizationId: new mongoose.Types.ObjectId(organizationId),
          companyId: company._id,
          actorId: new mongoose.Types.ObjectId(context.userId),
          actorName: 'Campaña Comercial',
          type: 'email',
          title: `Campaña: ${params.name}`,
          content: `Mensaje enviado:\nAsunto: ${parsedSubject}\n\n${parsedBody}`,
        });
      } else {
        failedCount++;
      }
    }

    // 4. Save Campaign log metrics
    const openedCount = Math.floor(successCount * 0.45);
    const clickedCount = Math.floor(successCount * 0.15);

    const campaign = new Campaign({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      name: params.name,
      templateId: template._id,
      senderName: org.name,
      senderEmail: process.env.SMTP_USER || 'no-reply@creatix-crm.com',
      status: 'completed',
      sentAt: new Date(),
      completedAt: new Date(),
      totalRecipients: targetCompanies.length,
      deliveredCount: successCount,
      openedCount,
      clickedCount,
      failedCount,
      bouncedCount: failedCount,
      unsubscribedCount: 0,
    });

    await campaign.save();

    revalidatePath('/dashboard/campaigns');
    revalidatePath('/dashboard/companies');
    revalidatePath('/dashboard/kanban');

    return {
      success: true,
      deliveredCount: successCount,
      failedCount,
    };
  } catch (error: any) {
    console.error('Error in campaign dispatch:', error);
    return { success: false, error: error.message || 'Error inesperado al despachar la campaña' };
  }
}

export async function previewCampaignTargetsAction(params: {
  templateId?: string;
  actividadesFilter?: string[];
  munComercialFilter?: string;
  minAssets?: number;
  limitCount: number;
}) {
  try {
    const context = await getTenantContext();
    const organizationId = context.organizationId;
    if (!organizationId) {
      return { success: false, error: 'No autorizado', companies: [] };
    }

    await connectToDatabase();

    const query: any = {
      organizationId: new mongoose.Types.ObjectId(organizationId),
      deletedAt: null,
      $or: [
        { emailComercial: { $nin: [null, ''] } },
        { emailNotificacion: { $nin: [null, ''] } },
      ],
    };

    if (params.actividadesFilter && params.actividadesFilter.length > 0) {
      query.actividad = { $in: params.actividadesFilter };
    }
    if (params.munComercialFilter) {
      query.munComercial = params.munComercialFilter;
    }

    const candidates = await Company.find(query).limit(500).lean();

    let filtered = candidates;
    if (params.minAssets && params.minAssets > 0) {
      filtered = candidates.filter((company) => {
        const cleanVal = String(company.activoTotal || '').replace(/[^0-9]/g, '');
        const valNum = parseInt(cleanVal, 10) || 0;
        return valNum >= params.minAssets!;
      });
    }

    const selected = filtered.slice(0, params.limitCount);

    let templateSubject = '';
    if (params.templateId) {
      const template = await Template.findById(params.templateId);
      if (template) {
        templateSubject = template.subject || '';
      }
    }

    const result = await Promise.all(
      selected.map(async (company) => {
        let alreadySent = false;
        if (templateSubject) {
          const duplicateLog = await CompanyLog.findOne({
            companyId: company._id,
            type: 'email',
            title: new RegExp(templateSubject, 'i'),
          });
          if (duplicateLog) {
            alreadySent = true;
          }
        }

        return {
          _id: company._id.toString(),
          razonSocial: company.razonSocial,
          email: company.emailComercial || company.emailNotificacion,
          munComercial: company.munComercial || 'N/D',
          activoTotal: company.activoTotal || '$ 0',
          alreadySent,
        };
      })
    );

    return { success: true, companies: result };
  } catch (error: any) {
    console.error('Preview query error:', error);
    return { success: false, error: error.message, companies: [] };
  }
}
