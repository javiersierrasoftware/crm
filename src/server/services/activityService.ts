import Activity, { IActivity } from '@/models/Activity';
import Company from '@/models/Company';
import Contact from '@/models/Contact';
import { Opportunity } from '@/models/Opportunity';
import { getTenantContext, assertRole } from '../permissions/tenant';
import { writeAuditLog } from '../audit/audit';
import { activitySchema } from '@/schemas/activity';
import mongoose from 'mongoose';

interface GetActivitiesParams {
  startDate?: Date;
  endDate?: Date;
  assignedAgentId?: string;
  status?: 'pending' | 'completed' | 'cancelled';
  type?: string;
  priority?: 'low' | 'medium' | 'high';
  companyId?: string;
  contactId?: string;
  opportunityId?: string;
}

export async function getActivities(params: GetActivitiesParams): Promise<IActivity[]> {
  const context = await getTenantContext();
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const query: Record<string, any> = {
    organizationId: new mongoose.Types.ObjectId(organizationId),
  };

  // Date range filter
  if (params.startDate || params.endDate) {
    query.date = {};
    if (params.startDate) {
      query.date.$gte = params.startDate;
    }
    if (params.endDate) {
      query.date.$lte = params.endDate;
    }
  }

  // Value filters
  if (params.assignedAgentId) {
    query.assignedAgentId = new mongoose.Types.ObjectId(params.assignedAgentId);
  }
  if (params.status) {
    query.status = params.status;
  }
  if (params.type) {
    query.type = params.type;
  }
  if (params.priority) {
    query.priority = params.priority;
  }
  if (params.companyId) {
    query.companyId = new mongoose.Types.ObjectId(params.companyId);
  }
  if (params.contactId) {
    query.contactId = new mongoose.Types.ObjectId(params.contactId);
  }
  if (params.opportunityId) {
    query.opportunityId = new mongoose.Types.ObjectId(params.opportunityId);
  }

  return await Activity.find(query)
    .populate('companyId', 'commercialName legalName')
    .populate('contactId', 'firstName lastName email')
    .populate('opportunityId', 'name estimatedValue')
    .populate('assignedAgentId', 'name email')
    .sort({ date: 1, time: 1 });
}

export async function getActivityById(id: string): Promise<IActivity> {
  const context = await getTenantContext();
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const activity = await Activity.findOne({
    _id: id,
    organizationId: new mongoose.Types.ObjectId(organizationId),
  })
    .populate('companyId', 'commercialName legalName')
    .populate('contactId', 'firstName lastName email')
    .populate('opportunityId', 'name estimatedValue')
    .populate('assignedAgentId', 'name email');

  if (!activity) {
    throw new Error('Actividad/Tarea no encontrada o no pertenece a su organización');
  }

  return activity;
}

export async function createActivity(data: any): Promise<IActivity> {
  const context = await assertRole(['OWNER', 'ADMIN', 'SALES_MANAGER', 'SALES_AGENT']);
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const parsed = activitySchema.parse(data);

  // Validate relationships to prevent Cross-Tenant references
  const orgObjId = new mongoose.Types.ObjectId(organizationId);

  if (parsed.companyId) {
    const comp = await Company.findOne({ _id: parsed.companyId, organizationId: orgObjId, deletedAt: null });
    if (!comp) throw new Error('Empresa relacionada no válida para su organización');
  }

  if (parsed.contactId) {
    const cont = await Contact.findOne({ _id: parsed.contactId, organizationId: orgObjId, deletedAt: null });
    if (!cont) throw new Error('Contacto relacionado no válido para su organización');
  }

  if (parsed.opportunityId) {
    const opp = await Opportunity.findOne({ _id: parsed.opportunityId, organizationId: orgObjId, deletedAt: null });
    if (!opp) throw new Error('Negocio relacionado no válido para su organización');
  }

  // Create document
  const activity = new Activity({
    ...parsed,
    organizationId: orgObjId,
    date: new Date(parsed.date),
    companyId: parsed.companyId ? new mongoose.Types.ObjectId(parsed.companyId) : null,
    contactId: parsed.contactId ? new mongoose.Types.ObjectId(parsed.contactId) : null,
    opportunityId: parsed.opportunityId ? new mongoose.Types.ObjectId(parsed.opportunityId) : null,
    assignedAgentId: parsed.assignedAgentId ? new mongoose.Types.ObjectId(parsed.assignedAgentId) : null,
  });

  const saved = await activity.save();

  // Audit Log
  await writeAuditLog({
    organizationId,
    userId: context.userId,
    userName: context.userName,
    action: 'create_activity',
    entityType: 'Activity',
    entityId: saved._id as mongoose.Types.ObjectId,
    details: { title: saved.title, type: saved.type },
  });

  return saved;
}

