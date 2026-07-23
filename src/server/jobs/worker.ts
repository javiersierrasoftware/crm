import { connectToDatabase } from '../database/mongodb';
import { Campaign } from '@/models/Campaign';
import mongoose from 'mongoose';
import { executeCampaign } from '../services/campaignService';
import { pollPausedExecutions } from '../services/automationService';

/**
 * Main execution worker routine.
 * Polls scheduled campaigns, checks automation wait timeouts, and executes background routines.
 */
export async function runBackgroundJobs(): Promise<{ success: boolean; campaignsProcessed: number }> {
  let campaignsProcessed = 0;

  try {
    await connectToDatabase();

    // 1. Process scheduled email campaigns
    const scheduledCampaigns = await Campaign.find({
      status: 'scheduled',
      scheduledAt: { $lte: new Date() },
    });

    for (const campaign of scheduledCampaigns) {
      try {
        // Trigger execution (which runs decoupled in background)
        // Wait, executeCampaign requires a context of the user (e.g. assertRole).
        // Since this runs inside a system background cron context, let's make sure it handles
        // system dispatches without needing an active HTTP browser session!
        // To support this, we will write a system-level dispatch function in campaignService
        // or bypass assertRole. In our executeCampaign, we did:
        // const context = await assertRole(...) which expects an auth session!
        // Ah! That is a very important detail. If the cron runner calls executeCampaign, it will fail
        // because there is no authenticated request context!
        // Let's create a separate bypass function `dispatchCampaignSystem(id)` in campaignService
        // or update campaignService to support system actor dispatches.
        // Let's check: We can create `executeCampaignSystem(campaignId)` that performs the dispatch
        // without requesting assertRole. Let's do that!
        
        // For now, let's call the system dispatcher which bypasses assertRole checks
        await executeCampaignSystem(campaign._id.toString());
        campaignsProcessed++;
      } catch (err) {
        console.error(`Cron campaign execution failed for ${campaign._id}:`, err);
      }
    }

    // 2. Poll paused automation executions
    await pollPausedExecutions();

    return { success: true, campaignsProcessed };
  } catch (error) {
    console.error('Background jobs worker execution crashed:', error);
    return { success: false, campaignsProcessed };
  }
}

/**
 * System-level campaign dispatch that bypasses user context checks (invoked by background workers).
 */
async function executeCampaignSystem(campaignId: string) {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign || !campaign.listId) return;
  if (campaign.status === 'sending' || campaign.status === 'completed') return;

  const contacts = await resolveListContactsSystem(campaign.listId.toString(), campaign.organizationId.toString());

  const suppressions = await Unsubscribe.find({ organizationId: campaign.organizationId });
  const suppressedEmails = new Set(suppressions.map((s) => s.email.toLowerCase()));

  const validContacts = contacts.filter((contact) => {
    const email = contact.email.toLowerCase();
    if (suppressedEmails.has(email) || contact.subscriptionStatus !== 'subscribed') {
      return false;
    }
    return contact.commercialConsent === true;
  });

  if (validContacts.length === 0) {
    campaign.status = 'failed';
    await campaign.save();
    return;
  }

  // Double check plan limit
  const sub = await Subscription.findOne({ organizationId: campaign.organizationId, status: 'active' });
  if (sub) {
    const plan = await Plan.findById(sub.planId);
    if (plan && sub.emailsSentThisPeriod + validContacts.length > plan.maxEmailsPerMonth) {
      campaign.status = 'failed';
      await campaign.save();
      return;
    }
  }

  const recipientsData = validContacts.map((contact) => ({
    organizationId: campaign.organizationId,
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

  // Trigger background dispatch
  // Trigger background dispatch
  // We use setTimeout to defer it so the worker can proceed immediately
  setTimeout(() => {
    const { dispatchCampaignEmails } = require('../services/campaignService');
    dispatchCampaignEmails(campaign._id.toString(), 'system', 'Cron Job');
  }, 10);
}

// Stubs to avoid compile issues, we will map them correctly
import Unsubscribe from '@/models/Unsubscribe';
import Subscription from '@/models/Subscription';
import Plan from '@/models/Plan';
import { CampaignRecipient } from '@/models/Campaign';
import Contact, { IContact } from '@/models/Contact';
import Company from '@/models/Company';

async function resolveListContactsSystem(listId: string, orgId: string): Promise<IContact[]> {
  const { List, ListMember } = require('@/models/List');
  const list = await List.findById(listId);
  if (!list) return [];

  const orgObjId = new mongoose.Types.ObjectId(orgId);

  if (list.type === 'static') {
    const members = await ListMember.find({ listId: list._id, organizationId: orgObjId });
    const contactIds = members.map((m: any) => m.contactId);
    return await Contact.find({ _id: { $in: contactIds }, deletedAt: null });
  }

  const rules = list.rules || [];
  if (rules.length === 0) return [];

  const conditions: any[] = [];
  for (const rule of rules) {
    let field = rule.field;
    const operator = rule.operator;
    const value = rule.value;
    let condition: Record<string, any> = {};

    if (field.startsWith('company.')) {
      const companyField = field.replace('company.', '');
      const companyQuery: Record<string, any> = { organizationId: orgObjId, deletedAt: null };
      if (operator === 'equals') companyQuery[companyField] = value;
      else if (operator === 'not_equals') companyQuery[companyField] = { $ne: value };
      else if (operator === 'contains') companyQuery[companyField] = new RegExp(value, 'i');
      else if (operator === 'in') companyQuery[companyField] = { $in: Array.isArray(value) ? value : [value] };
      else if (operator === 'not_in') companyQuery[companyField] = { $nin: Array.isArray(value) ? value : [value] };

      const matchingCompanies = await Company.find(companyQuery).select('_id');
      const companyIds = matchingCompanies.map((c) => c._id);
      condition = { companyId: { $in: companyIds } };
    } else {
      if (operator === 'equals') condition[field] = value;
      else if (operator === 'not_equals') condition[field] = { $ne: value };
      else if (operator === 'contains') condition[field] = new RegExp(value, 'i');
      else if (operator === 'in') condition[field] = { $in: Array.isArray(value) ? value : [value] };
      else if (operator === 'not_in') condition[field] = { $nin: Array.isArray(value) ? value : [value] };
      else if (operator === 'greater_than') condition[field] = { $gt: value };
      else if (operator === 'less_than') condition[field] = { $lt: value };
    }
    conditions.push(condition);
  }

  const combinedConditions = list.rulesOperator === 'OR' ? { $or: conditions } : { $and: conditions };
  return await Contact.find({ organizationId: orgObjId, deletedAt: null, ...combinedConditions });
}
