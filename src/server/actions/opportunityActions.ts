'use server';

import { connectToDatabase } from '../database/mongodb';
import { getTenantContext } from '../permissions/tenant';
import { Opportunity } from '@/models/Opportunity';
import Pipeline from '@/models/Pipeline';
import Company from '@/models/Company';
import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';

interface CreateOpportunityParams {
  name: string;
  companyId: string;
  estimatedValue: number;
  probability: number;
  stageId: string;
}

export async function createOpportunityAction(params: CreateOpportunityParams) {
  try {
    const context = await getTenantContext();
    const organizationId = context.organizationId;

    if (!organizationId) {
      return { success: false, error: 'No se encuentra en un contexto de organización activo' };
    }

    if (!params.name || !params.companyId || !params.stageId) {
      return { success: false, error: 'Por favor rellene todos los campos obligatorios' };
    }

    await connectToDatabase();

    // Find default pipeline for the organization
    const pipeline = await Pipeline.findOne({ organizationId: new mongoose.Types.ObjectId(organizationId), isDefault: true })
      || await Pipeline.findOne({ organizationId: new mongoose.Types.ObjectId(organizationId) });

    if (!pipeline) {
      return { success: false, error: 'No se encontró un embudo de ventas activo para su organización' };
    }

    const opportunity = new Opportunity({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      name: params.name,
      companyId: new mongoose.Types.ObjectId(params.companyId),
      estimatedValue: Number(params.estimatedValue) || 0,
      probability: Math.max(0, Math.min(100, Number(params.probability) || 50)),
      pipelineId: pipeline._id,
      stageId: new mongoose.Types.ObjectId(params.stageId),
      status: 'open',
    });

    await opportunity.save();

    revalidatePath('/dashboard/kanban');
    return { success: true };
  } catch (error: any) {
    console.error('Error creating opportunity:', error);
    return { success: false, error: error.message || 'Error inesperado al crear el negocio' };
  }
}

export async function updateOpportunityStageAction(opportunityId: string, newStageId: string) {
  try {
    const context = await getTenantContext();
    const organizationId = context.organizationId;

    if (!organizationId) {
      return { success: false, error: 'No autorizado' };
    }

    await connectToDatabase();

    const opportunity = await Opportunity.findOne({
      _id: new mongoose.Types.ObjectId(opportunityId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
    });

    if (!opportunity) {
      return { success: false, error: 'Negocio no encontrado' };
    }

    opportunity.stageId = new mongoose.Types.ObjectId(newStageId);
    await opportunity.save();

    revalidatePath('/dashboard/kanban');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating opportunity stage:', error);
    return { success: false, error: error.message || 'Error al mover el negocio' };
  }
}

export async function getCompaniesListAction() {
  try {
    const context = await getTenantContext();
    const organizationId = context.organizationId;

    if (!organizationId) return [];

    await connectToDatabase();

    const list = await Company.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      deletedAt: null,
    })
      .select('_id razonSocial')
      .sort({ razonSocial: 1 })
      .lean();

    return JSON.parse(JSON.stringify(list));
  } catch (err) {
    console.error('Error loading companies for select:', err);
    return [];
  }
}
