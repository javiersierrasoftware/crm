import { Opportunity, OpportunityHistory } from '@/models/Opportunity';
import Pipeline from '@/models/Pipeline';
import { getTenantContext, assertRole } from '../permissions/tenant';
import { writeAuditLog } from '../audit/audit';
import { opportunitySchema } from '@/schemas/opportunity';
import mongoose from 'mongoose';

interface GetOpportunitiesParams {
  pipelineId?: string;
  assignedAgentId?: string;
  status?: 'open' | 'won' | 'lost';
  search?: string;
}

export async function getOpportunities(params: GetOpportunitiesParams) {
  const context = await getTenantContext();
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const query: Record<string, any> = {
    organizationId: new mongoose.Types.ObjectId(organizationId),
    deletedAt: null,
  };

  if (params.pipelineId) {
    query.pipelineId = new mongoose.Types.ObjectId(params.pipelineId);
  }
  if (params.assignedAgentId) {
    query.assignedAgentId = new mongoose.Types.ObjectId(params.assignedAgentId);
  }
  if (params.status) {
    query.status = params.status;
  }
  if (params.search) {
    query.name = new RegExp(params.search, 'i');
  }

  return await Opportunity.find(query)
    .populate('companyId', 'commercialName legalName')
    .populate('primaryContactId', 'firstName lastName email')
    .populate('assignedAgentId', 'name email')
    .sort({ updatedAt: -1 });
}

/**
 * Returns opportunities structured by stage, specifically tailored for the Kanban Board view.
 */
export async function getKanbanData(pipelineId: string) {
  const context = await getTenantContext();
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  // 1. Fetch Pipeline details to get stages
  const pipeline = await Pipeline.findOne({
    _id: pipelineId,
    organizationId: new mongoose.Types.ObjectId(organizationId),
  });

  if (!pipeline) {
    throw new Error('Pipeline no encontrado');
  }

  // 2. Fetch all opportunities in this pipeline
  const opportunities = await Opportunity.find({
    organizationId: new mongoose.Types.ObjectId(organizationId),
    pipelineId: new mongoose.Types.ObjectId(pipelineId),
    deletedAt: null,
  })
    .populate('companyId', 'commercialName legalName')
    .populate('primaryContactId', 'firstName lastName email')
    .populate('assignedAgentId', 'name email');

  // 3. Map opportunities into their respective stages
  const kanbanStages = pipeline.stages.map((stage) => {
    const stageOpps = opportunities.filter(
      (opp) => opp.stageId.toString() === stage._id.toString()
    );

    const totalValue = stageOpps.reduce((sum, opp) => sum + opp.estimatedValue, 0);
    // Weighted value = value * win probability
    const weightedValue = stageOpps.reduce(
      (sum, opp) => sum + opp.estimatedValue * (opp.probability / 100),
      0
    );

    return {
      stageId: stage._id.toString(),
      stageName: stage.name,
      stageKey: stage.key,
      winProbability: stage.winProbability,
      opportunities: stageOpps,
      summary: {
        count: stageOpps.length,
        totalValue,
        weightedValue,
      },
    };
  });

  return {
    pipelineName: pipeline.name,
    pipelineId: pipeline._id.toString(),
    stages: kanbanStages,
  };
}

export async function createOpportunity(data: any) {
  const context = await assertRole(['OWNER', 'ADMIN', 'SALES_MANAGER', 'SALES_AGENT']);
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const parsed = opportunitySchema.parse(data);

  // Validate that the stage exists in the pipeline
  const pipeline = await Pipeline.findOne({
    _id: parsed.pipelineId,
    organizationId: new mongoose.Types.ObjectId(organizationId),
  });

  if (!pipeline) {
    throw new Error('Embudo comercial no encontrado');
  }

  const stage = pipeline.stages.find((s) => s._id.toString() === parsed.stageId);
  if (!stage) {
    throw new Error('Etapa no encontrada en el embudo comercial seleccionado');
  }

  // Create opportunity
  const opp = new Opportunity({
    ...parsed,
    organizationId: new mongoose.Types.ObjectId(organizationId),
    companyId: new mongoose.Types.ObjectId(parsed.companyId),
    primaryContactId: parsed.primaryContactId
      ? new mongoose.Types.ObjectId(parsed.primaryContactId)
      : null,
    pipelineId: new mongoose.Types.ObjectId(parsed.pipelineId),
    stageId: new mongoose.Types.ObjectId(parsed.stageId),
    assignedAgentId: parsed.assignedAgentId
      ? new mongoose.Types.ObjectId(parsed.assignedAgentId)
      : null,
    expectedCloseDate: parsed.expectedCloseDate ? new Date(parsed.expectedCloseDate) : undefined,
  });

  const saved = await opp.save();

  // Initial history record
  await OpportunityHistory.create({
    opportunityId: saved._id,
    userId: new mongoose.Types.ObjectId(context.userId),
    field: 'status',
    newValue: 'creado',
  });

  // Audit Log
  await writeAuditLog({
    organizationId,
    userId: context.userId,
    userName: context.userName,
    action: 'create_opportunity',
    entityType: 'Opportunity',
    entityId: saved._id as mongoose.Types.ObjectId,
    details: { name: saved.name, estimatedValue: saved.estimatedValue },
  });

  return saved;
}

