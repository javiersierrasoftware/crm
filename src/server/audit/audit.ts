import AuditLog from '@/models/AuditLog';
import { getTenantContext } from '../permissions/tenant';
import { headers } from 'next/headers';

import mongoose from 'mongoose';

interface AuditLogParams {
  action: string;
  entityType?: string;
  entityId?: string | mongoose.Types.ObjectId | null;
  details?: Record<string, any>;
  userId?: string;
  userName?: string;
  organizationId?: string | mongoose.Types.ObjectId | null;
}

/**
 * Centrally records audit events to the database.
 * Resolves user context and request metadata (IP, browser agent) automatically when possible.
 */
export async function writeAuditLog(params: AuditLogParams): Promise<void> {
  try {
    let { userId, userName, organizationId } = params;

    // Resolve context from session if not explicitly provided
    if (!userId) {
      try {
        const context = await getTenantContext();
        userId = context.userId;
        userName = context.userName;
        organizationId = context.organizationId;
      } catch {
        // Ignore auth failure; log might be triggered during anonymous/system events
      }
    }

    let userAgent: string | undefined;
    let ipAddress: string | undefined;

    try {
      const headerList = await headers();
      userAgent = headerList.get('user-agent') || undefined;
      ipAddress = headerList.get('x-forwarded-for')?.split(',')[0] || undefined;
    } catch {
      // Ignore if headers are not accessible (e.g. running in a raw CLI seed/job script)
    }

    await AuditLog.create({
      organizationId: organizationId || null,
      userId: userId || 'system',
      userName: userName || 'Sistema',
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    // Avoid crashing the request if audit logging fails, log error locally
    console.error('CRITICAL: Audit log persistence failed:', error);
  }
}
