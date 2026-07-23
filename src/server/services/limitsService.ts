import Subscription from '@/models/Subscription';
import Plan from '@/models/Plan';
import OrganizationMember from '@/models/OrganizationMember';
import Company from '@/models/Company';
import Contact from '@/models/Contact';
import { Automation } from '@/models/Automation';
import Notification from '@/models/Notification';
import mongoose from 'mongoose';

export type LimitType = 'users' | 'companies' | 'contacts' | 'emails' | 'automations';

interface LimitStatus {
  allowed: boolean;
  limit: number;
  current: number;
  percentage: number;
}

/**
 * Calculates current consumption for a specific limit type against the active subscription limits.
 */
export async function getTenantLimitStatus(
  organizationId: string,
  type: LimitType
): Promise<LimitStatus> {
  const orgObjId = new mongoose.Types.ObjectId(organizationId);

  // 1. Fetch Subscription details
  const sub = await Subscription.findOne({
    organizationId: orgObjId,
    status: 'active',
  });

  if (!sub) {
    // If no active subscription, default to strict limits (free plan fallback)
    return { allowed: false, limit: 0, current: 0, percentage: 0 };
  }

  // 2. Fetch Plan limits
  const plan = await Plan.findById(sub.planId);
  if (!plan) {
    return { allowed: false, limit: 0, current: 0, percentage: 0 };
  }

  let limit = 0;
  let current = 0;

  // 3. Resolve active count based on target type
  switch (type) {
    case 'users':
      limit = plan.maxUsers;
      current = await OrganizationMember.countDocuments({ organizationId: orgObjId, status: 'active' });
      break;
    case 'companies':
      limit = plan.maxCompanies;
      current = await Company.countDocuments({ organizationId: orgObjId, deletedAt: null });
      break;
    case 'contacts':
      limit = plan.maxContacts;
      current = await Contact.countDocuments({ organizationId: orgObjId, deletedAt: null });
      break;
    case 'emails':
      limit = plan.maxEmailsPerMonth;
      current = sub.emailsSentThisPeriod;
      break;
    case 'automations':
      limit = plan.maxAutomations;
      current = await Automation.countDocuments({ organizationId: orgObjId, status: 'active' });
      break;
  }

  const percentage = limit > 0 ? (current / limit) * 100 : 0;
  const allowed = current < limit;

  return {
    allowed,
    limit,
    current,
    percentage,
  };
}

/**
 * Checks limits and issues alerts at 80%, 90%, and 100% usage thresholds.
 */
export async function checkAndNotifyTenantLimits(organizationId: string, type: LimitType): Promise<boolean> {
  try {
    const status = await getTenantLimitStatus(organizationId, type);
    const percentage = status.percentage;

    let alertThreshold: 80 | 90 | 100 | null = null;
    let typeLabel = '';

    switch (type) {
      case 'users': typeLabel = 'usuarios'; break;
      case 'companies': typeLabel = 'empresas registradas'; break;
      case 'contacts': typeLabel = 'contactos registrados'; break;
      case 'emails': typeLabel = 'correos mensuales enviados'; break;
      case 'automations': typeLabel = 'automatizaciones activas'; break;
    }

    if (percentage >= 100) {
      alertThreshold = 100;
    } else if (percentage >= 90) {
      alertThreshold = 90;
    } else if (percentage >= 80) {
      alertThreshold = 80;
    }

    if (alertThreshold !== null) {
      const orgObjId = new mongoose.Types.ObjectId(organizationId);

      // Check if alert was already created in the current month to prevent duplicate notifications
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const existingNotification = await Notification.findOne({
        organizationId: orgObjId,
        type: alertThreshold === 100 ? 'error' : 'warning',
        title: new RegExp(`Límite de ${typeLabel} al ${alertThreshold}%`, 'i'),
        createdAt: { $gte: startOfMonth },
      });

      if (!existingNotification) {
        // Fetch organization owners and admins to alert
        const admins = await OrganizationMember.find({
          organizationId: orgObjId,
          role: { $in: ['OWNER', 'ADMIN'] },
          status: 'active',
        });

        const notifyPromises = admins.map((admin) => {
          return Notification.create({
            organizationId: orgObjId,
            userId: admin.userId,
            title: `Límite de ${typeLabel} al ${alertThreshold}%`,
            message:
              alertThreshold === 100
                ? `Alerta crítica: Su organización ha alcanzado el 100% de su límite de ${typeLabel} (${status.current}/${status.limit}). Se han suspendido temporalmente las operaciones relacionadas.`
                : `Aviso: Su organización ha alcanzado el ${alertThreshold}% del límite de ${typeLabel} (${status.current}/${status.limit}). Considere subir de plan para evitar interrupciones.`,
            type: alertThreshold === 100 ? 'error' : 'warning',
            isRead: false,
          });
        });

        await Promise.all(notifyPromises);
      }
    }

    return status.allowed;
  } catch (error) {
    console.error(`Limit evaluation failed for org ${organizationId}:`, error);
    return true; // Fallback to allow operation on checking crash
  }
}