export async function updateOpportunity(id: string, data: any) {
  const context = await assertRole(['OWNER', 'ADMIN', 'SALES_MANAGER', 'SALES_AGENT']);
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const opp = await Opportunity.findOne({
    _id: id,
    organizationId: new mongoose.Types.ObjectId(organizationId),
    deletedAt: null,
  });

  if (!opp) {
    throw new Error('Negocio no encontrado');
  }

  const parsed = opportunitySchema.parse(data);

  // Validate pipeline and stage if updated
  if (parsed.pipelineId !== opp.pipelineId.toString() || parsed.stageId !== opp.stageId.toString()) {
    const pipeline = await Pipeline.findOne({
      _id: parsed.pipelineId,
      organizationId: new mongoose.Types.ObjectId(organizationId),
    });
    if (!pipeline) throw new Error('Embudo comercial no encontrado');
    const stage = pipeline.stages.find((s) => s._id.toString() === parsed.stageId);
    if (!stage) throw new Error('Etapa no encontrada en el embudo seleccionado');
  }

  const historyEntries = [];
  const actorId = new mongoose.Types.ObjectId(context.userId);

  // Record changes in history
  if (parsed.stageId !== opp.stageId.toString()) {
    historyEntries.push({
      opportunityId: opp._id,
      userId: actorId,
      field: 'stage',
      oldValue: opp.stageId.toString(),
      newValue: parsed.stageId,
    });
  }
  if (parsed.estimatedValue !== opp.estimatedValue) {
    historyEntries.push({
      opportunityId: opp._id,
      userId: actorId,
      field: 'value',
      oldValue: opp.estimatedValue.toString(),
      newValue: parsed.estimatedValue.toString(),
    });
  }
  if (parsed.status !== opp.status) {
    historyEntries.push({
      opportunityId: opp._id,
      userId: actorId,
      field: 'status',
      oldValue: opp.status,
      newValue: parsed.status,
    });
  }

  // Save history
  if (historyEntries.length > 0) {
    await OpportunityHistory.insertMany(historyEntries);
  }

  // Update fields
  Object.assign(opp, {
    ...parsed,
    companyId: new mongoose.Types.ObjectId(parsed.companyId),
    primaryContactId: parsed.primaryContactId
      ? new mongoose.Types.ObjectId(parsed.primaryContactId)
      : null,
    pipelineId: new mongoose.Types.ObjectId(parsed.pipelineId),
    stageId: new mongoose.Types.ObjectId(parsed.stageId),
    assignedAgentId: parsed.assignedAgentId
      ? new mongoose.Types.ObjectId(parsed.assignedAgentId)
      : null,
    expectedCloseDate: parsed.expectedCloseDate ? new Date(parsed.expectedCloseDate) : undefined,
  });

  const updated = await opp.save();

  // Audit Log
  await writeAuditLog({
    organizationId,
    userId: context.userId,
    userName: context.userName,
    action: 'update_opportunity',
    entityType: 'Opportunity',
    entityId: updated._id as mongoose.Types.ObjectId,
    details: { name: updated.name, status: updated.status },
  });

  return updated;
}

/**
 * Fast stage transition function specifically designed for Kanban Drag and Drop updates.
 */
export async function moveOpportunityStage(id: string, newStageId: string) {
  const context = await assertRole(['OWNER', 'ADMIN', 'SALES_MANAGER', 'SALES_AGENT']);
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const opp = await Opportunity.findOne({
    _id: id,
    organizationId: new mongoose.Types.ObjectId(organizationId),
    deletedAt: null,
  });

  if (!opp) {
    throw new Error('Negocio no encontrado');
  }

  if (opp.stageId.toString() === newStageId) {
    return opp;
  }

  // Verify that the new stage exists in the opportunity's pipeline
  const pipeline = await Pipeline.findOne({
    _id: opp.pipelineId,
    organizationId: new mongoose.Types.ObjectId(organizationId),
  });

  if (!pipeline) {
    throw new Error('Embudo comercial de la oportunidad no encontrado');
  }

  const stage = pipeline.stages.find((s) => s._id.toString() === newStageId);
  if (!stage) {
    throw new Error('La etapa destino no pertenece al embudo comercial');
  }

  const oldStageId = opp.stageId.toString();

  // If moved to "won" or "lost" stage, automatically toggle status
  let status = opp.status;
  if (stage.key === 'won') {
    status = 'won';
  } else if (stage.key === 'lost') {
    status = 'lost';
  } else {
    // If moved back from won/lost, restore to open
    status = 'open';
  }

  // Update properties
  opp.stageId = stage._id;
  opp.probability = stage.winProbability;
  opp.status = status;

  const saved = await opp.save();

  // Record history log
  await OpportunityHistory.create({
    opportunityId: opp._id,
    userId: new mongoose.Types.ObjectId(context.userId),
    field: 'stage',
    oldValue: oldStageId,
    newValue: newStageId,
  });

  if (status !== opp.status) {
    await OpportunityHistory.create({
      opportunityId: opp._id,
      userId: new mongoose.Types.ObjectId(context.userId),
      field: 'status',
      oldValue: opp.status,
      newValue: status,
    });
  }

  // Audit Log
  await writeAuditLog({
    organizationId,
    userId: context.userId,
    userName: context.userName,
    action: 'move_opportunity',
    entityType: 'Opportunity',
    entityId: saved._id as mongoose.Types.ObjectId,
    details: { name: saved.name, newStage: stage.name },
  });

  return saved;
}

export async function deleteOpportunity(id: string) {
  const context = await assertRole(['OWNER', 'ADMIN', 'SALES_MANAGER']);
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const opp = await Opportunity.findOne({
    _id: id,
    organizationId: new mongoose.Types.ObjectId(organizationId),
    deletedAt: null,
  });

  if (!opp) {
    throw new Error('Negocio no encontrado');
  }

  opp.deletedAt = new Date();
  await opp.save();

  // Audit Log
  await writeAuditLog({
    organizationId,
    userId: context.userId,
    userName: context.userName,
    action: 'delete_opportunity',
    entityType: 'Opportunity',
    entityId: opp._id as mongoose.Types.ObjectId,
    details: { name: opp.name },
  });
}
