'use server';

import { connectToDatabase } from '../database/mongodb';
import { getTenantContext } from '../permissions/tenant';
import AuditLog from '@/models/AuditLog';
import mongoose from 'mongoose';

export async function getAuditLogsAction(page: number = 1, limit: number = 10) {
  try {
    const context = await getTenantContext();
    const organizationId = context.organizationId;

    if (!organizationId) {
      return { success: false, error: 'No autorizado', logs: [], total: 0 };
    }

    await connectToDatabase();

    const skip = (page - 1) * limit;

    const query = {
      organizationId: new mongoose.Types.ObjectId(organizationId),
    };

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(query),
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return {
      success: true,
      logs: JSON.parse(JSON.stringify(logs)),
      total,
    };
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener registros de auditoría',
      logs: [],
      total: 0,
    };
  }
}
