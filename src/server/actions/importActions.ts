'use server';

import { connectToDatabase } from '../database/mongodb';
import { getTenantContext } from '../permissions/tenant';
import { createImportJob } from '../services/importService';
import { ImportJob } from '@/models/ImportJob';
import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';

interface TriggerImportParams {
  fileName: string;
  mapping: Record<string, string>;
  duplicateStrategy: 'skip' | 'update' | 'create_new';
  rawCsvData: string;
}

export async function triggerImportJob(params: TriggerImportParams) {
  try {
    const context = await getTenantContext();
    const organizationId = context.organizationId;

    if (!organizationId) {
      return { success: false, error: 'No se encuentra en un contexto de organización activo' };
    }

    await connectToDatabase();

    const job = await createImportJob(
      {
        fileName: params.fileName,
        mapping: params.mapping,
        duplicateStrategy: params.duplicateStrategy,
        dataSource: 'Importación Web',
      },
      params.rawCsvData
    );

    revalidatePath('/dashboard/import');
    return { success: true, jobId: job._id.toString() };
  } catch (err: any) {
    console.error('Error triggering import job action:', err);
    return { success: false, error: err.message || 'Error inesperado al iniciar importación' };
  }
}

export async function getImportJobs() {
  try {
    const context = await getTenantContext();
    const organizationId = context.organizationId;

    if (!organizationId) {
      return [];
    }

    await connectToDatabase();

    const jobs = await ImportJob.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
    }).sort({ createdAt: -1 });

    return JSON.parse(JSON.stringify(jobs)); // Serialize Mongo Documents
  } catch {
    return [];
  }
}