export async function updateActivity(id: string, data: any): Promise<IActivity> {
  const context = await assertRole(['OWNER', 'ADMIN', 'SALES_MANAGER', 'SALES_AGENT']);
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const activity = await Activity.findOne({
    _id: id,
    organizationId: new mongoose.Types.ObjectId(organizationId),
  });

  if (!activity) {
    throw new Error('Actividad/Tarea no encontrada o no pertenece a su organización');
  }

  const parsed = activitySchema.parse(data);

  // Validate relationships
  const orgObjId = new mongoose.Types.ObjectId(organizationId);

  if (parsed.companyId) {
    const comp = await Company.findOne({ _id: parsed.companyId, organizationId: orgObjId, deletedAt: null });
    if (!comp) throw new Error('Empresa relacionada no válida para su organización');
  }

  if (parsed.contactId) {
    const cont = await Contact.findOne({ _id: parsed.contactId, organizationId: orgObjId, deletedAt: null });
    if (!cont) throw new Error('Contacto relacionado no válido para su organización');
  }

  if (parsed.opportunityId) {
    const opp = await Opportunity.findOne({ _id: parsed.opportunityId, organizationId: orgObjId, deletedAt: null });
    if (!opp) throw new Error('Negocio relacionado no válido para su organización');
  }

  // Update fields
  Object.assign(activity, {
    ...parsed,
    date: new Date(parsed.date),
    companyId: parsed.companyId ? new mongoose.Types.ObjectId(parsed.companyId) : null,
    contactId: parsed.contactId ? new mongoose.Types.ObjectId(parsed.contactId) : null,
    opportunityId: parsed.opportunityId ? new mongoose.Types.ObjectId(parsed.opportunityId) : null,
    assignedAgentId: parsed.assignedAgentId ? new mongoose.Types.ObjectId(parsed.assignedAgentId) : null,
  });

  const updated = await activity.save();

  // Audit Log
  await writeAuditLog({
    organizationId,
    userId: context.userId,
    userName: context.userName,
    action: 'update_activity',
    entityType: 'Activity',
    entityId: updated._id as mongoose.Types.ObjectId,
    details: { title: updated.title, status: updated.status },
  });

  return updated;
}

/**
 * Fast-transition function to mark activities as completed.
 */
export async function completeActivity(id: string, result?: string): Promise<IActivity> {
  const context = await assertRole(['OWNER', 'ADMIN', 'SALES_MANAGER', 'SALES_AGENT']);
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const activity = await Activity.findOne({
    _id: id,
    organizationId: new mongoose.Types.ObjectId(organizationId),
  });

  if (!activity) {
    throw new Error('Actividad/Tarea no encontrada o no pertenece a su organización');
  }

  activity.status = 'completed';
  if (result !== undefined) {
    activity.result = result;
  }

  const updated = await activity.save();

  // Audit Log
  await writeAuditLog({
    organizationId,
    userId: context.userId,
    userName: context.userName,
    action: 'complete_activity',
    entityType: 'Activity',
    entityId: updated._id as mongoose.Types.ObjectId,
    details: { title: updated.title },
  });

  return updated;
}

export async function deleteActivity(id: string): Promise<void> {
  const context = await assertRole(['OWNER', 'ADMIN', 'SALES_MANAGER']);
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const activity = await Activity.findOne({
    _id: id,
    organizationId: new mongoose.Types.ObjectId(organizationId),
  });

  if (!activity) {
    throw new Error('Actividad/Tarea no encontrada o no pertenece a su organización');
  }

  await Activity.deleteOne({ _id: id });

  // Audit Log
  await writeAuditLog({
    organizationId,
    userId: context.userId,
    userName: context.userName,
    action: 'delete_activity',
    entityType: 'Activity',
    entityId: activity._id as mongoose.Types.ObjectId,
    details: { title: activity.title },
  });
}
