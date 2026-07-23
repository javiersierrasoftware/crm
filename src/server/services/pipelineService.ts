import Pipeline, { IPipeline } from '@/models/Pipeline';
import { getTenantContext, assertRole } from '../permissions/tenant';
import mongoose from 'mongoose';

/**
 * Gets or initializes the default Pipeline for the active organization.
 */
export async function getOrCreateDefaultPipeline(orgId?: string): Promise<IPipeline> {
  let finalOrgId = orgId;
  if (!finalOrgId) {
    const context = await getTenantContext();
    if (!context.organizationId) {
      throw new Error('Tenant organization ID is missing in context');
    }
    finalOrgId = context.organizationId;
  }

  const existing = await Pipeline.findOne({
    organizationId: new mongoose.Types.ObjectId(finalOrgId),
    isDefault: true,
  });

  if (existing) {
    return existing;
  }

  // Define default sales stages
  const defaultStages = [
    { name: 'Nuevo prospecto', key: 'new', order: 0, winProbability: 10 },
    { name: 'Contactado', key: 'contacted', order: 1, winProbability: 20 },
    { name: 'Calificado', key: 'qualified', order: 2, winProbability: 40 },
    { name: 'Reunión programada', key: 'meeting', order: 3, winProbability: 60 },
    { name: 'Propuesta enviada', key: 'proposal', order: 4, winProbability: 80 },
    { name: 'Negociación', key: 'negotiating', order: 5, winProbability: 90 },
    { name: 'Ganada', key: 'won', order: 6, winProbability: 100 },
    { name: 'Perdida', key: 'lost', order: 7, winProbability: 0 },
  ].map((s) => ({
    _id: new mongoose.Types.ObjectId(),
    ...s,
  }));

  const pipeline = new Pipeline({
    organizationId: new mongoose.Types.ObjectId(finalOrgId),
    name: 'Embudo de Ventas Principal',
    isDefault: true,
    stages: defaultStages,
  });

  return await pipeline.save();
}

/**
 * Returns all pipelines for the organization.
 */
export async function getPipelines(): Promise<IPipeline[]> {
  const context = await getTenantContext();
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  // Ensure default pipeline exists
  await getOrCreateDefaultPipeline(organizationId);

  return await Pipeline.find({
    organizationId: new mongoose.Types.ObjectId(organizationId),
  }).sort({ createdAt: 1 });
}

/**
 * Updates a pipeline's stages, including adding, removing, or reordering.
 */
export async function updatePipelineStages(id: string, name: string, stages: any[]): Promise<IPipeline> {
  const context = await assertRole(['OWNER', 'ADMIN']);
  const organizationId = context.organizationId;

  if (!organizationId) {
    throw new Error('Tenant organization ID is missing in context');
  }

  const pipeline = await Pipeline.findOne({
    _id: id,
    organizationId: new mongoose.Types.ObjectId(organizationId),
  });

  if (!pipeline) {
    throw new Error('Embudo comercial no encontrado');
  }

  pipeline.name = name;

  // Re-map and re-order incoming stages
  pipeline.stages = stages.map((s, idx) => ({
    _id: s._id ? new mongoose.Types.ObjectId(s._id) : new mongoose.Types.ObjectId(),
    name: s.name,
    key: s.key || `stage_${idx}`,
    order: idx,
    winProbability: Number(s.winProbability) || 50,
  }));

  return await pipeline.save();
}
