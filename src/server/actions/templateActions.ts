'use server';

import { connectToDatabase } from '../database/mongodb';
import { getTenantContext } from '../permissions/tenant';
import Template from '@/models/Template';
import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';

export async function createTemplate(data: { name: string; type: 'email' | 'whatsapp'; subject?: string; body: string }) {
  try {
    const context = await getTenantContext();
    const organizationId = context.organizationId;

    if (!organizationId) {
      return { success: false, error: 'No se encuentra en un contexto de organización activo' };
    }

    if (!data.name || !data.type || !data.body) {
      return { success: false, error: 'Por favor complete todos los campos obligatorios' };
    }

    await connectToDatabase();

    const template = new Template({
      ...data,
      organizationId: new mongoose.Types.ObjectId(organizationId),
    });

    await template.save();

    revalidatePath('/dashboard/templates');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error al guardar la plantilla' };
  }
}

export async function getTemplates(type?: 'email' | 'whatsapp') {
  try {
    const context = await getTenantContext();
    const organizationId = context.organizationId;

    if (!organizationId) {
      return [];
    }

    await connectToDatabase();

    const query: Record<string, any> = {
      organizationId: new mongoose.Types.ObjectId(organizationId),
    };

    if (type) {
      query.type = type;
    }

    const templates = await Template.find(query).sort({ createdAt: -1 });
    return JSON.parse(JSON.stringify(templates));
  } catch {
    return [];
  }
}

export async function deleteTemplate(id: string) {
  try {
    const context = await getTenantContext();
    const organizationId = context.organizationId;

    if (!organizationId) {
      return { success: false, error: 'No se encuentra en un contexto de organización activo' };
    }

    await connectToDatabase();

    await Template.deleteOne({
      _id: new mongoose.Types.ObjectId(id),
      organizationId: new mongoose.Types.ObjectId(organizationId),
    });

    revalidatePath('/dashboard/templates');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error al eliminar la plantilla' };
  }
}
