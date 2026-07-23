'use server';

import { connectToDatabase } from '../database/mongodb';
import { getTenantContext } from '../permissions/tenant';
import Activity from '@/models/Activity';
import { writeAuditLog } from '../audit/audit';
import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';

interface CreateActivityParams {
  title: string;
  description?: string;
  type: 'call' | 'meeting' | 'task' | 'note';
  date: string; // YYYY-MM-DD
  time?: string;
  duration?: number;
  priority: 'low' | 'medium' | 'high';
}

export async function createActivity(data: CreateActivityParams) {
  try {
    const context = await getTenantContext();
    const organizationId = context.organizationId;
    const userId = context.userId;

    if (!organizationId) {
      return { success: false, error: 'No se encuentra en un contexto de organización activo' };
    }

    await connectToDatabase();

    const activity = new Activity({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      title: data.title,
      description: data.description || '',
      type: data.type,
      date: new Date(data.date),
      time: data.time || '',
      duration: data.duration || 0,
      priority: data.priority,
      status: 'pending',
      assignedAgentId: new mongoose.Types.ObjectId(userId),
    });

    const saved = await activity.save();

    await writeAuditLog({
      organizationId,
      userId,
      userName: context.userName,
      action: 'create_activity',
      entityType: 'Activity',
      entityId: saved._id as mongoose.Types.ObjectId,
      details: { title: saved.title, type: saved.type },
    });

    revalidatePath('/dashboard/activities');
    return { success: true };
  } catch (err: any) {
    console.error('Error creating activity action:', err);
    return { success: false, error: err.message || 'Error inesperado al registrar actividad' };
  }
}

export async function completeActivity(activityId: string, resultMessage?: string) {
  try {
    const context = await getTenantContext();
    const organizationId = context.organizationId;

    if (!organizationId) {
      return { success: false, error: 'No se encuentra en un contexto de organización activo' };
    }

    await connectToDatabase();

    const activity = await Activity.findOne({
      _id: activityId,
      organizationId: new mongoose.Types.ObjectId(organizationId),
    });

    if (!activity) {
      return { success: false, error: 'Actividad no encontrada' };
    }

    activity.status = 'completed';
    activity.result = resultMessage || 'Completada por el usuario';
    await activity.save();

    await writeAuditLog({
      organizationId,
      userId: context.userId,
      userName: context.userName,
      action: 'complete_activity',
      entityType: 'Activity',
      entityId: activity._id as mongoose.Types.ObjectId,
      details: { title: activity.title, result: activity.result },
    });

    revalidatePath('/dashboard/activities');
    return { success: true };
  } catch (err: any) {
    console.error('Error completing activity action:', err);
    return { success: false, error: err.message || 'Error inesperado al completar la actividad' };
  }
}
