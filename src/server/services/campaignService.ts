import { Campaign, CampaignRecipient } from '@/models/Campaign';
import { resolveListContacts } from './listService';
import EmailTemplate from '@/models/EmailTemplate';
import Organization from '@/models/Organization';
import Subscription from '@/models/Subscription';
import Plan from '@/models/Plan';
import Unsubscribe from '@/models/Unsubscribe';
import { sendMail } from '../email/sender';
import { renderTemplate } from './templateService';
import { getTenantContext, assertRole } from '../permissions/tenant';
import { writeAuditLog } from '../audit/audit';
import { campaignSchema } from '@/schemas/campaign';
import mongoose from 'mongoose';

/**
 * Creates a new email campaign draft.
 */
export async function createCampaign(data: any) {
  const context = await assertRole(['OWNER', 'ADMIN', 'MARKETING']);
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const parsed = campaignSchema.parse(data);

  const campaign = new Campaign({
    ...parsed,
    organizationId: new mongoose.Types.ObjectId(organizationId),
    templateId: new mongoose.Types.ObjectId(parsed.templateId),
    listId: new mongoose.Types.ObjectId(parsed.listId),
    scheduledAt: parsed.scheduledAt ? new Date(parsed.scheduledAt) : undefined,
    status: parsed.scheduledAt ? 'scheduled' : 'draft',
  });

  const saved = await campaign.save();

  // Audit Log
  await writeAuditLog({
    organizationId,
    userId: context.userId,
    userName: context.userName,
    action: 'create_campaign',
    entityType: 'Campaign',
    entityId: saved._id as mongoose.Types.ObjectId,
    details: { name: saved.name, status: saved.status },
  });

  return saved;
}

export async function getCampaigns() {
  const context = await getTenantContext();
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  return await Campaign.find({
    organizationId: new mongoose.Types.ObjectId(organizationId),
  }).sort({ createdAt: -1 });
}

export async function getCampaignById(id: string) {
  const context = await getTenantContext();
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const campaign = await Campaign.findOne({
    _id: id,
    organizationId: new mongoose.Types.ObjectId(organizationId),
  }).populate('templateId', 'name subject').populate('listId', 'name');

  if (!campaign) {
    throw new Error('Campaña no encontrada o no pertenece a su organización');
  }

  return campaign;
}

/**
 * Triggers campaign execution. Handles limits verification, contact suppressions,
 * recipient logging, and schedules the background loop.
 */
export async function executeCampaign(campaignId: string) {
  const context = await assertRole(['OWNER', 'ADMIN', 'MARKETING']);
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const campaign = await Campaign.findOne({
    _id: campaignId,
    organizationId: new mongoose.Types.ObjectId(organizationId),
  });

  if (!campaign) throw new Error('Campaña no encontrada');
  if (campaign.status === 'sending' || campaign.status === 'completed') {
    throw new Error('La campaña ya está enviándose o ya ha sido completada');
  }

  if (!campaign.listId) {
    throw new Error('La campaña no tiene una lista de destinatarios configurada');
  }

  // 1. Resolve target contacts
  const contacts = await resolveListContacts(campaign.listId.toString());

  // 2. Fetch email suppression list (unsubscribes, bounces, complaints)
  const suppressions = await Unsubscribe.find({
    organizationId: new mongoose.Types.ObjectId(organizationId),
  });
  const suppressedEmails = new Set(suppressions.map((s) => s.email.toLowerCase()));

  // 3. Exclude suppressed, unsubscribed, or consent-lacking contacts
  const validContacts = contacts.filter((contact) => {
    const email = contact.email.toLowerCase();
    // Exclude if email is suppressed or explicitly unsubscribed in Contact model
    if (suppressedEmails.has(email) || contact.subscriptionStatus !== 'subscribed') {
      return false;
    }
    // Consent compliance check: for marketing campaigns, require consent
    return contact.commercialConsent === true;
  });

  if (validContacts.length === 0) {
    campaign.status = 'failed';
    campaign.totalRecipients = 0;
    await campaign.save();
    throw new Error('No hay destinatarios válidos para esta campaña (revisa el consentimiento y las desuscripciones)');
  }

  // 4. Verify Plan limits (emails allowed this month)
  const sub = await Subscription.findOne({
    organizationId: new mongoose.Types.ObjectId(organizationId),
    status: 'active',
  });
  if (sub) {
    const plan = await Plan.findById(sub.planId);
    if (plan && sub.emailsSentThisPeriod + validContacts.length > plan.maxEmailsPerMonth) {
      campaign.status = 'failed';
      await campaign.save();
      throw new Error(
        `Límite de correos superado: Su plan permite ${plan.maxEmailsPerMonth} correos por período. Ha enviado ${sub.emailsSentThisPeriod} y esta campaña intenta enviar ${validContacts.length}.`
      );
    }
  }

  // 5. Build recipient database records
  const recipientsData = validContacts.map((contact) => ({
    organizationId: new mongoose.Types.ObjectId(organizationId),
    campaignId: campaign._id,
    contactId: contact._id,
    email: contact.email,
    status: 'pending',
  }));

  await CampaignRecipient.insertMany(recipientsData);

  campaign.status = 'sending';
  campaign.totalRecipients = validContacts.length;
  campaign.sentAt = new Date();
  await campaign.save();

  // Audit Log
  await writeAuditLog({
    organizationId,
    userId: context.userId,
    userName: context.userName,
    action: 'start_campaign_sending',
    entityType: 'Campaign',
    entityId: campaign._id as mongoose.Types.ObjectId,
    details: { name: campaign.name, recipients: validContacts.length },
  });

  // 6. Decouple dispatch loop
  setTimeout(() => {
    dispatchCampaignEmails(campaign._id.toString(), context.userId, context.userName);
  }, 10);

  return campaign;
}

/**
 * Background loop dispatcher that processes and delivers queued emails.
 */
export async function dispatchCampaignEmails(campaignId: string, actorId: string, actorName: string) {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign || campaign.status !== 'sending') return;

  const organizationId = campaign.organizationId.toString();
  const template = await EmailTemplate.findById(campaign.templateId);
  if (!template) {
    campaign.status = 'failed';
    await campaign.save();
    return;
  }

  const org = await Organization.findById(organizationId);
  const orgName = org?.name || 'CREATIX Client';

  const recipients = await CampaignRecipient.find({
    campaignId: campaign._id,
    status: 'pending',
  }).populate('contactId');

  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  let deliveredCount = 0;
  let failedCount = 0;

  for (const recipient of recipients) {
    const contact: any = recipient.contactId;
    if (!contact) {
      recipient.status = 'failed';
      recipient.error = 'Contacto no encontrado en la base de datos';
      await recipient.save();
      failedCount++;
      continue;
    }

    try {
      // 1. Prepare dynamic variables
      const unsubUrl = `${appUrl}/api/unsubscribe?email=${encodeURIComponent(
        recipient.email
      )}&org=${organizationId}&camp=${campaignId}`;

      const variables: Record<string, string> = {
        'contact.firstName': contact.firstName,
        'contact.lastName': contact.lastName,
        'contact.email': contact.email,
        'contact.position': contact.position || '',
        'company.name': contact.companyId?.commercialName || 'su empresa',
        'company.city': contact.companyId?.city || 'su localidad',
        'organization.name': orgName,
        'sender.name': campaign.senderName,
        'sender.email': campaign.senderEmail,
        unsubscribeUrl: unsubUrl,
      };

      // 2. Render content
      let htmlContent = renderTemplate(template.bodyHtml, variables);
      const textContent = renderTemplate(template.bodyText || '', variables);

      // 3. Inject Tracking pixel (open events)
      const openPixel = `<img src="${appUrl}/api/tracking/open?recipientId=${recipient._id}" width="1" height="1" style="display:none;" />`;
      htmlContent += openPixel;

      // 4. Inject Click redirects (click events)
      // Regex detects absolute URLs in href and redirects them through the tracking API
      htmlContent = htmlContent.replace(
        /href="((https?:\/\/[^"]+))"/gi,
        (match, url) => {
          // Skip tracking unsubscribe URLs
          if (url.includes('/api/unsubscribe')) {
            return match;
          }
          return `href="${appUrl}/api/tracking/click?recipientId=${
            recipient._id
          }&url=${encodeURIComponent(url)}"`;
        }
      );

      // 5. Dispatch email
      const result = await sendMail({
        to: recipient.email,
        subject: renderTemplate(campaign.name, variables), // Replace subject tags if any
        html: htmlContent,
        text: textContent,
        fromName: campaign.senderName,
        fromEmail: campaign.senderEmail,
        orgId: organizationId,
      });

      if (result.success) {
        recipient.status = 'sent';
        recipient.sentAt = new Date();
        deliveredCount++;

        // Increment monthly subscription emails count
        await Subscription.findOneAndUpdate(
          { organizationId: campaign.organizationId, status: 'active' },
          { $inc: { emailsSentThisPeriod: 1 } }
        );
      } else {
        recipient.status = 'failed';
        recipient.error = result.error || 'Error en pasarela de envío';
        failedCount++;
      }
    } catch (err: any) {
      recipient.status = 'failed';
      recipient.error = err.message || 'Error inesperado';
      failedCount++;
    }

    await recipient.save();

    // Periodically update counts
    await Campaign.findByIdAndUpdate(campaignId, {
      $inc: {
        deliveredCount: recipient.status === 'sent' ? 1 : 0,
        failedCount: recipient.status === 'failed' ? 1 : 0,
      },
    });
  }

  // Update final status
  campaign.status = 'completed';
  campaign.completedAt = new Date();
  await campaign.save();

  // Audit Log Completion
  await writeAuditLog({
    organizationId: campaign.organizationId,
    userId: actorId,
    userName: actorName,
    action: 'complete_campaign_sending',
    entityType: 'Campaign',
    entityId: campaign._id as mongoose.Types.ObjectId,
    details: {
      name: campaign.name,
      total: campaign.totalRecipients,
      delivered: deliveredCount,
      failed: failedCount,
    },
  });
}
